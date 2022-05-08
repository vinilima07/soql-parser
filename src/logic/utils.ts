import moment = require('moment');
import { Pagination } from '../types/database';

export function isEmptyObject(obj: any): boolean {
  if (typeof obj === 'object') {
    return Object.keys(obj).length === 0;
  }

  return true;
}

export function paginationToSkipLimit(pagination: Pagination): {
  skip?: number;
  limit?: number;
  hasPagination: boolean;
} {
  let { skip, limit }: { skip: number; limit: number } = { skip: 0, limit: 0 };

  if (pagination?.skip != null) {
    skip = pagination.skip;
  }

  if (pagination?.limit != null) {
    if (skip == null) skip = 0;
    limit = pagination.limit;
  }

  if (pagination?.page && pagination?.pageSize) {
    /// first page = 1
    skip = (pagination.page - 1) * pagination.pageSize;
    limit = pagination.pageSize;
  }

  return {
    skip,
    limit,
    hasPagination: skip != null && limit != null && limit > 0,
  };
}

/**
 * Remove all types of spaces from the given string.
 */
export function trimSpaces(str: string) {
  if (typeof str === 'string') {
    return str.trim().replace(/\s/g, '');
  } else {
    return undefined;
  }
}

export function isDate(date: any): boolean {
  return moment(date, moment.ISO_8601, true).isValid();
}
