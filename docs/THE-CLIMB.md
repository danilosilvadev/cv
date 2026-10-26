# The Climb: what it is and everything we did

**The Climb** is Danilo Silva's CV told as a scroll-driven fable. A man walks through a misty meadow, climbs a mountain through three climates (dunes, a storm over dark rock, snow), plants a flag at the summit, stands above a sea of clouds as the sun sets, and the sky turns to a night of stars and constellations. Each stretch of the mountain is a chapter of his career, oldest at the foot, newest at the top. The last screen is the contact panel.

Everything is drawn from code at runtime on one `<canvas>`: no images, no video, no libraries. The sound (a song, weather, footsteps) is synthesised live with the Web Audio API.

- Live (lab, unlinked from the main site): https://danilosilvadev.github.io/cv/lab/the-climb/
- Files: `lab/the-climb/index.html` (page, text styles, contact panel), `scene.js` (the whole picture and story), `sound.js` (music and sound effects)
- Resume PDF: `Danilo-Silva-CV.pdf`, built from `tools/resume/resume.html` with `tools/resume/build.sh`

The live CV at https://danilosilvadev.github.io/cv/ is unchanged: it stays on the painted-stills version until you choose to switch.

---

## 1. The story, section by section

The page is 2000vh tall. Scroll progress drives everything. The first 22% is **scene 1**, the rest is **scene 2**; the end of scene 2 is the **summit finale**.

| Part | What you see | What the text says |
|---|---|---|
| Intro | The whole mountain above a sea of cloud, a slow weather cycle (clear, storm, snow), one button: "Who I am" | Title and a one-line premise |
| Scene 1 | A meadow of tall grass, fog, pines, a river, fireflies, birds. He walks towards the mountain | Who he is, how he works, the craft, the principles ("Measure before claiming"), "Then he looked up" |
| Scene 2, dunes | A low-poly 3D mountain seen from above, a trail spiralling up it, warm sand | 2016 to 2019 (BlueFoot, Trackmob, FaçoDesign), Dogma Data Privacy, K2 Partnering Solutions |
| Rope bridge | He crosses a ravine on a swaying rope bridge | CIBC FirstCaribbean |
| Storm | Dark rock, rain slanted by wind, lightning and thunder, falling rocks, he leans into the wind | Arrow Global, then the tools in his pack |
| Snow | Calm snow falls, the song turns major | antiloki, then education and languages |
| Summit | He reaches the peak, raises and plants a small red flag, stands looking at the horizon | "He planted his flag" |
| View and night | The camera sweeps behind and above him over a cloud sea; sunset; moon; 1,700 stars, a Milky Way, shooting stars and three named constellations | "Above the clouds, there was nothing left to prove", then the contact panel |

Titles are in a fable voice; the body under each is plain technical text for a recruiter: role, what was done as bullets, skills as bullets.

### Editing the text
All captions are data in `scene.js`:

- `CAPS1` is scene 1. Each entry: `[from, to, eyebrow, title, summary, bullets[], skills[], skillsLabel]`, where `from` and `to` are scroll windows (0 to 1 of scene 1).
- `CAPS2` is scene 2. Windows are written with `pgOf(u)`, where `u` is the fraction along the trail (0 to 1), and `pgFin(f)` for the summit finale (`f` from 0 to 1).
- Make sure every window has `from < to` and that they are in order. (We once had an empty window and the Arrow Global caption never appeared. Print them with `__climb.CAPS` in the console to check.)
- The contact panel is plain HTML in `index.html` (`#contact`).

---

## 2. How it works

### Scene 1: the meadow (layered 2D parallax)
- A 1920x1080 design space drawn with canvas 2D. Layers (sky, far mountains, seven bands of pines, the river, grass, pines near the camera) each have a parallax factor, so the camera moving across them feels deep.
- Fog is procedural: periodic alpha textures that drift (`fogTex`, `drawFog`). There is fog in front of, between and behind everything.
- Wind gusts move the grass (blades in layers that sway), the scarf and the staff pennant (a ribbon on a travelling wave that streams whichever way the wind turns).
- Fireflies, birds, dust. (The firefly chimes were removed.)

### Scene 2: the mountain (a small 3D engine on canvas 2D)
- A real height-field mountain: 56x56 cells (44 on phones), flat-shaded triangles, a palette that goes from sand to dark rock to snow by distance from the axis. Painted far to near. The upper rock is painted after the cloud layer so the peak stands out of the clouds.
- Terrain features: dunes at the foot, hills and dips along the trail, a ravine, cliff steps, boulders, and pines on the plain around (with bands of forest in the fog on the horizon).
- The **trail** is a spiral (about 1.6 turns) laid on the surface. The ravine crossing becomes a rope bridge. The last stretch runs to a flat summit rock.
- The camera orbits him, higher and wider at the start, closer and lower as he climbs.
- Weather: storm and snow amounts follow how far he is along the trail (not the scroll). Rain, lightning flashes, thunder after the flash, camera shake, falling rocks; then calm snow.

### The walker (a small 3D skeleton)
- Two-bone IK legs, arms, head, a pack, a staff with a small red pennant, and a scarf.
- Real gait: each foot plants and slides back, the heel lifts, the swing foot carries forward, the pelvis drops and shifts over the standing leg, the shoulders twist against the hips, the arms swing, the head glances around.
- Variations: leaning into the storm, using his hands on cliffs, arms out on the rope bridge. At the summit he stands facing the horizon.

