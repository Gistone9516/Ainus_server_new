-- users 테이블 필드 확장 스크립트
-- TASK-1-1: 기존 테이블에 새로운 필드 추가

-- 필드 추가 (이미 존재하는 경우 무시)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'local',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_locked_until DATETIME,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified_at DATETIME,
ADD COLUMN IF NOT EXISTS marketing_agreed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS terms_agreed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS privacy_agreed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at DATETIME;

-- 인덱스 추가 (이미 존재하는 경우 무시)
ALTER TABLE users
ADD INDEX IF NOT EXISTS idx_is_active (is_active),
ADD INDEX IF NOT EXISTS idx_account_locked_until (account_locked_until);

-- user_profiles 테이블 필드 확장
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(20) DEFAULT 'light',
ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_login_at DATETIME,
ADD COLUMN IF NOT EXISTS last_ip_address VARCHAR(45),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- user_sessions 테이블 필드 업데이트 필요
-- 이 테이블은 이미 생성되어 있으므로, 필드 추가가 필요한 경우 다음을 실행:
ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS device_info JSON,
ADD COLUMN IF NOT EXISTS user_agent VARCHAR(500),
ADD COLUMN IF NOT EXISTS revoked_at DATETIME,
ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS refresh_expires_at DATETIME;
