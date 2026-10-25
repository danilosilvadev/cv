# Danilo Silva — CV

My CV as a single page: https://danilosilvadev.github.io/cv/

Plain HTML, CSS and JavaScript. No build step. The page is real text over a painted walk through the Divine Comedy: the dark wood and the gate, the pit of Inferno (the projects), the turn at the bottom, the mountain of Purgatorio (earlier work), the spheres of Paradiso (method) and the rose of the Empyrean (contact). Each stop is an oil painting in `art/web/` (21 frames, each with a depth map). The page renders them with WebGL: scrolling moves a real camera through the painting (near and far shift at different speeds), and the paintings stay alive when you stop: fire flickers, mist rolls, water shimmers, stars twinkle, embers and motes drift. The picture at the turn flips over. Without WebGL it falls back to stills that crossfade and push in. A stop without a painting falls back to the live 3D world of that stop (Three.js, vendored in `vendor/`, built from fixed seeds so it is the same every time); when every stop has a painting, Three.js is never downloaded.

**Sound is on by default.** The entry screen's main button is "Enter with sound" (phones do not let a page start audio without a tap). Each world has its own ambient soundscape, generated live with the Web Audio API (`assets/sound.js`, no audio files), and a Sound button stays in the bar.

With scripts off, reduced motion, `?static`, or the **Plain CV** button, the scene is off and the page is a normal readable document. Printing gives a clean A4 CV (`Danilo-Silva-CV.pdf`).

```
index.html          the page: stations (projects), method, earlier work, contact
assets/style.css    the design, including print styles
assets/painted.js   the painted walk: the live depth camera (WebGL) and the still-image fallback, the turn; reads art/web/frames.json; sections pick a frame with data-cam
assets/descent.js   the five 3D worlds and the camera rail (fallback for any stop without a painting); same data-cam keys
art/web/            the 21 painted frames as WebP (2560 px, -m at 1280 px for phones, -d depth map) plus frames.json
art/                prompts, the frame pipeline notes, and the working folders for generated variants
tools/              generate_frames.py (FLUX.2 klein), optimize_frames.sh (PNG to WebP + manifest), make_depth.py (depth maps), animate_frame.py (video experiment)
assets/main.js      reveals, progress, Plain CV switch; loads the scene on demand
assets/ask.js       the "Ask Virgil" chat panel (set ASK_ENDPOINT once a server exists)
assets/ask.css      the chat panel styles
vendor/             three.min.js
```

Run it locally: `python3 -m http.server` and open http://localhost:8000. Add `?static` for the plain version.
Freeze one frame of the scene (painted or 3D): `#s=<position along the camera keys>`, e.g. `#s=7` (the shore). Add `#bare&s=7` to hide the page text.
