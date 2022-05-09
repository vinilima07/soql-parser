import {
  ComparisonMongoOperatorsSupported,
  LogicalMongoOperatorsSupported,
  Pagination,
  Projection,
  SOQLQuery,
  SOQLQueryExp,
  SOQLQueryMatcher,
  SOQLSelectStmt,
} from '../types/database';
import { ComparisonOperatorsMap, LogicalOperatorsMap } from './maps';
import { isDate, isEmptyObject, paginationToSkipLimit } from './utils';

/**
 * Build complex queries in Salesforce Object Query Language using
 * @todo After create more statement types, separate this class in multiple parser types
 */
export class SOQLParser<ObjectScheme = any> {
  /** The Object API Name defined on salesforce. */
  object: string;
  /** The statement operation used to define how to build the query. */
  operation: string;
  /** The object query to define how */
  query?: SOQLQuery<any>;
  /**
   * The list of fields to define the soql expressions. The usage of this fields depends on the operation.
   * - select: Fields to return in the search
   */
  fields?: Projection;
  /** The controll of the cursor during the select search. */
  pagination?: Pagination;

  /**
   * @todo support more statement types
   */
  constructor(stmt: SOQLSelectStmt<ObjectScheme>) {
    this.object = stmt.object;
    this.operation = stmt.type;

    if (!stmt.object) {
      // prettier-ignore
      SOQLParser.throwMalformedQuery('The statement object must be specified in order to define the query expression.');
    }

    switch (stmt.type) {
      case 'select': {
        this.query = stmt.query;
        this.fields = stmt.fields;
        this.pagination = stmt.pagination;
        break;
      }
      default: {
        throw new Error(`The operation ${this.operation} was not implemented yet or don't exists.`);
      }
    }
  }

  private buildSelect(object: string, fields: Projection, where?: string, pagination?: Pagination) {
    if (fields == null) {
      SOQLParser.throwMalformedQuery('The fields must be specified on SOQL select query');
    }

    const { hasPagination, limit, skip } = paginationToSkipLimit(pagination);
    let cursorPosition = '';
    let sort = '';

    if (hasPagination) {
      if (limit) {
        cursorPosition += ` LIMIT ${limit} `;
      }

      if (skip) {
        cursorPosition += ` OFFSET ${skip} `;
      }
    }

    if (pagination?.sort) {
      sort = `ORDER BY ${pagination.sort} ASC`;
    }

    return `SELECT ${fields.join(',')} FROM ${object} ${where} ${sort} ${cursorPosition}`;
  }

  private static throwMalformedQuery(reason: any): never {
    throw new Error(`Malformed query expression. ${JSON.stringify(reason)}.`);
  }

  private static joinAndExpressions(exps: string[]): string {
    return ` (${exps.join(SOQLParser.soqlLogicalOperator('$and'))}) `;
  }

  private static joinOrExpressions(exps: string[]): string {
    return ` (${exps.join(SOQLParser.soqlLogicalOperator('$or'))}) `;
  }

  private static createMatcher(
    field: string,
    value: any,
    operator: ComparisonMongoOperatorsSupported = '$eq',
  ) {
    if (operator === '$in' || operator === '$nin') {
      if (Array.isArray(value)) {
        const values = value
          .map((v) => {
            if (typeof v === 'string') {
              return `'${v}'`;
            } else if (typeof v === 'object' && v != null) {
              SOQLParser.throwMalformedQuery(['Operator value cannot be', operator, value]);
            } else {
              return v;
            }
          })
          .join(',');
        return ` ${field} ${SOQLParser.soqlComparisonOperator(operator)} (${values}) `;
      } else {
        SOQLParser.throwMalformedQuery(`Operator ${operator} must has an array value.`);
      }
    }

    if (value instanceof Date) {
      return ` ${field} ${SOQLParser.soqlComparisonOperator(operator)} ${value.toISOString()} `;
    } else if (typeof value === 'string' && isDate(value) === false) {
      return ` ${field} ${SOQLParser.soqlComparisonOperator(operator)} '${value}' `;
    }
    // other type than primitives and array will not be accepted
    else if (typeof value === 'object' && value != null) {
      SOQLParser.throwMalformedQuery(['Incorrect operator for value', operator, value]);
    } else {
      return ` ${field} ${SOQLParser.soqlComparisonOperator(operator)} ${value} `;
    }
  }

