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
