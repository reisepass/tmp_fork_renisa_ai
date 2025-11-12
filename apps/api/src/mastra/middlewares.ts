import { getEnvConfig } from "@renisa-ai/config/env";
import { MiddlewareHandler } from "hono";

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  // Always allow OPTIONS requests (CORS preflight)
  if (c.req.method === 'OPTIONS') {
    await next();
    return;
  }

  // Allow public endpoints without authentication
  const path = c.req.path;
  // DEPRECATED: /api/info endpoint has been removed
  const publicEndpoints: string[] = [];

  if (publicEndpoints.some(endpoint => path === endpoint)) {
    await next();
    return;
  }

  const config = getEnvConfig();
  if (config.isLocal || config.mastra.isMastraCloud) {
    await next();
    return;
  }

  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  const validToken = config.mastra.bearerToken;

  if (token !== validToken) {
    return new Response("Forbidden", { status: 403 });
  }

  // Token is valid, continue
  await next();
};
