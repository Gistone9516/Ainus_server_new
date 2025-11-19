/**
 * 커뮤니티 플랫폼 기능 마이그레이션
 * Phase 4: Community Platform Features
 */

-- 1. community_posts 테이블에 카테고리 및 소프트 삭제 컬럼 추가
ALTER TABLE community_posts
ADD COLUMN IF NOT EXISTS category ENUM(
  'prompt_share',      -- 프롬프트 공유
  'qa',                -- 질문/답변
  'review',            -- 후기/리뷰
  'general',           -- 일상/잡담
  'announcement'       -- 공지/이벤트
) NOT NULL DEFAULT 'general' AFTER content,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE AFTER views_count,
ADD COLUMN IF NOT EXISTS deleted_at DATETIME AFTER is_deleted;

-- FULLTEXT INDEX 추가 (검색용)
ALTER TABLE community_posts
ADD FULLTEXT INDEX idx_fulltext_search (title, content);

-- 2. community_comments 테이블에 대댓글 및 소프트 삭제 컬럼 추가
ALTER TABLE community_comments
ADD COLUMN IF NOT EXISTS parent_comment_id INT AFTER post_id,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE AFTER likes_count,
ADD COLUMN IF NOT EXISTS deleted_at DATETIME AFTER is_deleted;

-- 외래키 및 인덱스 추가
ALTER TABLE community_comments
ADD CONSTRAINT fk_parent_comment
FOREIGN KEY (parent_comment_id) REFERENCES community_comments(comment_id) ON DELETE CASCADE;

ALTER TABLE community_comments
ADD INDEX idx_parent_comment_id (parent_comment_id);

-- 3. community_notifications 테이블 생성
CREATE TABLE IF NOT EXISTS community_notifications (
  notification_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  actor_id INT,
  post_id INT,
  comment_id INT,
  notification_type ENUM(
    'post_comment',        -- 내 게시물에 댓글
    'comment_reply'        -- 내 댓글에 답글
  ) NOT NULL,
  content VARCHAR(500),
  is_read BOOLEAN DEFAULT FALSE,
  read_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(user_id) ON DELETE SET NULL,
  FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES community_comments(comment_id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
