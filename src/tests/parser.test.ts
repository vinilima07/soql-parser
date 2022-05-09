import { mongoToSOQL } from '../logic/parser';
import { trimSpaces } from '../logic/utils';
import { Pagination } from '../types/database';

describe('Test Parser methods', () => {
  describe('Test Litify Select Statement Parser', () => {
    const type = 'select';
    const object = 'Object';
    const fields = ['Id', 'Name'];

    const testCases: {
      query: any;
      where?: string;
      test: string;
      expectation: 'error' | 'success';
      pagination?: Pagination;
    }[] = [
      {
        test: 'Testing malformed query definition wich should throw error',
        query: { $and: [{}], x: {} },
        expectation: 'error',
      },
      {
        test: 'Testing malformed query definition wich should throw error',
        query: { x: [{}] },
        expectation: 'error',
      },
      {
        test: 'Testing multiple higher level query expressions which should build a query correctly.',
        expectation: 'success',
        where: `SELECTId,NameFROMObjectWHERE(((NameLIKE'%vini%'ANDAge__c>167)AND(NameLIKE'%franch%'))AND((Gender__c='female')OR(Gender__c='another')OR(Gender__c=null))AND(Id='123456789101112'))`,
        query: {
          $and: [
            { Name: { $like: '%vini%' }, Age__c: { $gt: 167 } },
            { Name: { $like: '%franch%' } },
          ],
          $or: [{ Gender__c: 'female' }, { Gender__c: 'another' }, { Gender__c: null }],
          Id: '123456789101112',
        },
      },
      {
        test: 'Testing comparison operator expressions which should build a query correctly',
        expectation: 'success',
        where: `SELECTId,NameFROM${object}WHERE((IdIN('1','2')ANDNameNOTIN('Vinicius','Dev')ANDEmail__cLIKE'%@%'ANDAge__c>1ANDDate_of_Birth__c>=1999-01-01T00:00:00.000ZANDWeight__c<160ANDHeight__c<=1.55ANDActivated__c=trueANDDeleted__c!=falseANDUpdatedAt__c=null))`,
        query: {
          Id: { $in: ['1', '2'] },
          Name: { $nin: ['Vinicius', 'Dev'] },
          Email__c: { $like: '%@%' },
          Age__c: { $gt: 1 },
          Date_of_Birth__c: { $gte: new Date('1999-01-01') },
          Weight__c: { $lt: 160 },
          Height__c: { $lte: 1.55 },
          Activated__c: { $eq: true },
          Deleted__c: { $ne: false },
          UpdatedAt__c: null,
        },
      },
    ];

    for (const testCase of testCases) {
      test(testCase.test, () => {
        const actual = () => {
          return mongoToSOQL({
            pagination: testCase.pagination,
            query: testCase.query,
            type,
            object,
            fields,
          });
        };

        if (testCase.expectation === 'error') {
          expect(actual).toThrow();
        } else {
          expect(trimSpaces(actual())).toEqual(trimSpaces(testCase.where));
        }
      });
    }
  });
});
