export type Pagination = {
  skip?: number;
  limit?: number;
  page?: number;
  pageSize?: number;
  sort?: string;
};

export type Projection = string[];

export type SOQLDataTypes = string | number | Date | null;

export type SOQLQueryMatcher = {
  $like?: string;
  $nin?: SOQLDataTypes[];
  $in?: SOQLDataTypes[];
  $gt?: SOQLDataTypes;
  $gte?: SOQLDataTypes;
  $lt?: SOQLDataTypes;
  $lte?: SOQLDataTypes;
  $eq?: SOQLDataTypes;
  $ne?: SOQLDataTypes;
};

export type SOQLQueryExp<T = any> = {
  [field in keyof T]?: number | string | boolean | Date | null | SOQLQueryMatcher;
};

export type SOQLQuery<T = any> = {
  $and?: (SOQLQuery | SOQLQueryExp<T>)[];
  $or?: (SOQLQuery | SOQLQueryExp<T>)[];
} & SOQLQueryExp<T>;

export interface SOQLStmt {
  object: string;
  type: 'select' | 'update' | 'delete' | 'insert';
}

export interface SOQLSelectStmt<T = any> extends SOQLStmt {
  type: 'select';
  query: SOQLQuery<T>;
  fields: Projection;
  pagination?: Pagination;
}

export type ComparisonMongoOperatorsSupported =
  | '$nin'
  | '$in'
  | '$like'
  | '$gt'
  | '$gte'
  | '$lt'
  | '$lte'
  | '$eq'
  | '$ne';

export type ComparisonSOQLOperatorsSupported =
  | 'NOT IN'
  | 'IN'
  | 'LIKE'
  | '>'
  | '>='
  | '<'
  | '<='
  | '='
  | '!=';

export type LogicalMongoOperatorsSupported = '$and' | '$or';

export type LogicalSOQLOperatorsSupported = 'AND' | 'OR';
