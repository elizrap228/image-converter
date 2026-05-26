# imgconv — CLI Image Format Converter: Plan

## Overview

A cross-platform CLI tool that converts images in a directory to a specified format. For video files, it extracts a key frame and saves it in the target format.

**Chosen stack: TypeScript / Node.js**

---

## CLI Interface

```
imgconv <directory> <format> [OPTIONS]

Arguments:
  directory    Directory containing files to convert
  format       Target format: png, jpg, webp, tiff, bmp, gif

Options:
  -o, --output-dir PATH    Save outputs here (default: <directory>/output/)
  -r, --recursive          Process subdirectories (default: top-level only)
  --video-frame TEXT       Frame to extract: first | middle | last | HH:MM:SS  [default: middle]
  -q, --quality INT        Quality for lossy formats (JPEG/WEBP), 1–100  [default: 85]
  --overwrite              Overwrite existing output files
  --dry-run                Preview what would be converted, without writing
```

### Supported formats

**Input images:** `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.tiff`, `.tif`, `.webp`, `.ico`
**Input videos:** `.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`, `.wmv`
**Output:** `png`, `jpg`, `webp`, `bmp`, `tiff`, `gif`

---

## Chosen Path: TypeScript / Node.js

### Libraries

| Library | Purpose |
|---|---|
| `sharp` | Image conversion (bundles libvips, no system dep, very fast) |
| `fluent-ffmpeg` | Video frame extraction |
| `ffmpeg-static` | Ships pre-built ffmpeg binaries per platform via npm — no system install needed |
| `commander` | CLI argument parsing |
| TypeScript | Type safety |

### Project structure

```
imgconv/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts        # CLI entry point (commander)
    ├── discovery.ts    # Walk directory, classify files as image/video/skip
    ├── converter.ts    # sharp-based image conversion
    └── extractor.ts    # fluent-ffmpeg video frame extraction
```

### Distribution

`npm install -g imgconv` or `npx imgconv` (zero-install UX).

### Pros

- Node is widely installed; `npx` distribution needs no setup from the user
- `sharp` is very fast for image processing
- Familiar stack for JS/TS developers

### Cons

- `ffmpeg-static` ships its own ffmpeg binary (~70MB), which bloats `node_modules`
- `fluent-ffmpeg` is older with less active maintenance
- More boilerplate than Python: `tsconfig.json`, build step, type declarations
- `sharp` has narrower format support than Pillow for obscure image types

---

## Key Design Decisions

1. **Output location**: Default to `<input-directory>/output/` subfolder. Override with `--output-dir`.
2. **Output naming**: `photo.jpg` → `output/photo.png` (same stem, new extension). Skip if source and target format are identical.
3. **Alpha channel handling**: When converting RGBA images (e.g. PNG with transparency) to JPEG, composite against a white background — JPEG does not support alpha.
4. **Key frame default**: Middle frame of the video. Override with `--video-frame first | last | HH:MM:SS`.
5. **Conflict resolution**: Skip if output file already exists; `--overwrite` to replace.
6. **Recursion**: Off by default; opt in with `--recursive`.

---

## Implementation Phases

1. Project scaffold (`package.json`, `tsconfig.json`, entry point, commander wiring)
2. File discovery module (walk dir, classify image vs. video vs. skip)
3. Image conversion (`converter.ts` using `sharp`, including alpha handling)
4. Video frame extraction (`extractor.ts` using `fluent-ffmpeg` + `ffmpeg-static`)
5. Progress reporting, dry-run mode, error handling (corrupt files, unsupported formats, permission errors)

---

## Alternative Path: Python

Captured here in case a Python implementation is desired in the future.

### Libraries

| Library | Purpose |
|---|---|
| `Pillow` | Image reading, conversion, writing — broader format support than sharp |
| `opencv-python` | Video frame extraction — fully self-contained, no system binary needed |
| `typer` | CLI interface |
| `tqdm` | Progress bar |

### Project structure

```
imgconv/
├── pyproject.toml
└── imgconv/
    ├── __init__.py
    ├── cli.py          # typer app, argument parsing
    ├── discovery.py    # Walk dir, classify files
    ├── converter.py    # Pillow-based image conversion
    └── extractor.py    # OpenCV video frame extraction
```

### Distribution

`pipx install imgconv` (recommended) or `pip install imgconv`.

### Pros

- `opencv-python` handles video natively — installs with pip, works identically on Windows/macOS, no external binary needed
- `Pillow` has broader format support (AVIF, ICO, obscure TIFF variants, etc.)
- Simpler dependency story and less boilerplate than TypeScript
- More mature video library ecosystem

### Cons

- Python may not be installed by default (especially on Windows)
- `pipx` is the right distribution mechanism but less universal than `npm`/`npx`
- Slower CLI startup compared to Node

### When to prefer Python over Node

- Video format support is a priority (OpenCV is more robust than fluent-ffmpeg)
- You need broader image format support (AVIF, obscure TIFF variants, etc.)
- You want to avoid the ~70MB ffmpeg-static binary in node_modules
- The users of the tool are more likely to have Python than Node installed

---

## Comparison Summary

| | Python | Node/TS |
|---|---|---|
| Image quality | Broader format support | Faster, but fewer edge-case formats |
| Video | Excellent, self-contained | Works, but ~70MB heavier (ffmpeg-static) |
| Distribution | `pipx` | `npx` (better UX) |
| Runtime prereq | Python | Node |
| Boilerplate | Lower | Slightly higher |
