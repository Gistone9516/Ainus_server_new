/**
 * 커뮤니티 서비스
 * 게시글, 댓글, 좋아요, 북마크 등 커뮤니티 기능 제공
 * 명세서 요구사항에 따라 예외 처리 가이드 준수
 */

import { executeQuery, queryOne, executeModify, getDatabasePool } from '../database/mysql';
import { getRedisCache } from '../database/redis';
import {
  ValidationException,
  DatabaseException,
  AuthenticationException,
  LogicException,
  ExternalAPIException
} from '../exceptions';
import {
  Post,
  PostCategory,
  CreatePostRequest,
  UpdatePostRequest,
  PostListItem,
  PostDetail,
  GetPostsQuery,
  PaginationInfo,
  PostsListResponse,
  CreateCommentRequest,
  CommentResponse,
  SearchPostsQuery,
  SearchResponse,
  SearchResultItem
} from '../types';
import { sanitizeText, normalizeText, generatePreview } from '../utils/sanitize';
import { indexPost, updatePost, deletePost, searchPosts as elasticsearchSearch } from './ElasticsearchService';
import { Logger } from '../database/logger';

const logger = new Logger('CommunityService');

// 캐시 TTL (초)
const CACHE_TTL_FEED = 300; // 5분
const CACHE_TTL_POST = 600; // 10분
const CACHE_TTL_SEARCH = 180; // 3분

/**
 * 게시글 작성
 * 명세서 요구사항: XSS 필터링, content_preview 생성, Elasticsearch 비동기 인덱싱
 */
export async function createPost(
  userId: number,
  request: CreatePostRequest
): Promise<{ post_id: number; title: string; category: PostCategory; created_at: string }> {
  const methodName = 'createPost';

  // 1단계: 입력 검증
  try {
    if (!request.title || request.title.length < 5 || request.title.length > 200) {
      throw new ValidationException(
        '제목은 5자 이상 200자 이하여야 합니다',
        methodName
      );
    }

    if (!request.content || request.content.length < 10 || request.content.length > 5000) {
      throw new ValidationException(
        '본문은 10자 이상 5000자 이하여야 합니다',
        methodName
      );
    }

    const validCategories: PostCategory[] = ['prompt_tip', 'coding', 'tips'];
    if (!validCategories.includes(request.category)) {
      throw new ValidationException(
        '유효한 카테고리를 선택해주세요 (prompt_tip, coding, tips)',
        methodName
      );
    }
  } catch (error) {
    if (error instanceof ValidationException) throw error;
    throw new ValidationException(`입력 검증 실패: ${error}`, methodName);
  }

  // 2단계: 데이터 정규화 및 XSS 필터링
  let title: string;
  let content: string;
  let contentPreview: string;

  try {
    title = normalizeText(request.title);
    content = normalizeText(request.content);
    contentPreview = generatePreview(content, 150);
  } catch (error) {
    throw new ValidationException(`데이터 정규화 실패: ${error}`, methodName);
  }

  // 3단계: 게시글 저장 (Transaction)
  let postId: number;
  const pool = getDatabasePool();
  let connection = null;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 게시글 INSERT
      const [result] = await connection.execute(
        `INSERT INTO community_posts 
         (user_id, title, content, content_preview, category, is_active) 
         VALUES (?, ?, ?, ?, ?, TRUE)`,
        [userId, title, content, contentPreview, request.category]
      ) as any;

      postId = result.insertId;

      await connection.commit();

      logger.info(`Post created: post_id=${postId}, user_id=${userId}`);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  } catch (error: any) {
    throw new DatabaseException(
      `게시글 저장 실패: ${error.message}`,
      methodName
    );
  }

  // 4단계: Elasticsearch 비동기 인덱싱 (별도 큐)
  try {
    // 작성자 정보 조회
    const author = await queryOne<{ nickname: string }>(
      'SELECT nickname FROM users WHERE user_id = ?',
      [userId]
    );

    const authorName = author?.nickname || '';

    // 게시글 정보 조회
    const post = await queryOne<Post>(
      'SELECT * FROM community_posts WHERE post_id = ?',
      [postId]
    );

    if (post) {
      // 비동기 인덱싱 (에러가 발생해도 게시글 작성은 성공으로 처리)
      indexPost(post, authorName).catch(err => {
        logger.warn(`Elasticsearch indexing failed for post ${postId}: ${err.message}`);
      });
    }
  } catch (error) {
    // Elasticsearch 인덱싱 실패는 로그만 남기고 계속 진행
    logger.warn(`Elasticsearch indexing setup failed for post ${postId}: ${error}`);
  }

  // 5단계: 캐시 무효화
  try {
    const redis = getRedisCache();
    const keys = await redis.keys('post:feed:*');
    if (keys.length > 0) {
      await redis.deleteMany(keys);
    }
    // 카테고리별 캐시도 삭제
    const categoryKeys = await redis.keys(`post:feed:*:${request.category}*`);
    if (categoryKeys.length > 0) {
      await redis.deleteMany(categoryKeys);
    }
  } catch (error) {
    logger.warn('Cache invalidation failed', error);
  }

  const post = await queryOne<Post>(
    'SELECT * FROM community_posts WHERE post_id = ?',
    [postId]
  );

  return {
    post_id: postId,
    title: post!.title,
    category: post!.category,
    created_at: post!.created_at.toISOString()
  };
}

