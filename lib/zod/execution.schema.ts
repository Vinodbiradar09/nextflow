import { z } from "zod";

export const ZodTriggerExecution = z
  .object({
    // FULL = entire workflow, PARTIAL = selected nodes, SINGLE = one node
    scope: z.enum(["FULL", "PARTIAL", "SINGLE"]),
    selectedNodeIds: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      // if scope is partail or single, selectedNodeIds must be provided and non-empty
      if (data.scope === "PARTIAL" || data.scope === "SINGLE") {
        return data.selectedNodeIds && data.selectedNodeIds.length > 0;
      }
      return true;
    },
    {
      message: "selectedNodeIds is required for PARTIAL and SINGLE runs",
      path: ["selectedNodeIds"],
    },
  );

export type TZodTriggerExecution = z.infer<typeof ZodTriggerExecution>;
