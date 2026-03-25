import { _Error, NextFlowApiResponse } from "@/lib/response/api-response";
import { requireSession } from "@/lib/auth/server/require-session";
import { NotFoundError, ValidationError } from "@/lib/error/error";
import { getOwnedWorkflow } from "@/lib/workflow";
import { runs } from "@trigger.dev/sdk/v3";
import { RunIdParams } from "@/lib/utils";
import { NextRequest } from "next/server";
import { db } from "@/lib/db/prisma";

export async function POST(req: NextRequest, { params }: RunIdParams) {
  try {
    const session = await requireSession();
    const { workflowId, runId } = await params;
    await getOwnedWorkflow(workflowId, session.user.id);
    const run = await db.workflowRun.findUnique({
      where: { id: runId, workflowId },
      include: {
        nodeExecution: {
          where: {
            status: { in: ["PENDING", "RUNNING"] },
          },
          select: {
            id: true,
            triggerTaskId: true,
            status: true,
          },
        },
      },
    });
    if (!run) throw new NotFoundError("Execution run not found.");

    if (run.status !== "PENDING" && run.status !== "RUNNING") {
      throw new ValidationError(
        `Cannot cancel a run with status "${run.status}". Only PENDING or RUNNING runs can be cancelled.`,
      );
    }
    const triggerCancellations = run.nodeExecution
      .filter((e) => e.triggerTaskId !== null)
      .map((e) =>
        runs.cancel(e.triggerTaskId!).catch((err) => {
          console.warn(
            `[Cancel] Failed to cancel Trigger.dev task ${e.triggerTaskId}:`,
            err,
          );
        }),
      );
    await Promise.allSettled(triggerCancellations);
    const cancelledRun = await db.$transaction(async (tx) => {
      const updated = await tx.workflowRun.update({
        where: { id: runId },
        data: {
          status: "CANCELLED",
          completedAt: new Date(),
          durationMs: run.startedAt
            ? Date.now() - run.startedAt.getTime()
            : null,
        },
      });

      await tx.nodeExecution.updateMany({
        where: {
          workflowRunId: runId,
          status: { in: ["PENDING", "RUNNING"] },
        },
        data: {
          status: "FAILED",
          errorMessage: "run was cancled by user",
          completedAt: new Date(),
        },
      });
      return updated;
    });
    return NextFlowApiResponse(200, "Execution run cancelled successfully", {
      runId: cancelledRun.id,
      status: cancelledRun.status,
    });
  } catch (e) {
    return _Error(e);
  }
}
