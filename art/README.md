# Painted frames: how to make them on the GPU machine

The site is a walk through the Divine Comedy. Right now the worlds are drawn live in 3D (`assets/descent.js`). The goal is to replace them with real paintings in the style of the reference portrait, one frame per stop, plus a few video clips for the big camera moves.

```
git clone https://github.com/danilosilvadev/cv.git && cd cv && git checkout painted-walk
```

1. **Frames (21).** Prompts are in `PROMPTS.md` and `prompts.json`.
   - Quick baseline on a GPU: `python tools/generate_frames.py --variants 4` (FLUX.1-schnell by default; `--model black-forest-labs/FLUX.1-dev` or an SDXL model for more quality). `--list` prints the prompts without a GPU.
   - Best match to the portrait: ComfyUI or Midjourney with `screenshot-2026-10-25_14-04-46.png` as a **style reference**, and one character sheet for Dante and Virgil reused as a character reference.
   - Pick one variant per stop and save it as `art/frames/NN-key.png` (no `-vN`), at 2560x1440 or larger.
2. **Clips (optional, "both" motion).** For the big moves (walk to the gate, the turn, the zoom out to the rose) generate 2-4 s clips from two neighbouring frames (first frame + last frame) with an image-to-video model (Wan 2.2 first/last frame in ComfyUI, Runway, Kling, Luma). Save as `art/clips/<from>-<to>.mp4`, e.g. `gate-inf1.mp4`.
3. **Optimise for the web.**
   - `tools/optimize_frames.sh` writes WebP (2560 px and 1280 px for phones) to `art/web/`.
   - `tools/encode_clips.sh` re-encodes clips so every frame is a keyframe, which makes scrubbing with the scroll bar smooth, and adds a small WebM for phones.
4. **Commit `art/web/`** (not the raw PNGs: `art/frames/*.png` and `art/clips/*.mp4` are ignored on purpose) and push.

Then the page switches each stop from the live 3D world to the painting: stills move with depth parallax and crossfades, clips are scrubbed by scroll. Until a frame exists, that stop keeps using the 3D world.
