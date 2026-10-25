#!/usr/bin/env python3
"""Generate the 21 painted frames from art/prompts.json on a machine with an NVIDIA GPU.

    pip install torch diffusers transformers accelerate sentencepiece safetensors
    python tools/generate_frames.py --list                       # print prompts, needs no GPU
    python tools/generate_frames.py                              # all frames -> art/frames/NN-key.png
    python tools/generate_frames.py --only gate inf1 --variants 4

Each frame uses the same seed family, so a run is repeatable. For a style reference (your portrait) use ComfyUI with an IP-Adapter /
Flux Redux node, or Midjourney --sref; this script is the plain text-to-image baseline. NOT tested on a GPU yet: written on a CPU-only machine.
"""
import argparse, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((ROOT / "art" / "prompts.json").read_text(encoding="utf-8"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true", help="print the prompts and exit")
    ap.add_argument("--only", nargs="*", help="frame keys to render, e.g. gate inf1")
    ap.add_argument("--model", default="black-forest-labs/FLUX.1-schnell", help="any diffusers text-to-image model (FLUX.1-dev, SDXL, ...)")
    ap.add_argument("--steps", type=int, default=0, help="0 = model default (4 for schnell, 28 otherwise)")
    ap.add_argument("--guidance", type=float, default=-1, help="-1 = model default")
    ap.add_argument("--width", type=int, default=1536)
    ap.add_argument("--height", type=int, default=864)
    ap.add_argument("--variants", type=int, default=2, help="images per frame, so you can pick the best")
    ap.add_argument("--out", default=str(ROOT / "art" / "frames"))
    ap.add_argument("--negative", default="text, letters, watermark, logo, frame, border, UI, photo, 3d render, plastic, cartoon, lowres")
    a = ap.parse_args()

    frames = [f for f in data["frames"] if not a.only or f["key"] in a.only]
    if a.list:
        for f in frames:
            print(f"{f['n']:02d} {f['key']:<7} {f['stop']}\n    {f['prompt']}\n")
        print("STYLE:", data["style"]); return

    import torch
    from diffusers import AutoPipelineForText2Image
    klein = "klein" in a.model.lower()       # FLUX.2 klein (distilled: 4 steps, guidance 1.0)
    embeds = {}
    if klein:
        # 12 GB card, 16 GB RAM: encode every prompt first, free the text encoder, then keep only transformer + VAE on the GPU.
        import gc
        from diffusers import Flux2KleinPipeline
        enc = Flux2KleinPipeline.from_pretrained(a.model, transformer=None, vae=None, torch_dtype=torch.bfloat16).to("cuda")
        for f in frames:
            with torch.no_grad():
                embeds[f["key"]] = enc.encode_prompt(data.get("lead", "") + f["prompt"] + " " + data["style"], device="cuda")[0].cpu()
        del enc; gc.collect(); torch.cuda.empty_cache()
        pipe = Flux2KleinPipeline.from_pretrained(a.model, text_encoder=None, tokenizer=None, torch_dtype=torch.bfloat16).to("cuda")
        pipe.vae.enable_tiling()                 # lets a 12 GB card decode 2560x1440
    else:
        pipe = AutoPipelineForText2Image.from_pretrained(a.model, torch_dtype=torch.bfloat16)
    if not klein: pipe.enable_model_cpu_offload()          # fits 12-16 GB cards; remove if you have more
    schnell = "schnell" in a.model.lower()
    steps = a.steps or (4 if (schnell or klein) else 28)
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    for f in frames:
        for v in range(a.variants):
            gen = torch.Generator("cpu").manual_seed(data["seed"] + f["n"] * 100 + v)
            kw = dict(prompt_embeds=embeds[f["key"]].to("cuda")) if klein else dict(prompt=data.get("lead", "") + f["prompt"] + " " + data["style"])
            kw.update(width=a.width, height=a.height, num_inference_steps=steps, generator=gen)
            if a.guidance >= 0: kw["guidance_scale"] = a.guidance
            elif schnell: kw["guidance_scale"] = 0.0
            elif klein: kw["guidance_scale"] = 1.0
            if not schnell and not klein and "flux" not in a.model.lower(): kw["negative_prompt"] = a.negative
            img = pipe(**kw).images[0]
            path = out / f"{f['n']:02d}-{f['key']}-v{v + 1}.png"
            img.save(path); print("wrote", path, flush=True)


if __name__ == "__main__":
    sys.exit(main())
