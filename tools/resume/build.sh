#!/usr/bin/env bash
# Build Danilo-Silva-CV.pdf (repo root) from tools/resume/resume.html with headless Chromium.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
out="${1:-$here/../../Danilo-Silva-CV.pdf}"
chromium --headless=new --no-sandbox --disable-gpu --no-pdf-header-footer --virtual-time-budget=20000 \
  --print-to-pdf="$out" "file://$here/resume.html" >/dev/null 2>&1
echo "wrote $out"
