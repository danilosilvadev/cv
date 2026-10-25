# The painted frames: how they were made, and how to redo them

The site is a walk through the Divine Comedy, one painting per stop (21 frames, keys = the `data-cam` values in `index.html`). The shipped set is in `art/web/` and was generated locally with FLUX.2 [klein] 4B (Apache-2.0, no login) on a 12 GB RTX 3060.

```
git clone https://github.com/danilosilvadev/cv.git && cd cv && git checkout painted-walk
python -m venv ../cv-venv && ../cv-venv/bin/pip install torch torchvision diffusers transformers accelerate sentencepiece safetensors protobuf
```

1. **Generate.** Prompts live in `art/prompts.json` (a `lead`, a `style` block, and one prompt per frame; `PROMPTS.md` is the same text for reading).
   `../cv-venv/bin/python tools/generate_frames.py --model black-forest-labs/FLUX.2-klein-4B --variants 4 --width 2560 --height 1440 [--only gate m1] [--out art/frames/roundN]`
   About 35 s per 2560x1440 image on a 3060. On a 12 GB card the script encodes the prompts first, frees the text encoder, then keeps only the transformer and VAE on the GPU (with VAE tiling); the full model does not fit in 16 GB of RAM at once. Run it inside `systemd-run --user --scope -p MemoryMax=11G` so an out-of-memory kill never takes your terminal with it. `FLUX.1-schnell` and the 9B klein are gated on Hugging Face (log in and accept the licence) and do not fit this machine.
2. **Pick.** Look at all variants side by side. A frame is good when: the subject sits in the left third (the page mirrors every frame, so it lands on the right, away from the text column), the two travellers wear dark hooded cloaks and carry a lantern (never backpacks or modern clothing), the sky follows the climb (rose, peach, gold, cream, deep blue), and there is no text, signature, hard canvas edge or black block. Copy the winner to `art/frames/NN-key.png` (no `-vN`).
3. **Optimise.** `tools/optimize_frames.sh` writes `art/web/NN-key.webp` (2560 px) and `NN-key-m.webp` (1280 px for phones) and the manifest `art/web/frames.json` (needs ImageMagick and python3). All 21 frames come to about 17 MB.
4. **Depth maps.** `../cv-venv/bin/python tools/make_depth.py` (Depth Anything V2 Small, Apache-2.0, about 30 s for all 21) writes `art/web/NN-key-d.webp`, near = bright. Then run `tools/optimize_frames.sh` again so `frames.json` lists them. The live camera needs a depth map for every stop; without them the page falls back to still images.
5. **Commit `art/web/`**, not the PNGs (`art/frames/**` is ignored on purpose), and push. When re-making the set, delete the old `art/web/*.webp` first and rerun steps 3 and 4, so no stale file is left behind.

The page picks everything up by itself: `frames.json` says which stops have a painting, and the rest keep the live 3D world.

## Motion
`assets/painted.js` draws each painting with WebGL and its depth map. Scrolling dollies the camera forward and slides it sideways, so foreground and background move at different speeds (parallax); the pointer and the scroll speed tilt it a little. Per-stop effects live in the `FX` table at the top of the file: fire flicker and heat (orange areas), water shimmer (blue areas low in the frame), twinkling highlights, drifting mist, a breathing glow, and a particle layer (embers, fireflies, motes or snow). The frame at `turn` rotates half a turn arriving and half leaving (the 3D camera rolls the same way) with a disc mask hiding the corners. Phones centre the crop on the subject (`FOCUS`). Open `?nogl` to see the still-image fallback and `#s=<n>` to freeze a position between stops.

## AI video (tried, not used)
`tools/animate_frame.py` animates a painting with LTX-Video 2B (Lightricks, open weights, about 28 GB download) on a 12 GB card: about 70 s for a 3 s clip at 832x480, 1.4 MB. It keeps the painting's look and moves fire and water convincingly, but it is soft next to the 2560 px paintings, the brush texture shimmers, it does not follow the scroll, and 21 clips would add 30 MB or more. The live depth camera was chosen instead. Clips could still be layered on a few hero stops (the gate fire, the sea): save them as `art/clips/<key>.mp4` (git-ignored) and `tools/encode_clips.sh` prepares them for the web. The page does not use clips yet.
