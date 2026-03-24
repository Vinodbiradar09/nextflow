import { _Error, NextFlowApiResponse } from "@/lib/response/api-response";
import { requireSession } from "@/lib/auth/server/require-session";
import { ZodImportWorkflow } from "@/lib/zod/workflow.schema";
import { ValidationError } from "@/lib/error/error";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const data = ZodImportWorkflow.safeParse(body);
    if (!data.success) {
      const error = data.error.issues
        .map((issue) => {
          const path = issue.path.join(".");
          return `${path}: ${issue.message}`;
        })
        .join("; ");
      throw new ValidationError(error);
    }

    const workflow = await db.workflow.create({
      data: {
        userId: session.user.id,
        name: `${data.data.name} (imported)`,
        description: data.data.description ?? null,
        reactFlowSnapshot: data.data.reactFlowSnapshot as Prisma.InputJsonValue,
      },
    });
    return NextFlowApiResponse(201, "workflow imported successfully", workflow);
  } catch (e) {
    return _Error(e);
  }
}
