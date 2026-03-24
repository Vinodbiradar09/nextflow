import { _Error, NextFlowApiResponse } from "@/lib/response/api-response";
import { requireSession } from "@/lib/auth/server/require-session";
import { ZodUpdateWorkflow } from "@/lib/zod/workflow.schema";
import { workflowIdParams } from "@/lib/utils";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/prisma";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "@/lib/error/error";

export async function GET(req: NextRequest, { params }: workflowIdParams) {
  try {
    const session = await requireSession();
    const { workflowId } = await params;
    const workflow = await db.workflow.findUnique({
      where: {
        id: workflowId,
      },
      include: {
        nodes: true,
        edges: true,
      },
    });
    if (!workflow) {
      throw new NotFoundError("workflow not found");
    }
    if (workflow.userId !== session.user.id) {
      throw new ForbiddenError();
    }
    return NextFlowApiResponse(200, "workflow accessed successfully");
  } catch (e) {
    return _Error(e);
  }
}

export async function DELETE(req: NextRequest, { params }: workflowIdParams) {
  try {
    const session = await requireSession();
    const { workflowId } = await params;
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
    await db.workflow.delete({
      where: {
        id: workflowId,
      },
    });

    return NextFlowApiResponse(200, "workflow deleted successfully", null);
  } catch (e) {
    return _Error(e);
  }
}

export async function PATCH(req: NextRequest, { params }: workflowIdParams) {
  try {
    const session = await requireSession();
    const { workflowId } = await params;
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
    const body = await req.json();
    const data = ZodUpdateWorkflow.safeParse(body);
    if (!data.success) {
      const error = data.error.issues
        .map((issue) => `${issue.path.join(".")}:${issue.message}`)
        .join("; ");
      throw new ValidationError(error);
    }
    const { reactFlowSnapshot, ...rest } = data.data;
    const updated = await db.$transaction(async (tx) => {
      const updatedWorkflow = await tx.workflow.update({
        where: {
          id: workflowId,
        },
        data: {
          ...rest,
          version: { increment: 1 },
          ...(reactFlowSnapshot && {
            reactFlowSnapshot: reactFlowSnapshot as Prisma.InputJsonValue,
          }),
        },
      });
      // if canvas snapshot was saved , sync the normalized node + edge tables
      if (reactFlowSnapshot) {
        // delete old nodes and edges and re-insert fresh
        await tx.workflowNode.deleteMany({ where: { workflowId } });
        await tx.workflowEdge.deleteMany({ where: { workflowId } });

        if (reactFlowSnapshot.nodes.length > 0) {
          await tx.workflowNode.createMany({
            data: reactFlowSnapshot.nodes.map((node) => ({
              workflowId,
              rfNodeId: node.id,
              type: node.type,
              positionX: node.position.x,
              positionY: node.position.y,
              config: (node.data?.config as Prisma.InputJsonValue) ?? {},
              label: node.data?.label ?? null,
            })),
          });
        }

        if (reactFlowSnapshot.edges.length > 0) {
          await tx.workflowEdge.createMany({
            data: reactFlowSnapshot.edges.map((edge) => ({
              workflowId,
              rfEdgeId: edge.id,
              sourceRfNodeId: edge.source,
              sourceHandle: edge.sourceHandle ?? "output",
              targetRfNodeId: edge.target,
              targetHandle: edge.targetHandle ?? "input",
            })),
          });
        }
      }

      return updatedWorkflow;
    });

    return NextFlowApiResponse(200, "workflow saved successfully", updated);
  } catch (e) {
    return _Error(e);
  }
}
