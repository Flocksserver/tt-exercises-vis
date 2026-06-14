# 🏓 Table Tennis Drill Designer

> Turn plain text notation into clean table‑tennis drill diagrams — and export them as PNG or SVG.

**[▶️ Live demo](https://flocksserver.github.io/tt-exercises-vis/)** · 🇬🇧 English · [🇩🇪 Deutsch](README.de.md) · MIT licensed

![Example: three tables with forehand/backhand topspin arrows](assets/preview.svg)

Coaches and players jot drills in a compact shorthand like `VHT aus VH in Mitte`
("forehand topspin from the forehand into the middle"). This tool reads that shorthand and
draws it — one mini table‑tennis table per rally step, with coloured ball‑path arrows for
both players. Type a drill, watch it appear, export it for your training plan.

No accounts, no install, no build step — a single static page that runs entirely in your browser.

## Highlights

- **Text → diagram, live.** Type the notation, the table view updates instantly.
- **Understands real coaching shorthand.** The `aus …` (origin) may be omitted — the origin is
  inferred from the **rally chain** (where the previous ball landed) or the stroke's hand.
- **Rich notation:** directions (`diagonal` / `parallel`), depths (`kurz` / `halblang` / `lang`),
  zones (`ganzer Tisch`, `halber Tisch RH`, `Mitte VH`), repetitions (`2-3 mal`), and
  **alternatives** with `oder` on the technique, origin, target, direction — or whole strokes.
- **Smart arrows.** When both players hit the same line, the two arrows merge into a single
  two‑headed line with a colour gradient that switches at the net.
- **Ball‑feeder (multiball) mode** for one‑player footwork drills.
- **Export** the diagram as **PNG** or **SVG**.
- **Bilingual UI** (German / English) with a flag switch — defaults to your browser language.
- **Zero dependencies, no build.** Plain HTML/CSS/vanilla JS. Covered by 80+ unit tests.

## Notation

One table row per rally step. **Player A** is at the front, **Player B** at the back.

```
[N mal] TECHNIK [direction] [aus [depth] POSITION] in [depth] TARGET
Frei | endlos

direction = diagonal | parallel
depth     = kurz (short) | halblang (half-long) | lang (long)
POSITION  = VH | RH | Mitte | Mitte VH/RH | ganzer Tisch | halber Tisch VH/RH
TARGET    = POSITION [oder [depth] POSITION] …   |   POSITION bis POSITION
```

- **TECHNIK** — one word (e.g. `VHT`, `RHB`, `Schupf`, `Block`, `Aufschlag`); variants with `/`.
- **`aus …` is optional** — leave it out (`VHT in RH`) and the origin comes from the ball path.
- **`Frei`** ends the rally, **`endlos`** marks a continuous drill.
- The notation stays in its established German shorthand even in the English UI; the legend
  explains every keyword. Many abbreviations and synonyms are accepted, too.

### Examples

| Input | Meaning |
| --- | --- |
| `VHT aus VH in Mitte` | Forehand topspin from the forehand into the middle |
| `RHK/RHT in RH` | Backhand counter **or** topspin into the backhand (origin from the rally) |
| `VHT aus VH diagonal` | Forehand topspin cross‑court (target derived from the direction) |
| `VHT aus VH diagonal oder parallel` | … cross‑court **or** down the line (both shown) |
| `kurzer Aufschlag in kurze RH` | Short serve landing short in the backhand |
| `VHT in VH bis Mitte` | Target zone between forehand and middle |
| `2-3 mal RHK in RH` | Repeat the step 2–3 times |
| `VHT aus VH in RH oder RHT aus RH in RH` | Player A plays one of two complete strokes |

## Diagram legend

- Blue arrow = **Player A**, red arrow = **Player B**, grey dashed = **feed** (multiball).
- Same line there & back = **one line with two heads**; colour switches at the net.
- Dashed = an alternative (`oder`) or a feed.
- Shaded area = a range (`bis`), `ganzer Tisch`, or `unregelmäßig` (variable placement).
- Depth on the table: near the net = short, middle = half‑long, baseline = long.

## Run locally

It's a static site — open it through any web server (needed because the modules load over HTTP):

```bash
cd src
python3 -m http.server 8000
# open http://localhost:8000
```

## Tests

Dependency‑free unit tests using Node's built‑in runner (a tiny DOM stub lets the renderer run
without a browser):

```bash
npm test          # or: node --test tests/*.test.js
```

They cover the notation parser, geometry, the rally resolver, the renderer (arrow merging,
dashing, zones, multiball) and the i18n layer.

## Project structure

```
src/
├── index.html          one-pager (tool + legend)
├── css/style.css
└── js/
    ├── i18n.js         German/English UI
    ├── notation.js     parser & validator (grammar + synonyms in one LEXICON)
    ├── geometry.js     table & position coordinates (depths + zones)
    ├── resolver.js     rally-chain origin + direction derivation -> drawable strokes
    ├── renderer.js     SVG drawing (tables, arrows, zones, multiball, labels)
    ├── export.js       PNG / SVG export
    └── app.js          UI, live validation, auto-render
tests/                  Node test suite
```

## Built with

Plain HTML, CSS and vanilla JavaScript — no framework, no bundler, no runtime dependencies.
The whole thing is a handful of small files served as static assets.

## License

[MIT](LICENSE) — free for any use, private or commercial. Created by Marcel Kaufmann.
Originally a 2015 homepage experiment, rebuilt from scratch.
