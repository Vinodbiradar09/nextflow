import { _Error, NextFlowApiResponse } from "@/lib/response/api-response";
import { requireSession } from "@/lib/auth/server/require-session";
import { ZodTriggerExecution } from "@/lib/zod/execution.schema";
import { scheduleWorkflowRun } from "@/lib/execution/scheduler";
import { ValidationError } from "@/lib/error/error";
import { WorkflowIdParams } from "@/lib/utils";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/prisma";
import {
  getOwnedWorkflowWithEdgesAndNodes,
  validateRequest,
} from "@/lib/workflow";

export async function POST(req: NextRequest, { params }: WorkflowIdParams) {
  try {
    const session = await requireSession();

    const { workflowId } = await params;

    const workflow = await getOwnedWorkflowWithEdgesAndNodes(
      workflowId,
      session.user.id,
    );
    const body = await req.json();
    const data = validateRequest(ZodTriggerExecution, body);

    const { scope, selectedNodeIds } = data;

    const nodeIdsInScope =
      scope === "FULL"
        ? workflow.nodes.map((n) => n.rfNodeId)
        : (selectedNodeIds ?? []);

    // verify all selectedNodeIds exist in this workflow
    if (scope !== "FULL") {
      const existingRfNodeIds = new Set(workflow.nodes.map((n) => n.rfNodeId));
      const invalidIds = nodeIdsInScope.filter(
        (id) => !existingRfNodeIds.has(id),
      );
      if (invalidIds.length > 0) {
        throw new ValidationError(
          `The following node IDs do not exist in this workflow: ${invalidIds.join(", ")}`,
        );
      }
    }

    // create WorkflowRun + all NodeExecution rows in one transaction
    const workflowRun = await db.$transaction(async (tx) => {
      const run = await tx.workflowRun.create({
        data: {
          workflowId,
          userId: session.user.id,
          scope,
          status: "PENDING",
          selectedNodeIds:
            scope !== "FULL"
              ? (nodeIdsInScope as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          workflowSnapshot: workflow.reactFlowSnapshot as Prisma.InputJsonValue,
        },
      });

      await tx.nodeExecution.createMany({
        data: workflow.nodes.map((node) => ({
          workflowRunId: run.id,
          workflowNodeId: node.id,
          rfNodeId: node.rfNodeId,
          nodeType: node.type,
          status: nodeIdsInScope.includes(node.rfNodeId)
            ? "PENDING"
            : "SKIPPED",
        })),
      });

      return run;
    });

    // hand off to scheduler runs async, does not block the response
    // scheduleWorkflowRun handles all DAG traversal, parallel execution,
    // Trigger.dev task dispatch, and NodeExecution status updates
    scheduleWorkflowRun({
      workflowRunId: workflowRun.id,
      nodes: workflow.nodes,
      edges: workflow.edges,
      scopeNodeIds: nodeIdsInScope,
    }).catch(async (error) => {
      // if the scheduler itself crashes unexpectedly, mark the run as FAILED
      console.error(
        `[Scheduler] Unexpected crash for run ${workflowRun.id}:`,
        error,
      );
      await db.workflowRun.update({
        where: { id: workflowRun.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
        },
      });
    });

    return NextFlowApiResponse(201, "Execution triggered successfully", {
      runId: workflowRun.id,
      status: workflowRun.status,
      scope: workflowRun.scope,
    });
  } catch (error) {
    return _Error(error);
  }
}
