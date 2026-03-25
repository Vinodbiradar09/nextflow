import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { LLMTaskOutput, LLMTaskPayload } from "../utils";
import { task } from "@trigger.dev/sdk/v3";

export const runLLMTask = task({
  id: "run-llm",
  maxDuration: 120,
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: LLMTaskPayload): Promise<LLMTaskOutput> => {
    const { model, systemPrompt, userMessage, imageUrls } = payload;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const geminiModel = genAI.getGenerativeModel({
      model,
      ...(systemPrompt && {
        systemInstruction: systemPrompt,
      }),
    });
    // build the parts array text first, then images
    const parts: Part[] = [{ text: userMessage }];
    // fetch each image and convert to base64 for gemini vision
    for (const imageUrl of imageUrls) {
      try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          console.warn(`[run-llm] failed to fetch image: ${imageUrl}`);
          continue;
        }
        const contentType =
          response.headers.get("content-type") ?? "image/jpeg";
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        parts.push({
          inlineData: {
            mimeType: contentType,
            data: base64,
          },
        });
      } catch (e) {
        console.warn(`[run-llm] error processing image ${imageUrl}:`, e);
        continue;
      }
    }

    const result = await geminiModel.generateContent(parts);
    const text = result.response.text();
    if (!text) {
      throw new Error("gemini returned an empty response.");
    }
    return { text };
  },
});
