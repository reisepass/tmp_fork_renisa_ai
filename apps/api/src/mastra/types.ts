import { registerApiRoute } from "@mastra/core/server";

import { mastra } from "./index";

export type MastraInstance = typeof mastra;

export type Handler = Parameters<typeof registerApiRoute>[1]["handler"];
