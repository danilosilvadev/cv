#!/usr/bin/env bash
# Turn the chosen frames (art/frames/NN-key.png) into web-sized WebP files: 2560 wide for desktop, 1280 for phones,
# plus art/web/frames.json, which tells the page which stops have a painting (assets/painted.js reads it).
# Pick your favourite variant first and copy it to NN-key.png (drop the -vN suffix).  Needs ImageMagick and python3.
# SRC and OUT override the folders, e.g. to try a set without touching the site:  SRC=/tmp/picks OUT=/tmp/web tools/optimize_frames.sh
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=${SRC:-art/frames}; OUT=${OUT:-art/web}
mkdir -p "$OUT"
for f in "$SRC"/[0-9][0-9]-*.png; do
  [[ "$f" == *-v[0-9].png ]] && continue
  b=$(basename "$f" .png)
  magick "$f" -resize 2560x -quality 82 -define webp:method=6 "$OUT/$b.webp"
  magick "$f" -resize 1280x -quality 80 -define webp:method=6 "$OUT/$b-m.webp"
  echo "ok $b"
done
python3 - "$OUT" <<'PY'
import json, pathlib, re, sys
out = pathlib.Path(sys.argv[1])
frames = {}
for p in sorted(out.glob("[0-9][0-9]-*.webp")):
    m = re.fullmatch(r"(\d\d-(.+?))(-m)?\.webp", p.name)
    if m and not m.group(3): frames[m.group(2)] = m.group(1)
(out / "frames.json").write_text(json.dumps({"v": 1, "frames": frames}, indent=1) + "\n")
print(len(frames), "frames in", out / "frames.json")
PY
du -sh "$OUT"