/**
 * 게시글 목록 조회 (피드)
 * 명세서 요구사항: 페이지네이션, 정렬, 캐싱
 */
export async function getPosts(
  userId: number | null,
  query: GetPostsQuery
): Promise<PostsListResponse> {
  const methodName = 'getPosts';

  const { page = 1, limit = 20, sort = 'latest', category } = query;

  // 페이지네이션 검증
  if (page < 1 || limit < 1 || limit > 50) {
    throw new ValidationException(
      '페이지 번호는 1 이상, 페이지 크기는 1~50 사이여야 합니다',
      methodName
    );
  }

  // 캐시 키 생성
  const cacheKey = `post:feed:${page}:${limit}:${sort}:${category || 'all'}`;

  try {
    const redis = getRedisCache();
    const cached = await redis.getJson<PostsListResponse>(cacheKey);

    if (cached) {
      logger.debug(`Cache hit for ${cacheKey}`);
      
      // 사용자가 로그인한 경우 is_liked, is_bookmarked 정보 추가
      if (userId) {
        const postIds = cached.posts.map(p => p.post_id);
        const likedMap = await getLikedPostsMap(userId, postIds);
        const bookmarkedMap = await getBookmarkedPostsMap(userId, postIds);

        cached.posts = cached.posts.map(post => ({
          ...post,
          is_liked: likedMap.get(post.post_id) || false,
          is_bookmarked: bookmarkedMap.get(post.post_id) || false
        }));
      }

      return cached;
    }
  } catch (error) {
    logger.warn('Cache read failed', error);
  }

  // 캐시 미스: DB 조회
  try {
    const offset = (page - 1) * limit;

    // 정렬 기준
    let orderBy = 'created_at DESC';
    if (sort === 'popular') {
      orderBy = 'likes_count DESC, comments_count DESC, created_at DESC';
    }

    // 카테고리 필터
    let categoryFilter = '';
    const params: any[] = [];
    if (category) {
      categoryFilter = 'AND category = ?';
      params.push(category);
    }

    // 전체 개수 조회
    const totalResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM community_posts WHERE is_active = TRUE ${categoryFilter}`,
      params
    );

    const total = totalResult?.count || 0;

    // 게시글 목록 조회 (작성자 정보 JOIN)
    let posts: any[];
    if (category) {
      if (sort === 'popular') {
        posts = await executeQuery<any>(
          `SELECT p.post_id, p.title, p.content_preview, p.category, p.likes_count, p.comments_count, p.views_count, p.created_at, u.user_id as author_id, u.nickname as author_username, u.profile_image_url as author_profile_image_url FROM community_posts p INNER JOIN users u ON p.user_id = u.user_id WHERE p.is_active = TRUE AND p.category = ? ORDER BY p.likes_count DESC, p.comments_count DESC, p.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
          [category]
        );
      } else {
        posts = await executeQuery<any>(
          `SELECT p.post_id, p.title, p.content_preview, p.category, p.likes_count, p.comments_count, p.views_count, p.created_at, u.user_id as author_id, u.nickname as author_username, u.profile_image_url as author_profile_image_url FROM community_posts p INNER JOIN users u ON p.user_id = u.user_id WHERE p.is_active = TRUE AND p.category = ? ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
          [category]
        );
      }
    } else {
      if (sort === 'popular') {
        posts = await executeQuery<any>(
          `SELECT p.post_id, p.title, p.content_preview, p.category, p.likes_count, p.comments_count, p.views_count, p.created_at, u.user_id as author_id, u.nickname as author_username, u.profile_image_url as author_profile_image_url FROM community_posts p INNER JOIN users u ON p.user_id = u.user_id WHERE p.is_active = TRUE ORDER BY p.likes_count DESC, p.comments_count DESC, p.created_at DESC LIMIT ${limit} OFFSET ${offset}`
        );
      } else {
        posts = await executeQuery<any>(
          `SELECT p.post_id, p.title, p.content_preview, p.category, p.likes_count, p.comments_count, p.views_count, p.created_at, u.user_id as author_id, u.nickname as author_username, u.profile_image_url as author_profile_image_url FROM community_posts p INNER JOIN users u ON p.user_id = u.user_id WHERE p.is_active = TRUE ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`
        );
      }
    }

    // 좋아요/북마크 정보 조회
    const postIds = posts.map((p: any) => p.post_id);
    const likedMap = userId ? await getLikedPostsMap(userId, postIds) : new Map();
    const bookmarkedMap = userId ? await getBookmarkedPostsMap(userId, postIds) : new Map();

    // 응답 형식 변환
    const postListItems: PostListItem[] = posts.map((p: any) => ({
      post_id: p.post_id,
      title: p.title,
      content_preview: p.content_preview,
      category: p.category,
      author: {
        user_id: p.author_id,
        username: p.author_username,
        profile_image_url: p.author_profile_image_url || undefined
      },
      stats: {
        likes_count: p.likes_count,
        comments_count: p.comments_count,
        views_count: p.views_count
      },
      created_at: p.created_at.toISOString(),
      is_liked: likedMap.get(p.post_id) || false,
      is_bookmarked: bookmarkedMap.get(p.post_id) || false
    }));

    const response: PostsListResponse = {
      posts: postListItems,
      pagination: {
        page,
        limit,
        total,
        has_next: offset + limit < total
      }
    };

    // 캐시 저장
    try {
      const redis = getRedisCache();
      await redis.setJson(cacheKey, response, CACHE_TTL_FEED);
    } catch (error) {
      logger.warn('Cache write failed', error);
    }

    return response;
  } catch (error: any) {
    throw new DatabaseException(
      `게시글 목록 조회 실패: ${error.message}`,
      methodName
    );
  }
}

/**
 * 게시글 상세 조회
 * 명세서 요구사항: 조회수 증가, 댓글 포함
 */
export async function getPostDetail(
  postId: number,
  userId: number | null
): Promise<PostDetail> {
  const methodName = 'getPostDetail';

  // 1단계: 게시글 조회
  const post = await queryOne<any>(
    `SELECT 
      p.*,
      u.user_id as author_id,
      u.nickname as author_username,
      u.profile_image_url as author_profile_image_url
     FROM community_posts p
     INNER JOIN users u ON p.user_id = u.user_id
     WHERE p.post_id = ? AND p.is_active = TRUE`,
    [postId]
  );

  if (!post) {
    throw new LogicException(
      `게시글을 찾을 수 없습니다 (post_id: ${postId})`,
      methodName,
      false
    );
  }

  // 2단계: 조회수 증가 (비동기로 처리 가능)
  try {
    await executeModify(
      'UPDATE community_posts SET views_count = views_count + 1 WHERE post_id = ?',
      [postId]
    );
  } catch (error) {
    logger.warn(`Failed to increment views_count for post ${postId}:`, error);
  }

  // 3단계: 좋아요/북마크 정보
  const isLiked = userId ? await isPostLiked(userId, postId) : false;
  const isBookmarked = userId ? await isPostBookmarked(userId, postId) : false;

  // 4단계: 댓글 조회 (최대 10개)
  const comments = await executeQuery<any>(
    `SELECT 
      c.comment_id,
      c.content,
      c.likes_count,
      c.created_at,
      u.user_id as author_id,
      u.nickname as author_username,
      u.profile_image_url as author_profile_image_url
     FROM community_comments c
     INNER JOIN users u ON c.user_id = u.user_id
     WHERE c.post_id = ? AND c.is_active = TRUE
     ORDER BY c.created_at DESC
     LIMIT 10`,
    [postId]
  );

  const commentResponses: CommentResponse[] = comments.map((c: any) => ({
    comment_id: c.comment_id,
    content: c.content,
    author: {
      user_id: c.author_id,
      username: c.author_username,
      profile_image_url: c.author_profile_image_url || undefined
    },
    likes_count: c.likes_count,
    created_at: c.created_at.toISOString(),
    is_liked: false // TODO: 댓글 좋아요 구현 시 추가
  }));

  return {
    post_id: post.post_id,
    title: post.title,
    content: post.content,
    content_preview: post.content_preview,
    category: post.category,
    author: {
      user_id: post.author_id,
      username: post.author_username,
      profile_image_url: post.author_profile_image_url || undefined
    },
    stats: {
      likes_count: post.likes_count + 1, // 증가된 조회수 반영 (실시간 반영 안 될 수 있음)
      comments_count: post.comments_count,
      views_count: post.views_count + 1
    },
    created_at: post.created_at.toISOString(),
    updated_at: post.updated_at.toISOString(),
    is_liked: isLiked,
    is_bookmarked: isBookmarked,
    comments: commentResponses
  };
}

/**
 * 게시글 수정
 */
export async function updatePostDetail(
  postId: number,
  userId: number,
  request: UpdatePostRequest
): Promise<PostDetail> {
  const methodName = 'updatePostDetail';

  // 1단계: 게시글 소유자 확인
  const post = await queryOne<Post>(
    'SELECT * FROM community_posts WHERE post_id = ? AND is_active = TRUE',
    [postId]
  );

  if (!post) {
    throw new LogicException(
      `게시글을 찾을 수 없습니다 (post_id: ${postId})`,
      methodName,
      false
    );
  }

  if (post.user_id !== userId) {
    throw new AuthenticationException(
      '게시글을 수정할 권한이 없습니다',
      methodName
    );
  }

  // 2단계: 입력 검증
  try {
    if (request.title !== undefined) {
      if (request.title.length < 5 || request.title.length > 200) {
        throw new ValidationException(
          '제목은 5자 이상 200자 이하여야 합니다',
          methodName
        );
      }
    }

    if (request.content !== undefined) {
      if (request.content.length < 10 || request.content.length > 5000) {
        throw new ValidationException(
          '본문은 10자 이상 5000자 이하여야 합니다',
          methodName
        );
      }
    }
  } catch (error) {
    if (error instanceof ValidationException) throw error;
    throw new ValidationException(`입력 검증 실패: ${error}`, methodName);
  }

  // 3단계: 데이터 정규화
  const updates: string[] = [];
  const params: any[] = [];

  if (request.title !== undefined) {
    updates.push('title = ?');
    params.push(normalizeText(request.title));
  }

  if (request.content !== undefined) {
    updates.push('content = ?');
    params.push(normalizeText(request.content));
    updates.push('content_preview = ?');
    params.push(generatePreview(request.content, 150));
  }

  if (request.category !== undefined) {
    updates.push('category = ?');
    params.push(request.category);
  }

  if (updates.length === 0) {
    // 수정할 내용이 없음
    return await getPostDetail(postId, userId);
  }

  // 4단계: 게시글 업데이트
  try {
    params.push(postId);
    await executeModify(
      `UPDATE community_posts SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE post_id = ?`,
      params
    );

    // Elasticsearch 업데이트
    const updatedPost = await queryOne<Post>(
      'SELECT * FROM community_posts WHERE post_id = ?',
      [postId]
    );

    if (updatedPost) {
      const author = await queryOne<{ nickname: string }>(
        'SELECT nickname FROM users WHERE user_id = ?',
        [userId]
      );

      updatePost(updatedPost, author?.nickname || '').catch(err => {
        logger.warn(`Elasticsearch update failed for post ${postId}: ${err.message}`);
      });
    }

    // 캐시 무효화
    const redis = getRedisCache();
    await redis.delete(`post:${postId}`);
    const keys = await redis.keys('post:feed:*');
    if (keys.length > 0) {
      await redis.deleteMany(keys);
    }

    return await getPostDetail(postId, userId);
  } catch (error: any) {
    throw new DatabaseException(
      `게시글 수정 실패: ${error.message}`,
      methodName
    );
  }
}

/**
 * 게시글 삭제
 */
export async function deletePostDetail(postId: number, userId: number): Promise<void> {
  const methodName = 'deletePostDetail';

  // 소유자 확인
  const post = await queryOne<Post>(
    'SELECT * FROM community_posts WHERE post_id = ? AND is_active = TRUE',
    [postId]
  );

  if (!post) {
    throw new LogicException(
      `게시글을 찾을 수 없습니다 (post_id: ${postId})`,
      methodName,
      false
    );
  }

  if (post.user_id !== userId) {
    throw new AuthenticationException(
      '게시글을 삭제할 권한이 없습니다',
      methodName
    );
  }

  // Soft delete
  try {
    await executeModify(
      'UPDATE community_posts SET is_active = FALSE WHERE post_id = ?',
      [postId]
    );

    // Elasticsearch에서 삭제
    deletePost(postId).catch(err => {
      logger.warn(`Elasticsearch deletion failed for post ${postId}: ${err.message}`);
    });

    // 캐시 무효화
    const redis = getRedisCache();
    await redis.delete(`post:${postId}`);
    const keys = await redis.keys('post:feed:*');
    if (keys.length > 0) {
      await redis.deleteMany(keys);
    }
  } catch (error: any) {
    throw new DatabaseException(
      `게시글 삭제 실패: ${error.message}`,
      methodName
    );
  }
}

/**
 * 게시글 좋아요 토글
 * 명세서 요구사항: 좋아요 추가/취소, likes_count 업데이트
 */
export async function togglePostLike(postId: number, userId: number): Promise<{
  is_liked: boolean;
  likes_count: number;
}> {
  const methodName = 'togglePostLike';

  // 게시글 존재 확인
  const post = await queryOne<Post>(
    'SELECT * FROM community_posts WHERE post_id = ? AND is_active = TRUE',
    [postId]
  );

  if (!post) {
    throw new LogicException(
      `게시글을 찾을 수 없습니다 (post_id: ${postId})`,
      methodName,
      false
    );
  }

  const pool = getDatabasePool();
  let connection = null;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 기존 좋아요 확인
      const existing = await queryOne<{ like_id: number }>(
        'SELECT like_id FROM community_post_likes WHERE post_id = ? AND user_id = ?',
        [postId, userId]
      );

      if (existing) {
        // 좋아요 취소
        await connection.execute(
          'DELETE FROM community_post_likes WHERE post_id = ? AND user_id = ?',
          [postId, userId]
        );
        await connection.execute(
          'UPDATE community_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE post_id = ?',
          [postId]
        );

        await connection.commit();

        const updatedPost = await queryOne<{ likes_count: number }>(
          'SELECT likes_count FROM community_posts WHERE post_id = ?',
          [postId]
        );

        // 캐시 업데이트
        const redis = getRedisCache();
        await redis.delete(`post:stats:${postId}`);

        return {
          is_liked: false,
          likes_count: updatedPost?.likes_count || 0
        };
      } else {
        // 좋아요 추가
        await connection.execute(
          'INSERT INTO community_post_likes (post_id, user_id) VALUES (?, ?)',
          [postId, userId]
        );
        await connection.execute(
          'UPDATE community_posts SET likes_count = likes_count + 1 WHERE post_id = ?',
          [postId]
        );

        await connection.commit();

        const updatedPost = await queryOne<{ likes_count: number }>(
          'SELECT likes_count FROM community_posts WHERE post_id = ?',
          [postId]
        );

        // 캐시 업데이트
        const redis = getRedisCache();
        await redis.delete(`post:stats:${postId}`);

        return {
          is_liked: true,
          likes_count: updatedPost?.likes_count || 0
        };
      }
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  } catch (error: any) {
    throw new DatabaseException(
      `좋아요 토글 실패: ${error.message}`,
      methodName
    );
  }
}

/**
 * 댓글 작성
 */
export async function createComment(
  postId: number,
  userId: number,
  request: CreateCommentRequest
): Promise<CommentResponse> {
  const methodName = 'createComment';

  // 입력 검증
  if (!request.content || request.content.length < 1 || request.content.length > 500) {
    throw new ValidationException(
      '댓글은 1자 이상 500자 이하여야 합니다',
      methodName
    );
  }

  // 게시글 존재 확인
  const post = await queryOne<Post>(
    'SELECT * FROM community_posts WHERE post_id = ? AND is_active = TRUE',
    [postId]
  );

  if (!post) {
    throw new LogicException(
      `게시글을 찾을 수 없습니다 (post_id: ${postId})`,
      methodName,
      false
    );
  }

  // 댓글 저장
  const pool = getDatabasePool();
  let connection = null;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const content = normalizeText(request.content);

      // 댓글 INSERT
      const [result] = await connection.execute(
        'INSERT INTO community_comments (post_id, user_id, content, is_active) VALUES (?, ?, ?, TRUE)',
        [postId, userId, content]
      ) as any;

      const commentId = result.insertId;

      // 댓글 수 증가
      await connection.execute(
        'UPDATE community_posts SET comments_count = comments_count + 1 WHERE post_id = ?',
        [postId]
      );

      await connection.commit();

      // 댓글 정보 조회
      const comment = await queryOne<any>(
        `SELECT 
          c.*,
          u.user_id as author_id,
          u.nickname as author_username,
          u.profile_image_url as author_profile_image_url
         FROM community_comments c
         INNER JOIN users u ON c.user_id = u.user_id
         WHERE c.comment_id = ?`,
        [commentId]
      );

      // 캐시 무효화
      const redis = getRedisCache();
      await redis.delete(`post:${postId}`);

      return {
        comment_id: comment!.comment_id,
        content: comment!.content,
        author: {
          user_id: comment!.author_id,
          username: comment!.author_username,
          profile_image_url: comment!.author_profile_image_url || undefined
        },
        likes_count: 0,
        created_at: comment!.created_at.toISOString()
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  } catch (error: any) {
    throw new DatabaseException(
      `댓글 작성 실패: ${error.message}`,
      methodName
    );
  }
}

/**
 * 검색
 * 명세서 요구사항: Elasticsearch 기반 전문 검색
 */
export async function searchPosts(
  userId: number | null,
  query: SearchPostsQuery
): Promise<SearchResponse> {
  const methodName = 'searchPosts';

  const { q, page = 1, limit = 20, category, sort = 'relevance' } = query;

  // 검색어 검증
  if (!q || q.trim().length < 2) {
    throw new ValidationException(
      '검색어는 최소 2자 이상이어야 합니다',
      methodName
    );
  }

  // 캐시 키
  const cacheKey = `search:${q}:${page}:${limit}:${category || 'all'}:${sort}`;

  try {
    const redis = getRedisCache();
    const cached = await redis.getJson<SearchResponse>(cacheKey);

    if (cached) {
      logger.debug(`Cache hit for search: ${cacheKey}`);
      
      // 사용자별 좋아요/북마크 정보 추가
      if (userId) {
        const postIds = cached.results.map(r => r.post_id);
        const likedMap = await getLikedPostsMap(userId, postIds);
        const bookmarkedMap = await getBookmarkedPostsMap(userId, postIds);

        cached.results = cached.results.map(result => ({
          ...result,
          is_liked: likedMap.get(result.post_id) || false,
          is_bookmarked: bookmarkedMap.get(result.post_id) || false
        }));
      }

      return cached;
    }
  } catch (error) {
    logger.warn('Search cache read failed', error);
  }

  // Elasticsearch 검색
  try {
    const searchResults = await elasticsearchSearch({
      query: q,
      category,
      page,
      limit,
      sort
    });

    // DB에서 상세 정보 조회
    const postIds = searchResults.results.map(r => r.post_id);

    if (postIds.length === 0) {
      return {
        query: q,
        results: [],
        pagination: {
          page,
          limit,
          total: 0,
          has_next: false
        }
      };
    }

    const posts = await executeQuery<any>(
      `SELECT 
        p.post_id,
        p.title,
        p.content_preview,
        p.category,
        p.likes_count,
        p.comments_count,
        p.views_count,
        p.created_at,
        u.user_id as author_id,
        u.nickname as author_username,
        u.profile_image_url as author_profile_image_url
       FROM community_posts p
       INNER JOIN users u ON p.user_id = u.user_id
       WHERE p.post_id IN (${postIds.map(() => '?').join(',')}) AND p.is_active = TRUE`,
      postIds
    );

    // 좋아요/북마크 정보
    const likedMap = userId ? await getLikedPostsMap(userId, postIds) : new Map();
    const bookmarkedMap = userId ? await getBookmarkedPostsMap(userId, postIds) : new Map();

    // Elasticsearch 결과와 매핑
    const resultMap = new Map(searchResults.results.map(r => [r.post_id, r]));

    const results: SearchResultItem[] = posts.map((p: any) => {
      const esResult = resultMap.get(p.post_id);

      return {
        post_id: p.post_id,
        title: p.title,
        content_preview: p.content_preview,
        category: p.category,
        author: {
          user_id: p.author_id,
          username: p.author_username,
          profile_image_url: p.author_profile_image_url || undefined
        },
        stats: {
          likes_count: p.likes_count,
          comments_count: p.comments_count,
          views_count: p.views_count
        },
        created_at: p.created_at.toISOString(),
        highlight: esResult?.highlight,
        is_liked: likedMap.get(p.post_id) || false,
        is_bookmarked: bookmarkedMap.get(p.post_id) || false
      };
    });

    const response: SearchResponse = {
      query: q,
      results,
      pagination: {
        page,
        limit,
        total: searchResults.total,
        has_next: (page - 1) * limit + results.length < searchResults.total
      }
    };

    // 캐시 저장
    try {
      const redis = getRedisCache();
      await redis.setJson(cacheKey, response, CACHE_TTL_SEARCH);
    } catch (error) {
      logger.warn('Search cache write failed', error);
    }

    return response;
  } catch (error: any) {
    throw new ExternalAPIException(
      `검색 실패: ${error.message}`,
      methodName
    );
  }
}

// ==================== Helper Functions ====================

/**
 * 좋아요 여부 확인
 */
async function isPostLiked(userId: number, postId: number): Promise<boolean> {
  const result = await queryOne<{ like_id: number }>(
    'SELECT like_id FROM community_post_likes WHERE post_id = ? AND user_id = ?',
    [postId, userId]
  );
  return !!result;
}

/**
 * 북마크 여부 확인
 */
async function isPostBookmarked(userId: number, postId: number): Promise<boolean> {
  const result = await queryOne<{ bookmark_id: number }>(
    'SELECT bookmark_id FROM community_post_bookmarks WHERE post_id = ? AND user_id = ?',
    [postId, userId]
  );
  return !!result;
}

/**
 * 여러 게시글의 좋아요 여부 맵 조회
 */
async function getLikedPostsMap(userId: number, postIds: number[]): Promise<Map<number, boolean>> {
  if (postIds.length === 0) return new Map();

  const likes = await executeQuery<{ post_id: number }>(
    `SELECT post_id FROM community_post_likes 
     WHERE user_id = ? AND post_id IN (${postIds.map(() => '?').join(',')})`,
    [userId, ...postIds]
  );

  const map = new Map<number, boolean>();
  postIds.forEach(id => map.set(id, false));
  likes.forEach(like => map.set(like.post_id, true));

  return map;
}

/**
 * 여러 게시글의 북마크 여부 맵 조회
 */
async function getBookmarkedPostsMap(userId: number, postIds: number[]): Promise<Map<number, boolean>> {
  if (postIds.length === 0) return new Map();

  const bookmarks = await executeQuery<{ post_id: number }>(
    `SELECT post_id FROM community_post_bookmarks 
     WHERE user_id = ? AND post_id IN (${postIds.map(() => '?').join(',')})`,
    [userId, ...postIds]
  );

  const map = new Map<number, boolean>();
  postIds.forEach(id => map.set(id, false));
  bookmarks.forEach(bookmark => map.set(bookmark.post_id, true));

  return map;
}
