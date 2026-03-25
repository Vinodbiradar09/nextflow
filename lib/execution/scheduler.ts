import { buildDAG, filterDAGToScope, buildExecutionWaves } from "./dag";
import { extractFrameTask } from "@/lib/trigger/extract-frame.task";
import { cropImageTask } from "@/lib/trigger/crop-image.task";
import { WorkflowNode, WorkflowEdge } from "@prisma/client";
import { resolveNodeInputs } from "./resolve-inputs";
import { runLLMTask } from "@/lib/trigger/llm.task";
import { OutputMap, NodeOutput } from "../utils";
import { runs } from "@trigger.dev/sdk/v3";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/prisma";

export type SchedulerPayload = {
  workflowRunId: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  // rfNodeIds that are in scope for this run
  scopeNodeIds: string[];
};

type TaskResult = {
  output: NodeOutput;
  triggerTaskId: string;
};

export async function scheduleWorkflowRun(
  payload: SchedulerPayload,
): Promise<void> {
  const { workflowRunId, nodes, edges, scopeNodeIds } = payload;

  await db.workflowRun.update({
    where: { id: workflowRunId },
    data: { status: "RUNNING" },
  });

  try {
    const fullGraph = buildDAG(nodes, edges);
    const scopedGraph = filterDAGToScope(fullGraph, scopeNodeIds);
    const waves = buildExecutionWaves(scopedGraph);
    const outputMap: OutputMap = new Map();

    for (const wave of waves) {
      await Promise.all(
        wave.map((rfNodeId) =>
          executeNode(rfNodeId, nodes, edges, workflowRunId, outputMap),
        ),
      );
    }

    await finalizeWorkflowRun(workflowRunId);
  } catch (error) {
    await db.workflowRun.update({
      where: { id: workflowRunId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

async function executeNode(
  rfNodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  workflowRunId: string,
  outputMap: OutputMap,
): Promise<void> {
  const node = nodes.find((n) => n.rfNodeId === rfNodeId);
  if (!node) return;

  const nodeExecution = await db.nodeExecution.findFirst({
    where: { workflowRunId, rfNodeId },
  });
  if (!nodeExecution) return;

  const startedAt = new Date();

  await db.nodeExecution.update({
    where: { id: nodeExecution.id },
    data: { status: "RUNNING", startedAt },
  });

  try {
    const resolvedInputs = resolveNodeInputs(node, edges, outputMap);

    const { output, triggerTaskId } = await dispatchToTask(resolvedInputs);

    // store triggerTaskId immediately so cancel route can find it
    await db.nodeExecution.update({
      where: { id: nodeExecution.id },
      data: { triggerTaskId },
    });

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    await db.nodeExecution.update({
      where: { id: nodeExecution.id },
      data: {
        status: "SUCCESS",
        inputs: resolvedInputs as unknown as Prisma.InputJsonValue,
        outputs: output as unknown as Prisma.InputJsonValue,
        completedAt,
        durationMs,
      },
    });

    outputMap.set(rfNodeId, output);
  } catch (error) {
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    await db.nodeExecution.update({
      where: { id: nodeExecution.id },
      data: {
        status: "FAILED",
        errorMessage:
          error instanceof Error ? error.message : "Unknown error occurred.",
        errorStack: error instanceof Error ? (error.stack ?? null) : null,
        completedAt,
        durationMs,
      },
    });
  }
}

async function dispatchToTask(
  resolvedInputs: ReturnType<typeof resolveNodeInputs>,
): Promise<TaskResult> {
  switch (resolvedInputs.nodeType) {
    case "TEXT": {
      return {
        output: { type: "TEXT", text: resolvedInputs.text },
        triggerTaskId: "no-task",
      };
    }

    case "UPLOAD_IMAGE": {
      return {
        output: { type: "UPLOAD_IMAGE", imageUrl: resolvedInputs.fileUrl },
        triggerTaskId: "no-task",
      };
    }

    case "UPLOAD_VIDEO": {
      return {
        output: { type: "UPLOAD_VIDEO", videoUrl: resolvedInputs.fileUrl },
        triggerTaskId: "no-task",
      };
    }

    case "RUN_LLM": {
      // .trigger() returns handle with ID immediately
      const handle = await runLLMTask.trigger({
        model: resolvedInputs.model,
        systemPrompt: resolvedInputs.systemPrompt,
        userMessage: resolvedInputs.userMessage,
        imageUrls: resolvedInputs.imageUrls,
      });

      // poll until complete v4 correct API
      const result = await runs.poll(handle.id, { pollIntervalMs: 1000 });
      if (result.status !== "COMPLETED") {
        throw new Error(`LLM task failed with status: ${result.status}`);
      }

      return {
        output: {
          type: "RUN_LLM",
          text: (result.output as { text: string }).text,
        },
        triggerTaskId: handle.id,
      };
    }

    case "CROP_IMAGE": {
      const handle = await cropImageTask.trigger({
        imageUrl: resolvedInputs.imageUrl,
        xPercent: resolvedInputs.xPercent,
        yPercent: resolvedInputs.yPercent,
        widthPercent: resolvedInputs.widthPercent,
        heightPercent: resolvedInputs.heightPercent,
      });

      const result = await runs.poll(handle.id, { pollIntervalMs: 1000 });
      if (result.status !== "COMPLETED") {
        throw new Error(`Crop image task failed with status: ${result.status}`);
      }

      return {
        output: {
          type: "CROP_IMAGE",
          imageUrl: (result.output as { imageUrl: string }).imageUrl,
        },
        triggerTaskId: handle.id,
      };
    }

    case "EXTRACT_FRAME": {
      const handle = await extractFrameTask.trigger({
        videoUrl: resolvedInputs.videoUrl,
        timestamp: resolvedInputs.timestamp,
      });

      const result = await runs.poll(handle.id, { pollIntervalMs: 1000 });
      if (result.status !== "COMPLETED") {
        throw new Error(
          `Extract frame task failed with status: ${result.status}`,
        );
      }

      return {
        output: {
          type: "EXTRACT_FRAME",
          imageUrl: (result.output as { imageUrl: string }).imageUrl,
        },
        triggerTaskId: handle.id,
      };
    }
  }
}

async function finalizeWorkflowRun(workflowRunId: string): Promise<void> {
  const allExecutions = await db.nodeExecution.findMany({
    where: { workflowRunId },
    select: { status: true },
  });

  const hasFailed = allExecutions.some((e) => e.status === "FAILED");
  const hasSuccess = allExecutions.some((e) => e.status === "SUCCESS");

  const finalStatus =
    hasFailed && hasSuccess
      ? "PARTIAL_SUCCESS"
      : hasFailed
        ? "FAILED"
        : "SUCCESS";

  await db.workflowRun.update({
    where: { id: workflowRunId },
    data: {
      status: finalStatus,
      completedAt: new Date(),
    },
  });
}
