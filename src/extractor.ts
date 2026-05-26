import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import * as path from "path";
import * as fs from "fs";
import { OutputFormat } from "./converter";

if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

export type VideoFrame = "first" | "middle" | "last" | string;

export interface ExtractOptions {
  frame: VideoFrame;
  quality: number;
  overwrite: boolean;
}

function getDurationSeconds(srcPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(srcPath, (err, meta) => {
      if (err) reject(err);
      else resolve(meta.format.duration ?? 0);
    });
  });
}

function extractAt(
  srcPath: string,
  destPath: string,
  timestamp: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(srcPath)
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(destPath),
        folder: path.dirname(destPath),
        size: "100%",
      })
      .on("end", () => resolve())
      .on("error", reject);
  });
}

export async function extractFrame(
  srcPath: string,
  outputDir: string,
  format: OutputFormat,
  opts: ExtractOptions
): Promise<"converted" | "skipped"> {
  const stem = path.basename(srcPath, path.extname(srcPath));
  const outExt = format === "jpg" ? "jpg" : format;
  const destPath = path.join(outputDir, `${stem}.${outExt}`);

  if (!opts.overwrite && fs.existsSync(destPath)) return "skipped";

  fs.mkdirSync(outputDir, { recursive: true });

  let timestamp: string;

  if (opts.frame === "first") {
    timestamp = "00:00:00";
  } else if (opts.frame === "last" || opts.frame === "middle") {
    const duration = await getDurationSeconds(srcPath);
    const seconds =
      opts.frame === "last" ? duration : duration / 2;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    timestamp = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`;
  } else {
    // user-supplied HH:MM:SS
    timestamp = opts.frame;
  }

  // fluent-ffmpeg screenshots always outputs PNG; convert to target format if needed
  const tmpDest =
    format === "png"
      ? destPath
      : path.join(outputDir, `${stem}__tmp.png`);

  await extractAt(srcPath, tmpDest, timestamp);

  if (format !== "png") {
    const sharp = (await import("sharp")).default;
    let pipeline = sharp(tmpDest);
    if (format === "jpg" || format === "bmp") {
      pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
    }
    switch (format) {
      case "jpg":   pipeline = pipeline.jpeg({ quality: opts.quality }); break;
      case "webp":  pipeline = pipeline.webp({ quality: opts.quality }); break;
      case "gif":   pipeline = pipeline.gif(); break;
      case "tiff":  pipeline = pipeline.tiff(); break;
      case "bmp":   pipeline = pipeline.toFormat("bmp" as any); break;
    }
    await pipeline.toFile(destPath);
    fs.unlinkSync(tmpDest);
  }

  return "converted";
}
