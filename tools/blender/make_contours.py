#!/usr/bin/env python3
"""Make the assets both Blender routes share: lab/assets/contours.png (the glowing contour map of the loss landscape, used as the terrain's
emission texture) and lab/assets/scene.json (the gradient-descent run, the failed runs and the minimum).

    ../../../cv-venv/bin/python tools/blender/make_contours.py        (needs numpy and pillow)"""
import json, pathlib, sys
import numpy as np
from PIL import Image
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import descent_model as m

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "lab" / "assets"; OUT.mkdir(parents=True, exist_ok=True)
W, Hpx = 4096, 3904                                   # texels: about 0.11 world units each
STEP = 3.2

xs = m.X0 + (np.arange(W) + .5) / W * (m.X1 - m.X0)
img = np.zeros((Hpx, W, 3), np.uint8)
lo, mi, hi = np.array([1., .72, .28]), np.array([.10, .85, .80]), np.array([.50, .32, .98])
for r0 in range(0, Hpx, 256):                          # in bands, to keep the memory small
    r1 = min(Hpx, r0 + 256)
    zs = m.Z0 + (np.arange(r0, r1) + .5) / Hpx * (m.Z1 - m.Z0)
    X, Z = np.meshgrid(xs, zs)
    h = m.H(X, Z)
    e = .5
    gx, gz = (m.H(X + e, Z) - m.H(X - e, Z)) / (2 * e), (m.H(X, Z + e) - m.H(X, Z - e)) / (2 * e)
    slope = np.hypot(gx, gz)
    w = np.clip(.26 * slope / STEP, .02, .26)
    a = np.abs(h / STEP - np.floor(h / STEP) - .5)
    line = 1 - np.clip((a - w * .5) / (w * .5), 0, 1) ** 2 * (3 - 2 * np.clip((a - w * .5) / (w * .5), 0, 1))
    a5 = np.abs(h / (STEP * 5) - np.floor(h / (STEP * 5)) - .5)
    t5 = np.clip((a5 - w * .12) / (w * .14), 0, 1); idx = 1 - t5 * t5 * (3 - 2 * t5)
    t = np.clip((h + 54) / 82, 0, 1)[..., None]
    col = np.where(t < .5, lo + (mi - lo) * (t * 2), mi + (hi - mi) * ((t - .5) * 2))
    basin = np.exp(-((X - m.GX) ** 2 + (Z - m.GZ) ** 2) / (2 * 28 * 28))[..., None]
    base = np.array([.010, .012, .035]) + np.array([.05, .025, .09]) * (1 - t) * .35 + np.array([1., .55, .15]) * basin * .22
    lines = np.clip(col * (line * (.62 + idx * .95))[..., None], 0, 1) ** (1 / 2.2)     # the glowing lines carry their colour; the dark ground stays dark
    img[r0:r1] = (np.clip(base * 1.0 + lines, 0, 1) * 255).astype(np.uint8)
Image.fromarray(img, "RGB").save(OUT / "contours.png", optimize=True)

main, length = m.main_run(700)
scene = {
    "footprint": [m.X0, m.X1, m.Z0, m.Z1], "min": [m.GX, float(m.H(m.GX, m.GZ)), m.GZ], "length": length,
    "main": np.round(main, 3).tolist(), "runs": [np.round(r, 3).tolist() for r in m.other_runs(360)],
}
(OUT / "scene.json").write_text(json.dumps(scene, separators=(",", ":")))
print("wrote", OUT / "contours.png", (OUT / "contours.png").stat().st_size // 1024, "KB;", OUT / "scene.json", (OUT / "scene.json").stat().st_size // 1024, "KB")
