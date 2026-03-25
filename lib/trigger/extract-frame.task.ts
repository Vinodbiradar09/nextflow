import { uploadToTransloadit } from "./transloadit";
import { task } from "@trigger.dev/sdk/v3";
import ffmpeg from "fluent-ffmpeg";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH || "ffmpeg");
ffmpeg.setFfprobePath(process.env.FFPROBE_PATH || "ffprobe");

type ExtractFramePayload = {
  videoUrl: string;
  timestamp: string;
};

type ExtractFrameOutput = {
  imageUrl: string;
};

export const extractFrameTask = task({
  id: "extract-frame",
  maxDuration: 120,
  retry: { maxAttempts: 2 },
  run: async (payload: ExtractFramePayload): Promise<ExtractFrameOutput> => {
    const { videoUrl, timestamp } = payload;

    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `video-${Date.now()}.mp4`);
    const outputPath = path.join(tmpDir, `frame-${Date.now()}.jpg`);

    try {
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(inputPath, buffer);

      const resolvedTimestamp = await resolveTimestamp(inputPath, timestamp);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .seekInput(resolvedTimestamp)
          .frames(1)
          .output(outputPath)
          .on("end", () => resolve())
          .on("error", (err) => reject(err))
          .run();
      });

      if (!fs.existsSync(outputPath)) {
        throw new Error("FFmpeg did not produce an output frame.");
      }

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

async function resolveTimestamp(
  videoPath: string,
  timestamp: string,
): Promise<number> {
  const isPercentage = timestamp.trim().endsWith("%");
  if (!isPercentage) {
    const seconds = parseFloat(timestamp);
    return isNaN(seconds) ? 0 : seconds;
  }
  const duration = await getVideoDuration(videoPath);
  const percentage = parseFloat(timestamp.replace("%", "")) / 100;
  return Math.floor(duration * percentage);
}

function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata.format.duration;
      if (!duration) {
        return reject(new Error("could not determine video duration."));
      }
      resolve(duration);
    });
  });
}
