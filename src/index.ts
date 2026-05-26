#!/usr/bin/env node

import { Command } from "commander";
import * as path from "path";
import * as fs from "fs";
import { discover } from "./discovery";
import { convertImage, OutputFormat } from "./converter";
import { extractFrame, VideoFrame } from "./extractor";

const VALID_FORMATS = new Set<OutputFormat>(["png", "jpg", "webp", "bmp", "tiff", "gif"]);

const program = new Command();

program
  .name("imgconv")
  .description("Convert images (and extract video frames) in a directory")
  .argument("<format>", "Target format: png, jpg, webp, tiff, bmp, gif")
  .option("-d, --dir <path>", "Directory to scan", process.cwd())
  .option("-o, --output-dir <path>", "Output directory (default: <dir>/output/)")
  .option("-r, --recursive", "Process subdirectories", false)
  .option("--video-frame <spec>", "Frame to extract: first | middle | last | HH:MM:SS", "middle")
  .option("-q, --quality <n>", "Quality for JPEG/WEBP (1–100)", "85")
  .option("--overwrite", "Overwrite existing output files", false)
  .option("--dry-run", "Preview what would be converted without writing", false)
  .action(async (formatArg: string, opts) => {
    const format = formatArg.toLowerCase() as OutputFormat;
    if (!VALID_FORMATS.has(format)) {
      console.error(`Error: unsupported format "${format}". Choose from: ${[...VALID_FORMATS].join(", ")}`);
      process.exit(1);
    }

    const dir = path.resolve(opts.dir);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      console.error(`Error: directory not found: ${dir}`);
      process.exit(1);
    }

    const outputDir = opts.outputDir
      ? path.resolve(opts.outputDir)
      : path.join(dir, "output");

    const quality = parseInt(opts.quality, 10);
    if (isNaN(quality) || quality < 1 || quality > 100) {
      console.error("Error: --quality must be an integer between 1 and 100");
      process.exit(1);
    }

    const videoFrame: VideoFrame = opts.videoFrame;
    const recursive: boolean = opts.recursive;
    const overwrite: boolean = opts.overwrite;
    const dryRun: boolean = opts.dryRun;

    const files = discover(dir, recursive);

    if (files.length === 0) {
      console.log("No image or video files found.");
      return;
    }

    let converted = 0;
    let skipped = 0;
    let sameFormat = 0;
    let errors = 0;

    for (const file of files) {
      const rel = path.relative(dir, file.absPath);

      if (dryRun) {
        console.log(`[dry-run] would convert: ${rel}`);
        continue;
      }

      try {
        if (file.kind === "image") {
          const result = await convertImage(file.absPath, outputDir, format, { quality, overwrite });
          if (result === "converted") {
            console.log(`  converted: ${rel}`);
            converted++;
          } else if (result === "skipped") {
            console.log(`  skipped (exists): ${rel}`);
            skipped++;
          } else {
            console.log(`  skipped (same format): ${rel}`);
            sameFormat++;
          }
        } else {
          const result = await extractFrame(file.absPath, outputDir, format, {
            frame: videoFrame,
            quality,
            overwrite,
          });
          if (result === "converted") {
            console.log(`  extracted: ${rel}`);
            converted++;
          } else {
            console.log(`  skipped (exists): ${rel}`);
            skipped++;
          }
        }
      } catch (err: any) {
        console.error(`  error: ${rel} — ${err.message}`);
        errors++;
      }
    }

    if (!dryRun) {
      console.log(
        `\nDone. ${converted} converted, ${skipped} skipped, ${sameFormat} same-format, ${errors} errors.`
      );
    }
  });

program.parse();
