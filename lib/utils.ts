import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface WorkflowIdParams {
  params: Promise<{ workflowId: string }>;
}

export interface RunIdParams {
  params: Promise<{ workflowId: string; runId: string }>;
}

export type CropImagePayload = {
  imageUrl: string;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

export type CropImageOutput = {
  imageUrl: string;
};

export type ExtractFramePayload = {
  videoUrl: string;
  timestamp: string;
};

export type ExtractFrameOutput = {
  imageUrl: string;
};

export type LLMTaskPayload = {
  model: string;
  systemPrompt: string | undefined;
  userMessage: string;
  imageUrls: string[];
};

export type LLMTaskOutput = {
  text: string;
};

// export type TaskResult = {
//   output: NodeOutput;
//   triggerTaskId: string;
// };

export type NodeOutput =
  | { type: "TEXT"; text: string }
  | { type: "UPLOAD_IMAGE"; imageUrl: string }
  | { type: "UPLOAD_VIDEO"; videoUrl: string }
  | { type: "RUN_LLM"; text: string }
  | { type: "CROP_IMAGE"; imageUrl: string }
  | { type: "EXTRACT_FRAME"; imageUrl: string };

export type OutputMap = Map<string, NodeOutput>;

export type ResolvedNodeInput =
  | { nodeType: "TEXT"; text: string }
  | { nodeType: "UPLOAD_IMAGE"; fileUrl: string; fileName: string }
  | { nodeType: "UPLOAD_VIDEO"; fileUrl: string; fileName: string }
  | {
      nodeType: "RUN_LLM";
      model: string;
      systemPrompt: string | undefined;
      userMessage: string;
      imageUrls: string[];
    }
  | {
      nodeType: "CROP_IMAGE";
      imageUrl: string;
      xPercent: number;
      yPercent: number;
      widthPercent: number;
      heightPercent: number;
    }
  | { nodeType: "EXTRACT_FRAME"; videoUrl: string; timestamp: string };
