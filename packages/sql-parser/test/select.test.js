const { parse } = require('../index')

describe('table name with double quotes', () => {
 it('should success to parse', () => {
    const sql = `
      SELECT "T1"."COL1"
      FROM "T1"
      WHERE "T1"."num" = 1
    `
     const result = parse(sql)
     expect(result).toBeDefined()
     expect(result).toMatchObject({ type: 'select' })
  })
})


describe('multiple sqls in the same file', () => {
    const sql = `
      SELECT "T1"."COL1" FROM "T1" WHERE "T1"."num" = 1;
      SELECT "T1"."COL1" FROM "T1" WHERE "T1"."num" = 2;
     `
     const result = parse(sql)
     expect(result).toBeDefined()
     expect(result).toMatchObject({ type: 'select' })
});