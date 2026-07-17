# Deepankar Kotnala — Portfolio

A responsive, dependency-light portfolio built with HTML, CSS, and vanilla JavaScript.

## Design system

- Dark mode by default with a remembered light/dark preference
- Layered glass surfaces with backdrop blur, edge highlights, and pointer-reactive glow
- Compact, information-dense section layouts
- Circular profile portrait without a surrounding square image frame
- Animated neural-network, AI-chip, agent-workflow, learning-loop, and inference SVG accents
- Intersection-based reveals, staggered cards, compositor-only skill meters, and reduced-motion support
- Accessible mobile navigation sheet with backdrop, focus handling, Escape support, and layouts from 320px upward

## Run locally

Open `index.html` directly, or serve this folder using any static server.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy

Upload the contents of this folder to the root of a GitHub Pages repository or any static hosting provider.

## Mobile performance improvements

- Mobile and touch layouts render section content immediately instead of waiting for scroll-triggered reveal effects.
- In-page navigation uses a short, capped smooth-scroll animation and closes the mobile menu before scrolling.
- Costly backdrop blur and fixed decorative layers are disabled on touch devices.
- Decorative animations pause while the page is moving to reduce dropped frames.
