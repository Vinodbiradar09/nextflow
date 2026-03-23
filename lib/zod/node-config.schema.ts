import { z } from "zod";

export const ZodTextNodeConfig = z.object({
  text: z.string().min(1, "text can't be empty"),
});

export const ZodUploadImageNodeConfig = z.object({
  fileUrl: z.string().url("invalid file URL"),
  fileName: z.string().min(1, "file name is required"),
});

export const ZodUploadVideoNodeConfig = z.object({
  fileUrl: z.string().url("invalid file URL"),
  fileName: z.string().min(1, "file name is required"),
});

export const ZodRunLLMNodeConfig = z.object({
  model: z.string().min(1, "model is required"),
  systemPrompt: z.string().optional(),
  userMessage: z.string().min(1, "user message is required"),
  imageUrls: z.array(z.string().url()).optional(),
});

export const ZodCropImageNodeConfig = z.object({
  imageUrl: z.string().url("invalid image URL"),
  xPercent: z.number().min(0).max(100).default(0),
  yPercent: z.number().min(0).max(100).default(0),
  widthPercent: z.number().min(1).max(100).default(100),
  heightPercent: z.number().min(1).max(100).default(100),
});

export const ZodExtractFrameNodeConfig = z.object({
  videoUrl: z.string().url("invalid video URL"),
  // seconds ("30") or percentage ("50%")
  timestamp: z.string().default("0"),
});

export const ZodNodeConfig = z.discriminatedUnion("type", [
  z.object({ type: z.literal("TEXT"), config: ZodTextNodeConfig }),
  z.object({
    type: z.literal("UPLOAD_IMAGE"),
    config: ZodUploadImageNodeConfig,
  }),
  z.object({
    type: z.literal("UPLOAD_VIDEO"),
    config: ZodUploadVideoNodeConfig,
  }),
  z.object({ type: z.literal("RUN_LLM"), config: ZodRunLLMNodeConfig }),
  z.object({ type: z.literal("CROP_IMAGE"), config: ZodCropImageNodeConfig }),
  z.object({
    type: z.literal("EXTRACT_FRAME"),
    config: ZodExtractFrameNodeConfig,
  }),
]);

export type TZodTextNodeConfig = z.infer<typeof ZodTextNodeConfig>;
export type TZodUploadImageNodeConfig = z.infer<
  typeof ZodUploadImageNodeConfig
>;
export type TZodUploadVideoNodeConfig = z.infer<
  typeof ZodUploadVideoNodeConfig
>;
export type TZodRunLLMNodeConfig = z.infer<typeof ZodRunLLMNodeConfig>;
export type TZodCropImageNodeConfig = z.infer<typeof ZodCropImageNodeConfig>;
export type TZodExtractFrameNodeConfig = z.infer<
  typeof ZodExtractFrameNodeConfig
>;
export type TZodNodeConfig = z.infer<typeof ZodNodeConfig>;
