import { Credentials } from "df/api/commands/credentials";
import { BigQueryDbAdapter } from "df/api/dbadapters/bigquery";
import { RedshiftDbAdapter } from "df/api/dbadapters/redshift";
import { SnowflakeDbAdapter } from "df/api/dbadapters/snowflake";
import { SQLDataWarehouseDBAdapter } from "df/api/dbadapters/sqldatawarehouse";
import { dataform } from "df/protos/ts";

export type OnCancel = (handleCancel: () => void) => void;

export const CACHED_STATE_TABLE_TARGET: dataform.ITarget = {
  schema: "dataform_meta",
  name: "cache_state"
};

export interface IExecutionResult {
  rows: any[];
  metadata: dataform.IExecutionMetadata;
}

export interface IDbAdapter {
  execute(
    statement: string,
    options?: {
      onCancel?: OnCancel;
      interactive?: boolean;
      maxResults?: number;
    }
  ): Promise<IExecutionResult>;
  evaluate(statement: string): Promise<dataform.IQueryEvaluationResponse>;
  tables(): Promise<dataform.ITarget[]>;
  table(target: dataform.ITarget): Promise<dataform.ITableMetadata>;
  preview(target: dataform.ITarget, limitRows?: number): Promise<any[]>;
  prepareSchema(database: string, schema: string): Promise<void>;
  prepareStateMetadataTable(): Promise<void>;
  persistStateMetadata(actions: dataform.IExecutionAction[]): Promise<void>;
  persistedStateMetadata(): Promise<dataform.IPersistedTableMetadata[]>;
  setMetadata(action: dataform.IExecutionAction): Promise<void>;
  deleteStateMetadata(actions: dataform.IExecutionAction[]): Promise<void>;
  close(): Promise<void>;
}

export interface IDbAdapterClass<T extends IDbAdapter> {
  create: (credentials: Credentials) => Promise<T>;
}

const registry: { [warehouseType: string]: IDbAdapterClass<IDbAdapter> } = {};

export function register(warehouseType: string, c: IDbAdapterClass<IDbAdapter>) {
  registry[warehouseType] = c;
}

export async function create(credentials: Credentials, warehouseType: string): Promise<IDbAdapter> {
  if (!registry[warehouseType]) {
    throw new Error(`Unsupported warehouse: ${warehouseType}`);
  }
  return await registry[warehouseType].create(credentials);
}

register("bigquery", BigQueryDbAdapter);
// TODO: The redshift client library happens to work well for postgres, but we should probably
// not be relying on that behaviour. At some point we should replace this with a first-class
// PostgresAdapter.
register("postgres", RedshiftDbAdapter);
register("redshift", RedshiftDbAdapter);
register("snowflake", SnowflakeDbAdapter);
register("sqldatawarehouse", SQLDataWarehouseDBAdapter);
