/**
 * Elasticsearch 서비스
 * 게시글 검색 인덱싱 및 검색 기능 제공
 * 명세서 요구사항: 한글 형태소 분석 (Nori), 전문 검색
 */

import { Client } from '@elastic/elasticsearch';
import { getConfig } from '../config/environment';
import { Logger } from '../database/logger';
import { ExternalAPIException, DatabaseException } from '../exceptions';
import { Post, PostCategory, SortOption } from '../types';

const logger = new Logger('ElasticsearchService');

// 인덱스 이름
const INDEX_NAME = 'posts';

/**
 * Elasticsearch 클라이언트 초기화
 */
let client: Client | null = null;

function getElasticsearchClient(): Client | null {
  const config = getConfig();

  if (!config.elasticsearch.enabled) {
    logger.warn('Elasticsearch is disabled');
    return null;
  }

  if (!client) {
    try {
      const esConfig: any = {
        node: config.elasticsearch.node
      };

      if (config.elasticsearch.username && config.elasticsearch.password) {
        esConfig.auth = {
          username: config.elasticsearch.username,
          password: config.elasticsearch.password
        };
      }

      client = new Client(esConfig);

      // 연결 테스트
      client.ping().catch(err => {
        logger.error('Elasticsearch connection failed', err);
        client = null;
      });

      logger.info('Elasticsearch client initialized');
    } catch (error) {
      logger.error('Failed to initialize Elasticsearch client', error);
      return null;
    }
  }

  return client;
}

/**
 * 인덱스 생성 및 매핑 설정
 * 명세서 요구사항: 한글 형태소 분석기 (korean_analyzer)
 */
export async function createIndex(): Promise<void> {
  const methodName = 'createIndex';
  const esClient = getElasticsearchClient();

  if (!esClient) {
    logger.warn('Elasticsearch is not available, skipping index creation');
    return;
  }

  try {
    const exists = await esClient.indices.exists({ index: INDEX_NAME });

    if (exists) {
      logger.info(`Index "${INDEX_NAME}" already exists`);
      return;
    }

    // 인덱스 생성 (명세서 매핑 요구사항 반영)
    await esClient.indices.create({
      index: INDEX_NAME,
      body: {
        mappings: {
          properties: {
            id: { type: 'keyword' },
            title: {
              type: 'text',
              analyzer: 'korean_analyzer', // Nori Plugin 사용
              fields: { keyword: { type: 'keyword' } }
            },
            content: {
              type: 'text',
              analyzer: 'korean_analyzer'
            },
            category: { type: 'keyword' },
            author_id: { type: 'keyword' },
            author_name: { type: 'keyword' },
            likes_count: { type: 'integer' },
            comments_count: { type: 'integer' },
            created_at: { type: 'date' },
            is_active: { type: 'boolean' }
          }
        },
        settings: {
          analysis: {
            analyzer: {
              korean_analyzer: {
                type: 'nori', // 한글 형태소 분석기 (Nori Plugin 필요)
                decompound_mode: 'discard'
              }
            }
          }
        }
      }
    });

    logger.info(`Index "${INDEX_NAME}" created successfully`);
  } catch (error: any) {
    logger.error('Failed to create Elasticsearch index', error);
    
    // Nori Plugin이 없을 경우 기본 analyzer 사용
    if (error.message?.includes('nori') || error.message?.includes('analyzer')) {
      logger.warn('Nori analyzer not available, using standard analyzer');
      
      try {
        await esClient.indices.create({
          index: INDEX_NAME,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                title: {
                  type: 'text',
                  analyzer: 'standard',
                  fields: { keyword: { type: 'keyword' } }
                },
                content: {
                  type: 'text',
                  analyzer: 'standard'
                },
                category: { type: 'keyword' },
                author_id: { type: 'keyword' },
                author_name: { type: 'keyword' },
                likes_count: { type: 'integer' },
                comments_count: { type: 'integer' },
                created_at: { type: 'date' },
                is_active: { type: 'boolean' }
              }
            }
          }
        });
        logger.info(`Index "${INDEX_NAME}" created with standard analyzer`);
      } catch (retryError) {
        throw new ExternalAPIException(
          `Elasticsearch index creation failed: ${retryError}`,
          methodName
        );
      }
    } else {
      throw new ExternalAPIException(
        `Elasticsearch index creation failed: ${error.message}`,
        methodName
      );
    }
  }
}

/**
 * 게시글 인덱싱 (비동기)
 * 명세서 요구사항: ~500ms 지연 허용, 재시도 큐 지원
 */
export async function indexPost(post: Post, authorName: string): Promise<void> {
  const methodName = 'indexPost';
  const esClient = getElasticsearchClient();

  if (!esClient) {
    logger.warn('Elasticsearch is not available, skipping indexing');
    return;
  }

  try {
    await esClient.index({
      index: INDEX_NAME,
      id: post.post_id.toString(),
      body: {
        id: post.post_id.toString(),
        title: post.title,
        content: post.content,
        category: post.category,
        author_id: post.user_id.toString(),
        author_name: authorName,
        likes_count: post.likes_count,
        comments_count: post.comments_count,
        created_at: post.created_at,
        is_active: post.is_active
      },
      refresh: false // 비동기 처리 (성능 최적화)
    });

    logger.debug(`Post indexed: ${post.post_id}`);
  } catch (error: any) {
    logger.warn(`Elasticsearch indexing failed for post ${post.post_id}: ${error.message}`);
    // 재시도 큐에 추가할 수 있음 (명세서 요구사항)
    // 여기서는 로깅만 수행
    throw new ExternalAPIException(
      `Elasticsearch indexing failed: ${error.message}`,
      methodName
    );
  }
}

