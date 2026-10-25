#!/usr/bin/env bash
# Encode generated clips (art/clips/*.mp4) so the page can scrub them with the scroll bar:
# every frame is a keyframe (instant seeking both directions), no audio, 24 fps, plus a smaller WebM for phones.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p art/web
for f in art/clips/*.mp4; do
  b=$(basename "$f" .mp4)
  ffmpeg -y -loglevel error -i "$f" -an -vf "scale=1920:-2,fps=24" -c:v libx264 -preset slow -crf 22 -g 1 -pix_fmt yuv420p -movflags +faststart "art/web/$b.mp4"
  ffmpeg -y -loglevel error -i "$f" -an -vf "scale=960:-2,fps=24" -c:v libvpx-vp9 -crf 36 -b:v 0 -g 1 "art/web/$b-m.webm"
  echo "ok $b"
done
du -sh art/web
