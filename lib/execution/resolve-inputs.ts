import { WorkflowEdge, WorkflowNode } from "@prisma/client";
import { ResolvedNodeInput } from "../utils";
import { NodeType } from "@prisma/client";
import { OutputMap } from "../utils";

export function resolveNodeInputs(
  node: WorkflowNode,
  edges: WorkflowEdge[],
  outputMap: OutputMap,
): ResolvedNodeInput {
  // edges where this node is the target (incoming connections)
  const incomingEdges = edges.filter(
    (edge) => edge.targetRfNodeId === node.rfNodeId,
  );

  const config = node.config as Record<string, unknown>;

  switch (node.type) {
    case NodeType.TEXT: {
      return {
        nodeType: "TEXT",
        text: (config.text as string) ?? "",
      };
    }

    case NodeType.UPLOAD_IMAGE: {
      return {
        nodeType: "UPLOAD_IMAGE",
        fileUrl: (config.fileUrl as string) ?? "",
        fileName: (config.fileName as string) ?? "",
      };
    }

    case NodeType.UPLOAD_VIDEO: {
      return {
        nodeType: "UPLOAD_VIDEO",
        fileUrl: (config.fileUrl as string) ?? "",
        fileName: (config.fileName as string) ?? "",
      };
    }

    case NodeType.RUN_LLM: {
      let systemPrompt: string | undefined = config.systemPrompt as
        | string
        | undefined;
      let userMessage: string = (config.userMessage as string) ?? "";
      const imageUrls: string[] = [];

      for (const edge of incomingEdges) {
        const upstreamOutput = outputMap.get(edge.sourceRfNodeId);
        if (!upstreamOutput) continue;

        switch (edge.targetHandle) {
          case "system_prompt": {
            // only text outputs can connect to system_prompt
            if (
              upstreamOutput.type === "TEXT" ||
              upstreamOutput.type === "RUN_LLM"
            ) {
              systemPrompt = upstreamOutput.text;
            }
            break;
          }
          case "user_message": {
            // only text outputs can connect to user_message
            if (
              upstreamOutput.type === "TEXT" ||
              upstreamOutput.type === "RUN_LLM"
            ) {
              userMessage = upstreamOutput.text;
            }
            break;
          }
          case "images": {
            // image outputs connect to images handle supports multiple
            if (
              upstreamOutput.type === "UPLOAD_IMAGE" ||
              upstreamOutput.type === "CROP_IMAGE" ||
              upstreamOutput.type === "EXTRACT_FRAME"
            ) {
              imageUrls.push(upstreamOutput.imageUrl);
            }
            break;
          }
        }
      }

      return {
        nodeType: "RUN_LLM",
        model: (config.model as string) ?? "gemini-1.5-flash",
        systemPrompt,
        userMessage,
        imageUrls,
      };
    }

    case NodeType.CROP_IMAGE: {
      let imageUrl: string = (config.imageUrl as string) ?? "";
      let xPercent: number = (config.xPercent as number) ?? 0;
      let yPercent: number = (config.yPercent as number) ?? 0;
      let widthPercent: number = (config.widthPercent as number) ?? 100;
      let heightPercent: number = (config.heightPercent as number) ?? 100;

      for (const edge of incomingEdges) {
        const upstreamOutput = outputMap.get(edge.sourceRfNodeId);
        if (!upstreamOutput) continue;

        switch (edge.targetHandle) {
          case "image_url": {
            if (
              upstreamOutput.type === "UPLOAD_IMAGE" ||
              upstreamOutput.type === "CROP_IMAGE" ||
              upstreamOutput.type === "EXTRACT_FRAME"
            ) {
              imageUrl = upstreamOutput.imageUrl;
            }
            break;
          }
          case "x_percent": {
            if (
              upstreamOutput.type === "TEXT" ||
              upstreamOutput.type === "RUN_LLM"
            ) {
              xPercent = parseFloat(upstreamOutput.text) || 0;
            }
            break;
          }
          case "y_percent": {
            if (
              upstreamOutput.type === "TEXT" ||
              upstreamOutput.type === "RUN_LLM"
            ) {
              yPercent = parseFloat(upstreamOutput.text) || 0;
            }
            break;
          }
          case "width_percent": {
            if (
              upstreamOutput.type === "TEXT" ||
              upstreamOutput.type === "RUN_LLM"
            ) {
              widthPercent = parseFloat(upstreamOutput.text) || 100;
            }
            break;
          }
          case "height_percent": {
            if (
              upstreamOutput.type === "TEXT" ||
              upstreamOutput.type === "RUN_LLM"
            ) {
              heightPercent = parseFloat(upstreamOutput.text) || 100;
            }
            break;
          }
        }
      }

      return {
        nodeType: "CROP_IMAGE",
        imageUrl,
        xPercent,
        yPercent,
        widthPercent,
        heightPercent,
      };
    }

    case NodeType.EXTRACT_FRAME: {
      let videoUrl: string = (config.videoUrl as string) ?? "";
      let timestamp: string = (config.timestamp as string) ?? "0";

      for (const edge of incomingEdges) {
        const upstreamOutput = outputMap.get(edge.sourceRfNodeId);
        if (!upstreamOutput) continue;

        switch (edge.targetHandle) {
          case "video_url": {
            if (upstreamOutput.type === "UPLOAD_VIDEO") {
              videoUrl = upstreamOutput.videoUrl;
            }
            break;
          }
          case "timestamp": {
            if (
              upstreamOutput.type === "TEXT" ||
              upstreamOutput.type === "RUN_LLM"
            ) {
              timestamp = upstreamOutput.text;
            }
            break;
          }
        }
      }

      return {
        nodeType: "EXTRACT_FRAME",
        videoUrl,
        timestamp,
      };
    }
  }
}