  /**
   * Parse a query expression into multiple SOQL where expressions.
   * @param queryExp The query expressions to be parsed.
   */
  private static createExpressions = (queryExp: SOQLQueryExp): string => {
    // expect a defined query expression
    if (isEmptyObject(queryExp)) {
      SOQLParser.throwMalformedQuery(queryExp);
    } else {
      const expressions: string[] = [];

      // normal matches without comparison operators, default is equality
      for (const [field, expOrValue] of Object.entries(queryExp)) {
        // if the value is an array without comparison operatos, default is to use in to have a behavior of OR logical related to the field values
        if (Array.isArray(expOrValue)) {
          expressions.push(SOQLParser.createMatcher(field, expOrValue, '$in'));
        } else if (
          typeof expOrValue === 'object' &&
          isDate(expOrValue) == false &&
          expOrValue != null
        ) {
          if (isEmptyObject(expOrValue)) {
            SOQLParser.throwMalformedQuery(['Incorrect operator value', field, expOrValue]);
          }

          // internal query matchers with comparison operators
          for (const [matcher, value] of Object.entries(expOrValue)) {
            expressions.push(SOQLParser.createMatcher(field, value, matcher as any));
          }
        } else {
          expressions.push(SOQLParser.createMatcher(field, expOrValue));
        }
      }

      return this.joinAndExpressions(expressions);
    }
  };

  /**
   * Parse a mongo like query object to a soql where statement.
   * @param query The mongo like query object to be parsed
   * @example { field: { $like: "value" } } -> field LIKE 'value'
   * @example { field: { $gt: 18 } } -> field > 18
   */
  queryToWhere(query: SOQLQuery<ObjectScheme>): string {
    // if the query is empty just return empty where statement
    if (isEmptyObject(query)) {
      return '';
    }

    const { $and, $or, ...filters } = query;
    const whereConditions: string[] = [];

    if (Array.isArray(query.$and)) {
      whereConditions.push(
        SOQLParser.joinAndExpressions(
          query.$and.map((queryExp) => SOQLParser.createExpressions(queryExp)),
        ),
      );
    }

    if (Array.isArray(query.$or)) {
      whereConditions.push(
        SOQLParser.joinOrExpressions(
          query.$or.map((queryExp) => SOQLParser.createExpressions(queryExp)),
        ),
      );
    }

    if (!isEmptyObject(filters)) {
      whereConditions.push(SOQLParser.createExpressions(filters));
    }

    if (whereConditions.length > 0) {
      return ` WHERE ${SOQLParser.joinAndExpressions(whereConditions)} `;
    } else {
      return '';
    }
  }

  /** Retrieve the comparison operator in the SOQL given the symbol */
  static soqlComparisonOperator(operator: ComparisonMongoOperatorsSupported) {
    const comparisonOperator = ComparisonOperatorsMap[operator];

    if (!comparisonOperator) {
      SOQLParser.throwMalformedQuery(`Invalid comparison operator ${operator}`);
    }

    return comparisonOperator;
  }

  /** Retrieve the logical operator in the SOQL given the symbol */
  static soqlLogicalOperator(operator: LogicalMongoOperatorsSupported) {
    const logicalOperator = LogicalOperatorsMap[operator];

    if (!logicalOperator) {
      SOQLParser.throwMalformedQuery(`Invalid logical operator ${operator}`);
    }

    return logicalOperator;
  }

  /**
   * Build the SOQL query from a defined query object definition similar to MongoDB.
   */
  build() {
    const { object, query, operation, fields, pagination } = this;
    const where = this.queryToWhere(query);

    switch (operation) {
      case 'select': {
        return this.buildSelect(object, fields, where, pagination);
      }
      default: {
        throw new Error(`The operation ${operation} was not implemented yet`);
      }
    }
  }
}

/**
 * Build the SOQL query from a defined query object definition similar to MongoDB.
 * @description Use the SOQL Parser class.
 */
export function mongoToSOQL<ObjectScheme = any>(stmt: SOQLSelectStmt) {
  const parsSOQLParser = new SOQLParser<ObjectScheme>(stmt);
  return parsSOQLParser.build();
}
