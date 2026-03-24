import { NotFoundError, ForbiddenError, ValidationError } from "./error/error";
import { db } from "./db/prisma";
import { z } from "zod";

const getOwnedWorkflow = async (workflowId: string, userId: string) => {
  if (!workflowId || !userId) {
    throw new ValidationError("missing workflowId and userId");
  }
  const workflow = await db.workflow.findUnique({
    where: {
      id: workflowId,
    },
  });
  if (!workflow) {
    throw new NotFoundError("workflow not found");
  }

  if (workflow.userId !== userId) {
    throw new ForbiddenError(
      "You do not have permission to access this workflow.",
    );
  }
  return workflow;
};

const validateRequest = <T>(schema: z.ZodSchema<T>, body: unknown): T => {
  const data = schema.safeParse(body);
  if (!data.success) {
    const error = data.error.issues
      .map((issue) => {
        // if there's a path, join it. If not top-level error just show message.
        const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
        return `${path}${issue.message}`;
      })
      .join("; ");

    throw new ValidationError(error);
  }
  return data.data;
};

export { getOwnedWorkflow, validateRequest };
