import { PostgresStore, PgVector } from "@mastra/pg";
import { getEnvConfig } from "@renisa-ai/config/env";

const { database: databaseConfig } = getEnvConfig();

export const postgresStore = new PostgresStore({
  connectionString: databaseConfig.connectionString,
  ...databaseConfig.pgPoolOptions,
});
export const pgVector = new PgVector(databaseConfig);
