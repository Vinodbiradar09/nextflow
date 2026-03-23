import { z } from "zod";

export const ZodCreateWorkflow = z.object({
  name: z
    .string()
    .min(1, "workflow name is required")
    .max(100, "workflow name is too long"),
  description: z.string().max(500, "description is too long").optional(),
});

export const ZodUpdateWorkflow = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
  reactFlowSnapshot: z
    .object({
      nodes: z.array(z.any()),
      edges: z.array(z.any()),
      viewport: z.object({
        x: z.number(),
        y: z.number(),
        zoom: z.number(),
      }),
    })
    .optional(),
});

export const ZodImportWorkflow = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  reactFlowSnapshot: z.object({
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
    viewport: z.object({
      x: z.number(),
      y: z.number(),
      zoom: z.number(),
    }),
  }),
});

export type TZodCreateWorkflow = z.infer<typeof ZodCreateWorkflow>;
export type TZodUpdateWorkflow = z.infer<typeof ZodUpdateWorkflow>;
export type TZodImportWorkflow = z.infer<typeof ZodImportWorkflow>;
