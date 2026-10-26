#!/usr/bin/env bash
# The whole "descent" pipeline: contour map (once), Blender scene + glTF + render, glow, film and frame sequence.
#   BLENDER=/path/to/blender tools/blender/render_all.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
BLENDER=${BLENDER:-blender}; export CV_ROOT=$PWD
[ -f lab/assets/contours.png ] || ../cv-venv/bin/python tools/blender/make_contours.py
rm -rf lab/render/frames lab/render/seq; mkdir -p lab/render/seq
STAGE=all "$BLENDER" -b --python tools/blender/build_scene.py | grep -i "exported\|render engine\|rendered\|error" || true
# Eevee draws no glow, so add it here: two blurs of the bright parts, screened over the frame, then a soft vignette
ffmpeg -y -loglevel error -framerate 24 -i lab/render/frames/f_%04d.png -filter_complex "[0:v]format=gbrp,split=3[o][a][b];[a]curves=all='0/0 0.30/0 0.55/0.45 1/1',gblur=sigma=7[g1];[b]curves=all='0/0 0.30/0 0.55/0.45 1/1',gblur=sigma=26[g2];[o][g1]blend=all_mode=screen:all_opacity=0.85[t];[t][g2]blend=all_mode=screen:all_opacity=0.7,vignette=PI/5.5,format=yuv420p[out]" -map "[out]" -c:v libx264 -g 1 -crf 24 -preset slow -pix_fmt yuv420p -movflags +faststart -an lab/render/descent.mp4
ffmpeg -y -loglevel error -i lab/render/descent.mp4 -c:v libwebp -quality 80 -compression_level 5 lab/render/seq/%04d.webp
du -sh lab/render/descent.mp4 lab/render/seq lab/assets/descent.glb
