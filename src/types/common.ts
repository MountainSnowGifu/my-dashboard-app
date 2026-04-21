export type SortOrder = 'asc' | 'desc';

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface SortParams {
  sortBy: string;
  sortOrder: SortOrder;
}

export interface SelectOption {
  label: string;
  value: string;
}

export type Status = 'idle' | 'loading' | 'success' | 'error';