/**
 * 게시글 인덱스 업데이트
 */
export async function updatePost(post: Post, authorName: string): Promise<void> {
  const methodName = 'updatePost';
  const esClient = getElasticsearchClient();

  if (!esClient) {
    logger.warn('Elasticsearch is not available, skipping update');
    return;
  }

  try {
    await esClient.update({
      index: INDEX_NAME,
      id: post.post_id.toString(),
      body: {
        doc: {
          title: post.title,
          content: post.content,
          category: post.category,
          author_name: authorName,
          likes_count: post.likes_count,
          comments_count: post.comments_count,
          is_active: post.is_active
        }
      },
      refresh: false
    });

    logger.debug(`Post updated in index: ${post.post_id}`);
  } catch (error: any) {
    logger.warn(`Elasticsearch update failed for post ${post.post_id}: ${error.message}`);
    throw new ExternalAPIException(
      `Elasticsearch update failed: ${error.message}`,
      methodName
    );
  }
}

/**
 * 게시글 인덱스에서 삭제
 */
export async function deletePost(postId: number): Promise<void> {
  const methodName = 'deletePost';
  const esClient = getElasticsearchClient();

  if (!esClient) {
    logger.warn('Elasticsearch is not available, skipping deletion');
    return;
  }

  try {
    await esClient.delete({
      index: INDEX_NAME,
      id: postId.toString(),
      refresh: false
    });

    logger.debug(`Post deleted from index: ${postId}`);
  } catch (error: any) {
    // 문서가 없어도 에러가 발생할 수 있음 (무시)
    if (error.statusCode !== 404) {
      logger.warn(`Elasticsearch deletion failed for post ${postId}: ${error.message}`);
      throw new ExternalAPIException(
        `Elasticsearch deletion failed: ${error.message}`,
        methodName
      );
    }
  }
}

/**
 * 게시글 검색
 * 명세서 요구사항: 한글 형태소 분석, 검색어 하이라이트
 */
export interface SearchOptions {
  query: string;
  category?: PostCategory;
  page?: number;
  limit?: number;
  sort?: SortOption;
}

export interface SearchResult {
  post_id: number;
  title: string;
  content_preview: string;
  highlight?: string;
  score: number;
}

export async function searchPosts(options: SearchOptions): Promise<{
  results: SearchResult[];
  total: number;
}> {
  const methodName = 'searchPosts';
  const esClient = getElasticsearchClient();

  if (!esClient) {
    logger.warn('Elasticsearch is not available, returning empty results');
    return { results: [], total: 0 };
  }

  const { query, category, page = 1, limit = 20, sort = 'relevance' } = options;

  try {
    // 검색어 정규화 (공백, 특수문자 정제)
    const normalizedQuery = query.trim().replace(/[^\w\s가-힣]/g, '');

    if (normalizedQuery.length < 2) {
      return { results: [], total: 0 };
    }

    // Bool Query 구성 (명세서 요구사항)
    const must: any[] = [
      {
        multi_match: {
          query: normalizedQuery,
          fields: ['title^3', 'content'], // title에 더 높은 가중치
          type: 'best_fields'
        }
      }
    ];

    const filter: any[] = [
      { term: { is_active: true } }
    ];

    if (category) {
      filter.push({ term: { category } });
    }

    // 정렬 설정
    let sortOptions: any[] = [];
    if (sort === 'relevance') {
      sortOptions = [{ _score: { order: 'desc' } }];
    } else if (sort === 'latest') {
      sortOptions = [{ created_at: { order: 'desc' } }];
    } else if (sort === 'popular') {
      sortOptions = [
        { likes_count: { order: 'desc' } },
        { comments_count: { order: 'desc' } }
      ];
    }

    const searchBody: any = {
      query: {
        bool: {
          must,
          filter
        }
      },
      sort: sortOptions,
      highlight: {
        fields: {
          title: {},
          content: {
            fragment_size: 150,
            number_of_fragments: 1
          }
        },
        pre_tags: ['<em>'],
        post_tags: ['</em>']
      },
      from: (page - 1) * limit,
      size: limit
    };

    const response = await esClient.search({
      index: INDEX_NAME,
      body: searchBody
    });

    const results: SearchResult[] = (response.hits.hits || []).map((hit: any) => {
      const source = hit._source;
      const highlight = hit.highlight;

      return {
        post_id: parseInt(source.id),
        title: source.title,
        content_preview: source.content.substring(0, 150),
        highlight: highlight?.title?.[0] || highlight?.content?.[0] || undefined,
        score: hit._score || 0
      };
    });

    const total = typeof response.hits.total === 'number'
      ? response.hits.total
      : (response.hits.total?.value || 0);

    return {
      results,
      total
    };
  } catch (error: any) {
    logger.error('Elasticsearch search failed', error);
    
    // 타임아웃 또는 연결 오류 시 빈 결과 반환 (명세서 요구사항: 폴백)
    if (error.message?.includes('timeout') || error.message?.includes('ECONNREFUSED')) {
      logger.warn('Elasticsearch timeout or connection error, returning empty results');
      return { results: [], total: 0 };
    }

    throw new ExternalAPIException(
      `Elasticsearch search failed: ${error.message}`,
      methodName
    );
  }
}

