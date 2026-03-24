import { _Error, NextFlowApiResponse } from "@/lib/response/api-response";
import { requireSession } from "@/lib/auth/server/require-session";
import { ZodImportWorkflow } from "@/lib/zod/workflow.schema";
import { validateRequest } from "@/lib/workflow";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const data = validateRequest(ZodImportWorkflow, body);
    const workflow = await db.workflow.create({
      data: {
        userId: session.user.id,
        name: `${data.name} (imported)`,
        description: data.description ?? null,
        reactFlowSnapshot: data.reactFlowSnapshot as Prisma.InputJsonValue,
      },
    });
    return NextFlowApiResponse(201, "workflow imported successfully", workflow);
  } catch (e) {
    return _Error(e);
  }
}
