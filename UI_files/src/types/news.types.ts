/**
 * 뉴스 관련 타입 정의
 */

/**
 * 뉴스 기사 정보
 */
export interface NewsArticle {
  article_id: number;
  title: string;
  content?: string;
  summary?: string;
  source: string;
  url?: string;
  published_at: string;
  image_url?: string;
  tags?: string[];
  created_at: string;
}

/**
 * 뉴스 분류 정보
 */
export interface NewsClassification {
  classification_id: number;
  article_id: number;
  tags: string[];
  confidence: number;
  status: 'pending_review' | 'confirmed' | 'rejected';
  model_version?: string;
  created_at: string;
}

/**
 * 뉴스 목록 요청
 */
export interface NewsListRequest {
  category?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

/**
 * 추천 뉴스
 */
export interface RecommendedNews {
  article: NewsArticle;
  relevance_score: number;
  reason?: string;
}
