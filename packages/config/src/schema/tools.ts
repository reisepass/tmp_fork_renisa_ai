import { z } from "zod";

export const tools = z.object({});

export const toolEnum = tools.keyof();
