import { requireSession } from "@/lib/auth/server/require-session";
import { NotFoundError, ForbiddenError } from "@/lib/error/error";
import { _Error } from "@/lib/response/api-response";
import { workflowIdParams } from "@/lib/utils";
import { NextRequest } from "next/server";
import { db } from "@/lib/db/prisma";

export async function GET(req: NextRequest, { params }: workflowIdParams) {
  try {
    const session = await requireSession();
    const { workflowId } = await params;
    const workflow = await db.workflow.findUnique({
      where: {
        id: workflowId,
      },
      select: {
        id: true,
        userId: true,
        name: true,
        description: true,
        reactFlowSnapshot: true,
        version: true,
        createdAt: true,
      },
    });
    if (!workflow) {
      throw new NotFoundError("workflow not found");
    }
    if (workflow.userId !== session.user.id) {
      throw new ForbiddenError();
    }
    const { userId, ...exportData } = workflow;
    console.log(userId);
    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-type": "application/json",
        "Content-Disposition": `attachment; filename="${workflow.name}.json"`,
      },
    });
  } catch (e) {
    return _Error(e);
  }
}
