import { requireSession } from "@/lib/auth/server/require-session";
import { _Error } from "@/lib/response/api-response";
import { getOwnedWorkflow } from "@/lib/workflow";
import { WorkflowIdParams } from "@/lib/utils";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: WorkflowIdParams) {
  try {
    const session = await requireSession();
    const { workflowId } = await params;
    const workflow = await getOwnedWorkflow(workflowId, session.user.id);
    const { userId, createdAt, isPublic, ...exportData } = workflow;
    console.log(userId, createdAt, isPublic);
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
