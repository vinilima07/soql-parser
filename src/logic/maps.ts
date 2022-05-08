import {
  ComparisonMongoOperatorsSupported,
  ComparisonSOQLOperatorsSupported,
  LogicalMongoOperatorsSupported,
  LogicalSOQLOperatorsSupported,
} from '../types/database';

export const ComparisonOperatorsMap = Object.freeze<{
  [operator in ComparisonMongoOperatorsSupported]: ComparisonSOQLOperatorsSupported;
}>({
  $nin: 'NOT IN',
  $in: 'IN',
  $like: 'LIKE',
  $gt: '>',
  $gte: '>=',
  $lt: '<',
  $lte: '<=',
  $eq: '=',
  $ne: '!=',
});

export const LogicalOperatorsMap = Object.freeze<{
  [operator in LogicalMongoOperatorsSupported]: LogicalSOQLOperatorsSupported;
}>({
  $and: 'AND',
  $or: 'OR',
});
