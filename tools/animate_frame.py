#!/usr/bin/env python3
"""Experiment: turn a painted frame into a short video clip with LTX-Video (image-to-video), on a 12 GB GPU.

    ../cv-venv/bin/python tools/animate_frame.py --only gate shore            # -> art/clips/gate.mp4, shore.mp4 (git-ignored)

The first frame of the clip is the painting itself; the model moves it. Prompts are encoded first and the 19 GB T5 text encoder is freed
before the 2B transformer goes on the GPU (the same trick as generate_frames.py), so it fits 12 GB of VRAM and 16 GB of RAM.
The clips are for judging motion; the page does not use them yet (see art/README.md). Needs diffusers with LTXImageToVideoPipeline."""
import argparse, gc, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
LOOK = " Hand-painted oil painting, thick visible brush strokes, painterly texture, the same painting throughout, smooth natural motion, cinematic."
MOTION = {
    "forest": "The camera slowly walks forward along the forest path. Mist drifts between the pine trunks, branches sway gently, a small warm glow flickers far ahead. The cloaked traveller walks away from the camera.",
    "gate": "The camera slowly pushes forward toward the stone gateway. Flames flicker and flow inside the doorway, embers float upward, the lantern light flickers. The two cloaked travellers stand still, their cloaks sway gently in the warm wind.",
    "inf2": "The camera slowly follows the two cloaked travellers as they walk along the red stone ledge. Smoke curls upward, embers drift and glow, lantern light flickers on the bricks.",
    "shore": "Gentle waves roll onto the beach and the sunlight sparkles on the water. Clouds drift slowly across the rose-gold sky, stars fade. The two cloaked travellers stand and watch, their cloaks moving softly in the wind. The camera drifts slowly forward.",
    "m3": "Waves move slowly on the sea below the gold cliff, soft clouds drift across the sky, golden light shifts on the rock. The two cloaked travellers stand on the ledge, cloaks moving gently in the wind.",
    "p4": "The blazing golden Sun pulses slowly with light, rays of white-gold glow flicker and breathe, thin gold orbit lines glide slowly through the dark space, tiny stars twinkle.",
    "rose": "The luminous white rose breathes with soft light, tiny golden lights twinkle and drift slowly around it, the glow at its heart pulses gently in the dark violet void.",
}
NEG = "worst quality, inconsistent motion, blurry, jittery, distorted, deformed, text, watermark, signature, different painting, photograph, cartoon"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="+", required=True, help="frame keys: " + " ".join(MOTION))
    ap.add_argument("--model", default="Lightricks/LTX-Video")
    ap.add_argument("--width", type=int, default=832)
    ap.add_argument("--height", type=int, default=480)
    ap.add_argument("--frames", type=int, default=73, help="8k+1; 73 frames is about 3 s at 24 fps")
    ap.add_argument("--steps", type=int, default=40)
    ap.add_argument("--seed", type=int, default=20261025)
    ap.add_argument("--out", default=str(ROOT / "art" / "clips"))
    a = ap.parse_args()

    import torch
    from PIL import Image
    from diffusers import LTXImageToVideoPipeline
    import subprocess

    keys = [k for k in a.only if k in MOTION]
    stills = {}
    for p in sorted((ROOT / "art" / "frames").glob("[0-9][0-9]-*.png")):
        if not re.search(r"-v\d\.png$", p.name): stills[p.stem.split("-", 1)[1]] = p

    enc = LTXImageToVideoPipeline.from_pretrained(a.model, transformer=None, vae=None, torch_dtype=torch.bfloat16).to("cuda")
    emb = {}
    with torch.no_grad():
        for k in keys:
            pe, pm, ne, nm = enc.encode_prompt(MOTION[k] + LOOK, negative_prompt=NEG, do_classifier_free_guidance=True, device="cuda")
            emb[k] = tuple(t.cpu() for t in (pe, pm, ne, nm))
    del enc; gc.collect(); torch.cuda.empty_cache()

    pipe = LTXImageToVideoPipeline.from_pretrained(a.model, text_encoder=None, tokenizer=None, torch_dtype=torch.bfloat16)
    pipe.enable_model_cpu_offload()
    try: pipe.vae.enable_tiling()
    except Exception: pass
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    for k in keys:
        img = Image.open(stills[k]).convert("RGB")
        w, h = img.size; s = max(a.width / w, a.height / h)                    # cover-crop to the clip size
        img = img.resize((round(w * s), round(h * s)), Image.LANCZOS)
        l, t = (img.width - a.width) // 2, (img.height - a.height) // 2
        img = img.crop((l, t, l + a.width, t + a.height))
        pe, pm, ne, nm = (x.to("cuda") for x in emb[k])
        gen = torch.Generator("cpu").manual_seed(a.seed)
        frames = pipe(image=img, prompt_embeds=pe, prompt_attention_mask=pm, negative_prompt_embeds=ne, negative_prompt_attention_mask=nm,
                      width=a.width, height=a.height, num_frames=a.frames, frame_rate=24, num_inference_steps=a.steps, guidance_scale=3.0, generator=gen).frames[0]
        path = out / f"{k}.mp4"
        # ffmpeg writes the file (diffusers' own export needs OpenCV): H.264, yuv420p, plays everywhere
        ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{a.width}x{a.height}", "-r", "24", "-i", "-",
                               "-c:v", "libx264", "-crf", "20", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(path)], stdin=subprocess.PIPE)
        for fr in frames: ff.stdin.write(fr.convert("RGB").tobytes())
        ff.stdin.close(); ff.wait()
        print("wrote", path, flush=True)


if __name__ == "__main__":
    sys.exit(main())
