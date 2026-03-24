import { _Error, NextFlowApiResponse } from "@/lib/response/api-response";
import { requireSession } from "@/lib/auth/server/require-session";
import { NotFoundError, ForbiddenError } from "@/lib/error/error";
import { RunIdParams } from "@/lib/utils";
import { NextRequest } from "next/server";
import { db } from "@/lib/db/prisma";

export async function GET(req: NextRequest, { params }: RunIdParams) {
  try {
    const session = await requireSession();
    const { workflowId, runId } = await params;
    const workflow = await db.workflow.findUnique({
      where: {
        id: workflowId,
      },
    });
    if (!workflow) {
      throw new NotFoundError("workflow not found");
    }
    if (workflow.userId !== session.user.id) {
      throw new ForbiddenError();
    }

    const run = await db.workflowRun.findUnique({
      where: {
        id: runId,
        workflowId,
      },
      include: {
        nodeExecution: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            rfNodeId: true,
            nodeType: true,
            status: true,
            inputs: true,
            outputs: true,
            errorMessage: true,
            errorStack: true,
            durationMs: true,
            startedAt: true,
            completedAt: true,
            triggerTaskId: true,
          },
        },
      },
    });
    if (!run) {
      throw new NotFoundError("execution run not found");
    }
    return NextFlowApiResponse(200, "execution run accessed successfully", run);
  } catch (e) {
    return _Error(e);
  }
}