### Finale
- He walks to the very end of the trail (the summit rock), raises the flag (the pole swings up and is planted), and the camera: follows him, then moves close behind, rises, pulls back, and finally tilts up to the sky.
- A cloud sea (soft sprites) below; sunset; dusk; night with a moon, a Milky Way, over 1,700 stars with twinkle, shooting stars, and three real constellations (Southern Cross, Orion, Scorpius).

### Sound (`sound.js`)
Everything is synthesised live: a generative song (A minor in scene 1, D minor with a heartbeat on the mountain, a calm major in the snow), wind, rain, thunder, lightning, river, footsteps that change with the ground (grass, sand, stone, wood on the bridge, snow), rock falls, a hawk. The old cricket oscillators (a constant 4.3 kHz pulse) were removed; they were the "beep beep beep".

### How scrolling works
- The camera, weather and text follow where **he is**, not the scroll position. If you scroll faster than he can walk, the scenery waits for him.
- On a computer the mouse wheel and keys are eased and capped to his walking pace, and the scrollbar is hidden (so you cannot skip ahead). On phones, touch scrolling is native.
- He walks at a steady cadence with full strides. The finale starts only once he has reached the top.

### Performance
- Canvas resolution up to 2x with a pixel budget; **Quality: auto / high / low** button (computers). Auto lowers the resolution only if frames are really slow.
- Triangles are filled once with a hair of overlap (no per-triangle stroke).
- Measured on a real GPU at 1920x1080: about 55 to 60 fps in the mountain scene, about 49 on the intro.

---

## 3. Debug and test switches (add to the URL)

| Hash | Effect |
|---|---|
| `#p=0.5` | Freeze scene progress at 0.5 |
| `#hero=.6` | Put him 60% along the trail (scene 2) |
| `#fast` | Speed up his walking for tests |
| `#skipintro` | Skip the intro screen |
| `#prof` | Collect timings per draw stage (`window.__prof`) |

`window.__climb` exposes internals for tests (`hero`, `hero2`, `TRAIL`, `CAPS`, `NODES`, `fin()`...).

### Test tools (`tools/climb-tests/`, Node and Chromium)
They drive Chromium over the DevTools protocol; run a local server first (`python3 -m http.server`).
- `shoot.mjs`: screenshots at scroll positions (`ENTER=1` presses the button first)
- `realflow.mjs`: really walks him to the summit and screenshots the finale (a real GPU window)
- `fpsgpu.mjs`, `wheelprobe.mjs`, `holdprobe.mjs`: frame rate and scroll behaviour on a real GPU window
- `autoplay4.mjs`, `steps.mjs`, `sheet.mjs`: autoplay checks, trail length and caption windows, a walk-cycle contact sheet

---

## 4. Publishing
The lab page lives under `lab/the-climb/` on `main`, which GitHub Pages serves. We publish with a temporary git worktree on `origin/main`: copy the three files, commit, push, wait for the Pages build (about 20 s). Script tags carry a `?v=` token so browsers fetch new files (GitHub Pages caches for 10 minutes); share links with `?v=N` after a change.

## 5. The resume PDF
`tools/resume/resume.html` is a small, quiet A4 page (Inter Tight and JetBrains Mono, a faint dusk gradient and a ridge line echoing the site). `tools/resume/build.sh` prints it to `Danilo-Silva-CV.pdf` with headless Chromium. It carries the same content as the site: profile and numbers, experience with skills bullets, skills by area, principles, education and languages.

---

## 6. How we got here (short history)
1. Started from the painted-stills Divine Comedy CV. Tried more painting (FLUX.2), depth cameras, AI video: static or ugly.
2. Rule set by Danilo: **everything in code**, flat layered style from a reference image, fog everywhere, movement in everything, sound and a song tied to the scene.
3. Blender was used to prototype the layered look, then scene 1 was rebuilt live in canvas 2D.
4. Iterations driven by feedback: steps that looked like jumps, walking on the grass not the river stones, a real walk cycle (the doll problem), grass taller and wilder, the camera that rises into the fog.
5. Scene 2 changed from a vertical wall to a trail up a 3D mountain (a diagonal climb, small man, big mountain), then three climates, the storm and the rope bridge, then the summit finale and the night sky.
6. The text became a recruiter-friendly fable: fable titles, technical bodies, skills bullets.

### Mistakes worth remembering
- Never claim something is fixed without running it (the summit and the Arrow caption bugs were found only by actually walking him to the top and printing the caption windows).
- Do not change the route or the camera when you only mean to change the pace (the zigzag).
- Stride and speed must match or the feet slide.
- Always give the text enough scroll length and keep caption windows ordered.

## 7. Open items
- **BlueFoot, Trackmob, FaçoDesign** are merged into one caption because the CV has one combined line. Needed per company: dates, role, what was done, skills.
- The "up to 6x cheaper" figure (antiloki) vs the earlier text about withdrawing a published cost advantage: make sure they do not contradict each other.
- The sound was verified by measurement, not by ear; please listen on a real device.
- Phone performance and real-PC performance should be re-checked after any change (use the Quality button on computers).
- Wording to confirm: "Prompt transparency", "Neural graphs", "for Wiley / CrossKnowledge".
