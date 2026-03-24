import { _Error, NextFlowApiResponse } from "@/lib/response/api-response";
import { requireSession } from "@/lib/auth/server/require-session";
import { getOwnedWorkflow } from "@/lib/workflow";
import { WorkflowIdParams } from "@/lib/utils";
import { NextRequest } from "next/server";
import { db } from "@/lib/db/prisma";

export async function GET(req: NextRequest, { params }: WorkflowIdParams) {
  try {
    const session = await requireSession();
    const { workflowId } = await params;
    await getOwnedWorkflow(workflowId, session.user.id);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
    const skip = (page - 1) * limit;
    const [runs, total] = await Promise.all([
      db.workflowRun.findMany({
        where: { workflowId },
        orderBy: { startedAt: "desc" },
        skip,
        take: limit,
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
              durationMs: true,
              startedAt: true,
              completedAt: true,
            },
          },
        },
      }),
      db.workflowRun.count({ where: { workflowId } }),
    ]);

    return NextFlowApiResponse(200, "runs accessed successfully", {
      runs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    return _Error(e);
  }
}
