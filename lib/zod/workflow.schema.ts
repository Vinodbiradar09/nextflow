import { z } from "zod";

const ZodRFPosition = z.object({
  x: z.number(),
  y: z.number(),
});

const ZodRFNode = z.object({
  id: z.string(),
  type: z.enum([
    "TEXT",
    "UPLOAD_IMAGE",
    "UPLOAD_VIDEO",
    "RUN_LLM",
    "CROP_IMAGE",
    "EXTRACT_FRAME",
  ]),
  position: ZodRFPosition,
  data: z.object({
    config: z.record(z.string(), z.unknown()).optional(),
    label: z.string().optional(),
  }),
});

const ZodRFEdge = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

const ZodRFViewport = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
});

export const ZodReactFlowSnapshot = z.object({
  nodes: z.array(ZodRFNode),
  edges: z.array(ZodRFEdge),
  viewport: ZodRFViewport,
});

export const ZodCreateWorkflow = z.object({
  name: z
    .string()
    .min(1, "Workflow name is required")
    .max(100, "Workflow name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
});

export const ZodUpdateWorkflow = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
  reactFlowSnapshot: ZodReactFlowSnapshot.optional(),
});

export const ZodImportWorkflow = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  reactFlowSnapshot: ZodReactFlowSnapshot,
});

export type TZodRFNode = z.infer<typeof ZodRFNode>;
export type TZodRFEdge = z.infer<typeof ZodRFEdge>;
export type TZodReactFlowSnapshot = z.infer<typeof ZodReactFlowSnapshot>;
export type TZodCreateWorkflow = z.infer<typeof ZodCreateWorkflow>;
export type TZodUpdateWorkflow = z.infer<typeof ZodUpdateWorkflow>;
export type TZodImportWorkflow = z.infer<typeof ZodImportWorkflow>;
