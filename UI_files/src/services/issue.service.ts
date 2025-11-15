/**
 * AI 이슈지수 API 서비스
 */

import { api } from './api.client';
import {
  IssueIndex,
  IssueIndexRequest,
  IssueIndexResponse,
  CategoryIssueIndex,
  IssueIndexSource,
} from '../types';

export const issueService = {
  /**
   * 현재 이슈지수 조회
   */
  getCurrentIndex: async (): Promise<IssueIndexResponse> => {
    return api.get<IssueIndexResponse>('/issue-index/current');
  },

  /**
   * 이슈지수 히스토리 조회
   */
  getIndexHistory: async (params?: IssueIndexRequest): Promise<IssueIndex[]> => {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.period) queryParams.append('period', params.period);

    return api.get<IssueIndex[]>(`/issue-index/history?${queryParams.toString()}`);
  },

  /**
   * 분야별 이슈지수 조회
   */
  getCategoryIndexes: async (): Promise<CategoryIssueIndex[]> => {
    return api.get<CategoryIssueIndex[]>('/issue-index/categories');
  },

  /**
   * 이슈지수 근거 뉴스 조회
   */
  getIndexSources: async (indexId: number): Promise<IssueIndexSource[]> => {
    return api.get<IssueIndexSource[]>(`/issue-index/${indexId}/sources`);
  },

  /**
   * 주간 추이 조회
   */
  getWeeklyTrend: async (): Promise<IssueIndex[]> => {
    return api.get<IssueIndex[]>('/issue-index/weekly-trend');
  },
};
