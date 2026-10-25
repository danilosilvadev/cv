# Danilo Silva — CV

My CV as a single page: https://danilosilvadev.github.io/cv/

Plain HTML, CSS and JavaScript. No build step. The page is real text over a 3D walk through the Divine Comedy (Three.js, vendored in `vendor/`): the dark wood and the gate, the pit of Inferno (the projects), the turn at the bottom, the mountain of Purgatorio (earlier work), the spheres of Paradiso (method) and the rose of the Empyrean (contact). Every world is built from fixed seeds, so it is the same every time.

With scripts off, reduced motion, `?static`, or the **Plain CV** button, the scene is off and the page is a normal readable document. Printing gives a clean A4 CV (`Danilo-Silva-CV.pdf`).

```
index.html          the page: stations (projects), method, earlier work, contact
assets/style.css    the design, including print styles
assets/descent.js   the five 3D worlds and the camera rail; sections pick a camera key with data-cam
assets/main.js      reveals, progress, Plain CV switch; loads the scene on demand
assets/ask.js       the "Ask Virgil" chat panel (set ASK_ENDPOINT once a server exists)
assets/ask.css      the chat panel styles
vendor/             three.min.js
```

Run it locally: `python3 -m http.server` and open http://localhost:8000. Add `?static` for the plain version.
Freeze one frame of the scene: `#s=<position along the camera keys>`, e.g. `#s=7` (the shore). Add `#bare&s=7` to hide the page text.
