import * as fs from "fs";
import * as path from "path";

export type FileKind = "image" | "video" | "skip";

export interface DiscoveredFile {
  absPath: string;
  kind: FileKind;
}

const IMAGE_EXTS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".bmp",
  ".tiff", ".tif", ".webp", ".ico",
]);

const VIDEO_EXTS = new Set([
  ".mp4", ".mov", ".avi", ".mkv", ".webm", ".wmv",
]);

function classify(file: string): FileKind {
  const ext = path.extname(file).toLowerCase();
  if (IMAGE_EXTS.has(ext)) return "image";
  if (VIDEO_EXTS.has(ext)) return "video";
  return "skip";
}

export function discover(dir: string, recursive: boolean): DiscoveredFile[] {
  const results: DiscoveredFile[] = [];

  function walk(current: string) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (recursive) walk(full);
      } else if (entry.isFile()) {
        const kind = classify(entry.name);
        if (kind !== "skip") results.push({ absPath: full, kind });
      }
    }
  }

  walk(dir);
  return results;
}
