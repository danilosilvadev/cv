#!/usr/bin/env bash
# Turn the chosen frames (art/frames/NN-key.png) into web-sized WebP files: 2560 wide for desktop, 1280 for phones.
# Pick your favourite variant first and rename it to NN-key.png (drop the -vN suffix).  Needs ImageMagick.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p art/web
for f in art/frames/[0-9][0-9]-*.png; do
  [[ "$f" == *-v[0-9].png ]] && continue
  b=$(basename "$f" .png)
  magick "$f" -resize 2560x -quality 82 -define webp:method=6 "art/web/$b.webp"
  magick "$f" -resize 1280x -quality 80 -define webp:method=6 "art/web/$b-m.webp"
  echo "ok $b"
done
du -sh art/web
