import { z } from "zod";

import type { WorkflowNode } from "../agent/workflow";

export const workflowNodeSchema: z.ZodType<WorkflowNode> = z.lazy(() =>
  z.object({
    id: z.string().min(1).max(128),
    type: z.enum(["chat", "http", "sleep", "set", "loop"]),
    timeoutMs: z.number().int().positive().max(120_000).optional(),
    input: z.record(z.string(), z.unknown()).optional(),
    body: z.array(workflowNodeSchema).min(1).max(50).optional(),
  }),
);

export const workflowSpecSchema = z.object({
  id: z.string().min(1).max(128).optional(),
  name: z.string().min(1).max(256).optional(),
  timeoutMs: z.number().int().positive().max(300_000).optional(),
  nodes: z.array(workflowNodeSchema).min(1).max(50),
});

export const memoryGraphQuerySchema = z.object({
  userId: z.string().min(1).max(320).optional(),
  limit: z.coerce.number().int().positive().max(2_000).optional(),
});

export const reasoningLoopSchema = z.object({
  goal: z.string().min(1).max(8_000),
  percepts: z.array(z.string().min(1).max(2_000)).max(50).optional(),
  maxSteps: z.number().int().positive().max(50).optional(),
});

