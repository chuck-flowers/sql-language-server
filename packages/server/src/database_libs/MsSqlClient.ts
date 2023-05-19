import { ConnectionPool, config } from 'mssql';
import { Connection } from '../SettingStore';
import AbstractClient, { RawField } from './AbstractClient';

// Based on https://learn.microsoft.com/en-us/sql/relational-databases/system-information-schema-views/tables-transact-sql?view=sql-server-ver16
type InformationSchemaTable = {
  TABLE_CATALOG: string, // nvarchar(128)
  TABLE_SCHEMA: string, // nvarchar(128)
  TABLE_NAME: string, // sysname
  TABLE_TYPE: 'VIEW' | 'BASE TABLE' // varchar(10) enum
}

// Based on https://learn.microsoft.com/en-us/sql/relational-databases/system-information-schema-views/columns-transact-sql?view=sql-server-ver16
type InformationSchemaColumn = {
  TABLE_CATALOG: string // nvarchar(128)
  TABLE_SCHEMA: string // nvarchar(128)
  TABLE_NAME: string // nvarchar(128)
  COLUMN_NAME: string // nvarchar(128)
  ORDINAL_POSITION: number // int
  COLUMN_DEFAULT: string // nvarchar(4000)
  IS_NULLABLE: 'YES' | 'NO' // varchar(3) enum
  DATA_TYPE: string // nvarchar(128)
  CHARACTER_MAXIMUM_LENGTH: number // int
  CHARACTER_OCTET_LENGTH: number // int
  NUMERIC_PRECISION: number // tinyint
  NUMERIC_PRECISION_RADIX: number // smallint
  NUMERIC_SCALE: number // int
  DATETIME_PRECISION: number // smallint
  CHARACTER_SET_CATALOG: string // nvarchar(128)
  CHARACTER_SET_SCHEMA: string // nvarchar(128)
  CHARACTER_SET_NAME: string // nvarchar(128)
  COLLATION_CATALOG: string // nvarchar(128)
  COLLATION_SCHEMA: string // nvarchar(128)
  COLLATION_NAME: string // nvarchar(128)
  DOMAIN_CATALOG: string // nvarchar(128)
  DOMAIN_SCHEMA: string // nvarchar(128)
  DOMAIN_NAME: string // nvarchar(128)
}

export default class MsSqlClient extends AbstractClient {
  private pool: ConnectionPool | null = null;

  constructor(settings: Connection) {
    super(settings);
  }

  get DefaultPort(): number {
    return 1433;
  }

  get DefaultHost(): string {
    return 'localhost';
  }

  get DefaultUser(): string {
    return 'master';
  }

  async connect() {
    this.pool = new ConnectionPool({
      server: this.settings.host || this.DefaultHost,
      port: this.settings.port || this.DefaultPort,
      database: this.settings.database || '',
      user: this.settings.user || this.DefaultUser,
      password: this.settings.password || ''
    });

    await this.pool.connect();

    return true;
  }

  disconnect(): void {
    this.pool?.close();
  }

  async getTables(): Promise<string[]> {
    if (!this.pool) {
      throw new Error("Don't have database connection.");
    }

    type QueryRow = Pick<InformationSchemaTable, 'TABLE_NAME'>;
    const { recordset: dbResults } = await this.pool!.query<QueryRow>`
      SELECT
        TABLE_NAME
      FROM
        INFORMATION_SCHEMA.TABLES
      WHERE
        TABLE_SCHEMA = '${this.settings.database}'
    `;

    return dbResults.map(x => x.TABLE_NAME);
  }

  async getColumns(tableName: string): Promise<RawField[]> {
    if (!this.pool) {
      throw new Error("Don't have database connection.");
    }

    type QueryRow = Pick<InformationSchemaColumn, 'COLUMN_NAME' | 'DATA_TYPE' | 'IS_NULLABLE' | 'COLUMN_DEFAULT'>;
    const { recordset: dbResults } = await this.pool!.query<QueryRow>`
      SELECT
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM
        INFORMATION_SCHEMA.COLUMNS
      WHERE
        TABLE_NAME = ${tableName}
      ORDER BY
        ORDINAL_POSITION
    `;

    return dbResults.map((x: QueryRow): RawField => ({
      field: x.COLUMN_NAME,
      type: x.DATA_TYPE,
      null: x.IS_NULLABLE === 'YES' ? 'Yes' : 'No',
      default: x.COLUMN_DEFAULT,
      comment: '' // TODO
    }));
  }

}
