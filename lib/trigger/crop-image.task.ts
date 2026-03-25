import { CropImageOutput, CropImagePayload } from "../utils";
import { uploadToTransloadit } from "./transloadit";
import { task } from "@trigger.dev/sdk/v3";
import ffmpeg from "fluent-ffmpeg";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH || "ffmpeg");
ffmpeg.setFfprobePath(process.env.FFPROBE_PATH || "ffprobe");

export const cropImageTask = task({
  id: "crop-image",
  maxDuration: 60,
  retry: { maxAttempts: 2 },
  run: async (payload: CropImagePayload): Promise<CropImageOutput> => {
    const { imageUrl, xPercent, yPercent, widthPercent, heightPercent } =
      payload;

    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `input-${Date.now()}.jpg`);
    const outputPath = path.join(tmpDir, `cropped-${Date.now()}.jpg`);
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`failed to download image: ${response.statusText}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(inputPath, buffer);
      const { width: imgWidth, height: imgHeight } =
        await getImageDimensions(inputPath);
      const x = Math.round((xPercent / 100) * imgWidth);
      const y = Math.round((yPercent / 100) * imgHeight);
      const w = Math.round((widthPercent / 100) * imgWidth);
      const h = Math.round((heightPercent / 100) * imgHeight);
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .videoFilter(`crop=${w}:${h}:${x}:${y}`)
          .output(outputPath)
          .on("end", () => resolve())
          .on("error", (err) => reject(err))
          .run();
      });
      const outputBuffer = fs.readFileSync(outputPath);
      const uploadedUrl = await uploadToTransloadit(
        outputBuffer,
        path.basename(outputPath),
        "image/jpeg",
      );
      return { imageUrl: uploadedUrl };
    } finally {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
  },
});

function getImageDimensions(
  filePath: string,
): Promise<{ width: number; height: number }> {
  return new Promise((res, rej) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return rej(err);
      const stream = metadata.streams.find((s) => s.codec_type === "video");
      if (!stream?.width || !stream.height) {
        return rej(new Error("could not determine image dimensions"));
      }
      return res({ width: stream.width, height: stream.height });
    });
  });
}
