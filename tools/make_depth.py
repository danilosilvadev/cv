#!/usr/bin/env python3
"""Make a depth map for every chosen frame: art/frames/NN-key.png -> art/web/NN-key-d.webp (1280 px wide, 8-bit grey, near = bright).
assets/painted.js reads them to move a real camera through each painting (parallax and dolly) instead of sliding a flat picture.

    ../cv-venv/bin/python tools/make_depth.py [--only gate m1] [--model depth-anything/Depth-Anything-V2-Small-hf]

Needs torch, transformers, pillow, numpy. Depth Anything V2 Small is Apache-2.0 (about 100 MB, no login). Run optimize_frames.sh first or after:
it lists the depth maps it finds in frames.json (key "d")."""
import argparse, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=str(ROOT / "art" / "frames"))
    ap.add_argument("--out", default=str(ROOT / "art" / "web"))
    ap.add_argument("--model", default="depth-anything/Depth-Anything-V2-Small-hf")
    ap.add_argument("--only", nargs="*", help="frame keys, e.g. gate m1")
    ap.add_argument("--width", type=int, default=1280)
    a = ap.parse_args()

    import numpy as np, torch
    from PIL import Image, ImageFilter
    from transformers import pipeline

    pipe = pipeline("depth-estimation", model=a.model, device=0 if torch.cuda.is_available() else -1)
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    for f in sorted(pathlib.Path(a.src).glob("[0-9][0-9]-*.png")):
        if re.search(r"-v\d\.png$", f.name): continue
        key = f.stem.split("-", 1)[1]
        if a.only and key not in a.only: continue
        img = Image.open(f).convert("RGB")
        h = round(a.width * img.height / img.width)
        img = img.resize((a.width, h), Image.LANCZOS)
        d = np.asarray(pipe(img)["depth"].resize((a.width, h), Image.BICUBIC), dtype=np.float32)
        lo, hi = np.percentile(d, 2), np.percentile(d, 98)          # stretch so every frame uses the whole range
        d = np.clip((d - lo) / max(hi - lo, 1e-6), 0, 1)
        # the black voids are empty space: keep them far, whatever the network guessed
        lum = np.asarray(img.convert("L"), dtype=np.float32) / 255
        d = np.where(lum < .035, np.minimum(d, .08), d)
        im = Image.fromarray((d * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(1.6))   # soft edges: less tearing when the camera moves
        p = out / f"{f.stem}-d.webp"
        im.save(p, quality=90)
        print("wrote", p, f"{p.stat().st_size // 1024} KB", flush=True)


if __name__ == "__main__":
    sys.exit(main())
