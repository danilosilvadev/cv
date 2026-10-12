# Danilo Silva — CV

My CV as a single page: https://danilosilvadev.github.io/cv/

Plain HTML, CSS and JavaScript. No build step. [GSAP](https://gsap.com) with ScrollTrigger and [Lenis](https://lenis.darkroom.engineering) (both vendored in `vendor/`) drive the motion; with scripts off, reduced motion, or `?static` the page is a normal readable document, and printing gives a clean A4 CV (`Danilo-Silva-CV.pdf`).

```
index.html          the page
assets/style.css    the design, including print styles
assets/main.js      the motion (intro, scroll scenes, flow field)
vendor/             gsap, ScrollTrigger, lenis
```

Run it locally: `python3 -m http.server` and open http://localhost:8000. Add `?static` for the motion-free version.
