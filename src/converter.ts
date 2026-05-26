import sharp from "sharp";
import heicConvert from "heic-convert";
import * as path from "path";
import * as fs from "fs";

export type OutputFormat = "png" | "jpg" | "webp" | "bmp" | "tiff" | "gif";

const HEIC_EXTS = new Set([".heic", ".heif"]);

export interface ConvertOptions {
  quality: number;
  overwrite: boolean;
}

async function toSharpInput(srcPath: string): Promise<string | Buffer> {
  if (!HEIC_EXTS.has(path.extname(srcPath).toLowerCase())) return srcPath;
  const raw = await heicConvert({
    buffer: fs.readFileSync(srcPath),
    format: "PNG",
  });
  return Buffer.from(raw);
}

export async function convertImage(
  srcPath: string,
  outputDir: string,
  format: OutputFormat,
  opts: ConvertOptions
): Promise<"converted" | "skipped" | "same-format"> {
  const srcExt = path.extname(srcPath).toLowerCase().replace(".", "");
  const normalizedSrc = srcExt === "jpeg" ? "jpg" : srcExt;
  const normalizedTarget = format === "jpg" ? "jpg" : format;

  if (normalizedSrc === normalizedTarget) return "same-format";

  const stem = path.basename(srcPath, path.extname(srcPath));
  const outExt = format === "jpg" ? "jpg" : format;
  const destPath = path.join(outputDir, `${stem}.${outExt}`);

  if (!opts.overwrite && fs.existsSync(destPath)) return "skipped";

  fs.mkdirSync(outputDir, { recursive: true });

  let pipeline = sharp(await toSharpInput(srcPath));

  // JPEG and BMP don't support alpha — flatten against white
  if (format === "jpg" || format === "bmp") {
    pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
  }

  switch (format) {
    case "jpg":
      pipeline = pipeline.jpeg({ quality: opts.quality });
      break;
    case "webp":
      pipeline = pipeline.webp({ quality: opts.quality });
      break;
    case "png":
      pipeline = pipeline.png();
      break;
    case "gif":
      pipeline = pipeline.gif();
      break;
    case "tiff":
      pipeline = pipeline.tiff();
      break;
    case "bmp":
      // sharp doesn't have a native .bmp() output — save as raw png then
      // write BMP via toBuffer workaround; simplest cross-platform path is
      // to output as PNG and rename, but that changes format. Instead we
      // use the format option directly.
      pipeline = pipeline.toFormat("bmp" as any);
      break;
  }

  await pipeline.toFile(destPath);
  return "converted";
}
