# The painted walk — prompt pack

One painting per stop of the page (21 frames). Same style block on every prompt, same aspect ratio, so the frames read as one hand-painted film.

**Output:** 16:9, at least 2560×1440, PNG or high-quality JPG. Name each file with its key (`01-forest.png`, `02-gate.png`, …) and put them in `art/frames/`.

## Style block (append to every prompt)

> Hand-painted digital oil painting, thick visible brush and palette-knife strokes, painterly impasto texture, dramatic chiaroscuro, one warm key light against deep black negative space, a single cool teal accent, soft cream specular highlights, subtle freckled grain on the surfaces, cinematic 16:9, no text, no lettering, no UI, no border

**Reference:** `screenshot-2026-10-25_14-04-46.png` (the portrait). Feed it as a *style reference* (Midjourney `--sref`, ChatGPT/Gemini "in the style of this image", Flux Redux / IP-Adapter), not as content.

**Consistency across the 21 frames**
- Same style reference and the same seed/model for the whole set.
- The two travellers (Dante in a plain dark cloak, Virgil taller, carrying a small lantern) should be generated once as a character sheet and reused as a character reference.
- Keep the palette rule: black void + warm light + one teal accent. Inferno leans ember red with an ice-teal bottom, Purgatorio rose-gold dawn, Paradiso indigo and gold, the Empyrean white-gold on black-violet.

## The frames

| # | Key | Page stop | Prompt (then add the style block) |
|---|---|---|---|
| 01 | `forest` | Hero | A lone cloaked traveller seen from behind on a narrow footpath through a dark pine forest at night, pale mist, moonlight in the trunks, a faint warm glow far ahead between the trees. |
| 02 | `gate` | The gate | A monumental stone gateway at the end of the forest path, an inscription carved across the lintel glowing ember-orange, red fire burning through the doorway, two small cloaked figures in the foreground, one holding a lantern. |
| 03 | `inf1` | Circle I, antiloki | Seen from the rim: a vast terraced pit descending in nine concentric ledges into darkness, ember light on the stone, thin glowing lines along each ledge, a pale moon over a black sky, the two travellers tiny on the far rim. |
| 04 | `inf2` | Circle II, antiDrive | Walking down the second ledge of the pit, lantern light on rough red stone, ash and embers drifting upward, the curve of the terrace sweeping away into black. |
| 05 | `inf3` | Circle III, antiHunt | Deeper in the pit, the ledges glow a dull red, the walls close in, a first cold teal light begins far below. |
| 06 | `inf4` | Circle IV, antiQA | Near the bottom: cold teal ice light against red-black rock, the two traveller silhouettes small on a narrow ledge, frost on the stone. |
| 07 | `turn` | The turn | A frozen lake of pale blue ice, an enormous faceted ice crystal at its centre, the whole picture turned upside down as gravity flips, the travellers clinging to the crystal and climbing past it. |
| 08 | `shore` | Purgatorio, shore | Dawn on a calm sea, a small dark beach in the foreground, a steep seven-terraced mountain island rising against a rose-gold sky, last stars fading, the two travellers standing on the sand, sun reflection on the water. |
| 09 | `m1` | Terrace I | Climbing the first terrace of the mountain: stone ledge, low scrub, the sea wide behind, rose light. |
| 10 | `m2` | Terrace II | Second terrace: narrower ledge, moss on the rock, a thin mist below, light warming toward gold. |
| 11 | `m3` | Terrace III | Third terrace: cliff wall on one side, long drop to the sea on the other, gold light on the stone. |
| 12 | `m4` | Terrace IV | Fourth terrace: grass beginning on the ledge, small flowers, the horizon curving. |
| 13 | `m5` | Terrace V | Fifth terrace: green slopes, the sky above now deep blue, a bright morning star. |
| 14 | `m6` | Terrace VI | Sixth terrace: the summit forest visible above, warm light spilling down, the sea far below. |
| 15 | `garden` | Earthly Paradise | A luminous summit garden of green and gold trees, a clearing with warm light and long soft shadows, the travellers resting at the edge. |
| 16 | `p1` | Sphere of the Moon | Floating inside concentric transparent celestial spheres, a small blue Earth below, the pale Moon sphere glowing silver, fine gold orbit lines, indigo space. |
| 17 | `p2` | Sphere of Mercury | Same view, higher: the next sphere, a small bronze-grey planet with a trailing arc of light. |
| 18 | `p3` | Sphere of Venus | Higher: a pale gold planet in a warm halo, rings of light around it. |
| 19 | `p4` | Sphere of the Sun | A blazing golden Sun at the heart of the spheres, soft white-gold light flooding the picture, the black of space at the edges. |
| 20 | `p5` | Sphere of Mars | A rust-red planet glowing against deep indigo, thin gold orbit lines curving across the frame. |
| 21 | `rose` | The Empyrean | The white rose of the Empyrean seen from above: tiers of luminous petals and countless tiny lights around one blinding point of white-gold light, black-violet void beyond. |

## Motion (decided later)
Stills can be moved with depth parallax and crossfades, or each transition can be generated as a short clip from two neighbouring frames (start frame, end frame) with an image-to-video model and scrubbed with the scroll.
