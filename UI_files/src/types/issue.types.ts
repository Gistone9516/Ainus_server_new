/**
 * AI 이슈지수 관련 타입 정의
 */

/**
 * 이슈지수 정보
 */
export interface IssueIndex {
  index_id: number;
  index_value: number;
  calculation_date: string;
  period: 'daily' | 'weekly' | 'monthly';
  metadata?: {
    [key: string]: any;
  };
  created_at: string;
}

/**
 * 이슈지수 조회 요청
 */
export interface IssueIndexRequest {
  start_date?: string;
  end_date?: string;
  period?: 'daily' | 'weekly' | 'monthly';
}

/**
 * 이슈지수 응답
 */
export interface IssueIndexResponse {
  current: IssueIndex;
  history: IssueIndex[];
  change_percentage?: number;
  trend?: 'up' | 'down' | 'stable';
}

/**
 * 분야별 이슈지수
 */
export interface CategoryIssueIndex {
  category: string;
  index_value: number;
  percentage: number;
  change?: number;
}

/**
 * 이슈지수 근거 뉴스
 */
export interface IssueIndexSource {
  source_id: number;
  index_id: number;
  article_id: number;
  article_title: string;
  article_url?: string;
  source_name?: string;
  published_at: string;
  relevance_score: number;
}
