# imgconv

CLI tool to convert images to a target format. For video files, extracts a key frame and saves it in the target format.

## Install

```bash
npm install -g imgconv
```

Or run without installing:

```bash
npx imgconv <format> [options]
```

## Usage

```
imgconv <format> [options]

Arguments:
  format                   Target format: png, jpg, webp, tiff, bmp, gif

Options:
  -d, --dir <path>         Directory to scan (default: current directory)
  -o, --output-dir <path>  Output directory (default: <dir>/output/)
  -r, --recursive          Process subdirectories (default: false)
  --video-frame <spec>     Frame to extract: first | middle | last | HH:MM:SS (default: middle)
  -q, --quality <n>        Quality for JPEG/WEBP, 1–100 (default: 85)
  --overwrite              Overwrite existing output files
  --dry-run                Preview what would be converted without writing
  -h, --help               Show help
```

## Examples

Convert all images in the current directory to PNG:
```bash
imgconv png
```

Convert all images in `./photos` to JPEG at quality 90:
```bash
imgconv jpg -d ./photos -q 90
```

Recursively convert and save outputs to a custom directory:
```bash
imgconv webp -d ./photos -r -o ./photos/webp
```

Extract the first frame from every video in a directory:
```bash
imgconv png -d ./videos --video-frame first
```

Preview what would be converted without writing any files:
```bash
imgconv png --dry-run
```

## Supported formats

| Type | Extensions |
|---|---|
| Input images | `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.tiff`, `.tif`, `.webp`, `.ico` |
| Input videos | `.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`, `.wmv` |
| Output | `png`, `jpg`, `webp`, `bmp`, `tiff`, `gif` |

## Notes

- Output files are written to `<dir>/output/` by default. Override with `--output-dir`.
- Files are skipped if the output already exists. Use `--overwrite` to replace them.
- Files are skipped if the source and target format are the same.
- Images with transparency (e.g. PNG with alpha) are flattened against a white background when converting to JPEG or BMP, which do not support alpha.
- For videos, the middle frame is extracted by default. Use `--video-frame` to choose `first`, `last`, or a specific timecode (`HH:MM:SS`).
