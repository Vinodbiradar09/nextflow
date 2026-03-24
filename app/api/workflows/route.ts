import { _Error, NextFlowApiResponse } from "@/lib/response/api-response";
import { requireSession } from "@/lib/auth/server/require-session";
import { ZodCreateWorkflow } from "@/lib/zod/workflow.schema";
import { ValidationError } from "@/lib/error/error";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/prisma";

export async function GET() {
  try {
    const session = await requireSession();
    const workflows = await db.workflow.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { runs: true } },
      },
    });
    return NextFlowApiResponse(200, "workflows", workflows);
  } catch (e) {
    return _Error(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const data = ZodCreateWorkflow.safeParse(body);
    if (!data.success) {
      throw new ValidationError(
        data.error.issues[0]?.message || "invalid request data",
      );
    }
    const workflow = await db.workflow.create({
      data: {
        userId: session.user.id,
        name: data.data.name,
        description: data.data.description,
        reactFlowSnapshot: {
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        } as Prisma.InputJsonValue,
      },
    });
    return NextFlowApiResponse(201, "workflow created successfully", workflow);
  } catch (e) {
    return _Error(e);
  }
}
