declare module "sql.js" {
  export type SqlValue = number | string | boolean | Uint8Array | null;

  export interface Statement {
    bind(values?: SqlValue[]): boolean;
    step(): boolean;
    getAsObject(): Record<string, SqlValue>;
    free(): void;
  }

  export interface Database {
    exec(sql: string): void;
    prepare(sql: string): Statement;
    export(): Uint8Array;
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | null) => Database;
  }

  function initSqlJs(moduleConfig?: {
    locateFile?: (file: string) => string;
  }): Promise<SqlJsStatic>;

  export default initSqlJs;
}
