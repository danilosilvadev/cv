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
4. **Commit `art/web/`**, not the PNGs (`art/frames/**` is ignored on purpose), and push. Delete `art/web` first when re-making the set, so no stale file is left behind.

The page picks everything up by itself: `frames.json` says which stops have a painting, and the rest keep the live 3D world.

## Motion
Stills move with a slow push-in, crossfade through the middle of each walk, and a light pointer parallax. The frame at `turn` rotates half a turn arriving and half leaving (the 3D camera rolls the same way), with a disc mask hiding the corners while it turns. Per-frame focus points for phones are in `assets/painted.js` (`FOCUS`).

Clips (optional): short image-to-video moves between neighbouring frames (Wan 2.2 first/last frame, Runway, Kling, Luma) saved as `art/clips/<from>-<to>.mp4` and re-encoded by `tools/encode_clips.sh` so they scrub with the scroll bar. The page does not use clips yet.
