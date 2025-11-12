import { z } from "zod";

export const envEnum = z.enum([
  "development",
  "staging",
  "production",
  "test",
  "local",
]);

// Environment variable schema
const envSchema = z.object({
  NODE_ENV: envEnum.default("development"),

  // API Configuration
  MASTRA_BEARER_TOKEN: z.string().min(1),
  MASTRA_DEV: z
    .string()
    .default("false")
    .transform((val) => val === "true"),
  MASTRA_CLOUD: z
    .string()
    .default("false")
    .transform((val) => val === "true"),

  LANGFUSE_HOST: z.url().min(1),
  LANGFUSE_LABEL: z.string().optional(),
  LANGFUSE_PUBLIC_KEY: z.string().min(1),
  LANGFUSE_SECRET_KEY: z.string().min(1),
  LANGFUSE_OBSERVABILITY: z
    .string()
    .min(1)
    .default("true")
    .transform((val) => val === "true"),

  // Database
  DB_CONNECTION_STRING: z.url().min(1),

  // External Services
  OPENAI_API_KEY: z.string().min(1),
  OPENROUTER_API_KEY: z.string().min(1),

  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),

  REQ_AUTH_USERNAME: z.string().min(1),
  REQ_AUTH_PASSWORD: z.string().min(1),
  REQ_AUTH_CLIENT: z.string().min(1),
});

// Parse and validate environment variables
export function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error("❌ Invalid environment variables:", error);
    throw new Error("Invalid environment configuration");
  }
}

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;

// Environment-specific configurations
export const getEnvConfig = () => {
  const env = validateEnv();

  const isLocal = env.NODE_ENV === "local";
  const isProduction = env.NODE_ENV === "production";
  const isTest = env.NODE_ENV === "test";
  const isDevelopment = env.NODE_ENV === "development";
  const isStaging = env.NODE_ENV === "staging";
  return {
    isDevelopment,
    isProduction,
    isTest,
    isLocal,
    isStaging,
    env: env.NODE_ENV,

    database: {
      connectionString: env.DB_CONNECTION_STRING,
      pgPoolOptions: isLocal
        ? {}
        : {
            max: 1,
            ssl: { rejectUnauthorized: false },
            keepAlive: true,
            keepAliveInitialDelayMillis: 30_000,
            idleTimeoutMillis: 30_000,
          },
    },

    mastra: {
      bearerToken: env.MASTRA_BEARER_TOKEN,
      isDevelopmentServer: env.MASTRA_DEV,
      isMastraCloud: env.MASTRA_CLOUD,
    },

    langfuse: {
      config: {
        baseUrl: env.LANGFUSE_HOST,
        publicKey: env.LANGFUSE_PUBLIC_KEY,
        secretKey: env.LANGFUSE_SECRET_KEY,
      },
      withObservability: env.LANGFUSE_OBSERVABILITY,
      // Use LANGFUSE_LABEL if provided, otherwise always use "latest" in development/local/test, use environment label for staging/production
      label:
        env.LANGFUSE_LABEL ||
        (isLocal || isTest || isDevelopment ? "latest" : env.NODE_ENV),
    },

    services: {
      openai: env.OPENAI_API_KEY,
      openrouter: env.OPENROUTER_API_KEY,
    },

    logLevel: env.LOG_LEVEL,

    requests: {
      auth: {
        username: env.REQ_AUTH_USERNAME,
        password: env.REQ_AUTH_PASSWORD,
        client: env.REQ_AUTH_CLIENT,
      },
    },
  };
};
