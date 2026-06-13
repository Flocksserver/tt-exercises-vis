# 🏓 Tischtennis-Übungsdesign-Visualisierer

Ein kleines, abhängigkeitsfreies Web-Tool, das Tischtennis-Übungen aus einer einfachen
**Textnotation** als **Tisch-Grafik** zeichnet – inklusive Ballwegen, kurzen Bällen,
unregelmäßiger Platzierung und Zielbereichen. Die Grafik lässt sich als **PNG** oder
**SVG** exportieren.

**▶️ Live: https://flocksserver.github.io/tt-exercises-vis/**

> Ursprünglich 2015 als Teil meiner Homepage entstanden, hier als eigenständiges Projekt
> neu aufgebaut: ohne externe Bibliotheken (kein jQuery/D3), mit Live-Validierung,
> responsivem SVG und den lange offenen Roadmap-Features.

## Notation

Pro Tabellenzeile ein Ballwechsel-Schritt. **Spieler A** steht vorne, **Spieler B** hinten.

```
[N mal] [kurzer] TECHNIK aus [kurze] POSITION in [kurze] POSITION
                                              | POSITION bis POSITION
                                              | POSITION oder [kurze] POSITION …
Frei
```

- **TECHNIK** – ein Wort, frei wählbar (`VHT`, `RHB`, `Schupf`, …)
- **POSITION** – `VH`, `RH` oder `Mitte`
- `aus` = Start­position, `in` = Ziel­position
- `Frei` – freier Ball, beendet die Rally

### Beispiele

| Eingabe | Bedeutung |
| --- | --- |
| `VHT aus VH in Mitte` | Vorhand-Topspin aus der Vorhand in die Mitte |
| `kurzer VHB aus VH in kurze Mitte` | kurzer Ball, der nah am Netz in der Mitte landet |
| `VHT aus VH in Mitte oder RH` | unregelmäßig: Ziel Mitte **oder** Rückhand (gestrichelt) |
| `VHT aus VH in VH bis Mitte` | Zielbereich zwischen Vorhand und Mitte (schattiert) |
| `2-3 mal RHT aus RH in RH` | Schritt 2- bis 3-mal wiederholen |

## Grafik-Legende

- Blauer Pfeil = Schlag von **Spieler A**, roter Pfeil = Schlag von **Spieler B**
- Gestrichelt = Alternative bei `oder`
- Schattierte Fläche = Zielbereich bei `bis`
- Position nahe der grauen Netzlinie = **kurz**

## Lokal starten

Reine statische Seite – kein Build-Schritt nötig. Wegen `file://`-Einschränkungen am
besten über einen lokalen Server öffnen:

```bash
cd src
python3 -m http.server 8000
# http://localhost:8000
```

## Projektstruktur

```
src/
├── index.html          One-Pager (Werkzeug + Legende)
├── css/style.css
└── js/
    ├── notation.js     Parser & Validator der Notation
    ├── geometry.js     Tisch- und Positions-Koordinaten (lang/kurz)
    ├── renderer.js     SVG-Zeichnung (Tisch, Pfeile, Bereiche, Labels)
    ├── export.js       PNG-/SVG-Export
    └── app.js          UI, Live-Validierung, Auto-Render
orig/                   Originalstand von 2015 (Referenz)
```

## Deployment

Der Quellcode liegt im Branch `main` unter `src/`. Veröffentlicht wird der **Inhalt von
`src/`** über den Branch `gh-pages` (GitHub Pages → Deploy from a branch, `gh-pages` / `/`).

Neu veröffentlichen nach Änderungen in `src/`:

```bash
git subtree split --prefix src -b gh-pages
git push -f origin gh-pages
git branch -D gh-pages
```

> Alternativ lässt sich auf einen GitHub-Actions-Workflow umstellen (Auto-Deploy bei jedem
> Push), sobald das Token die `workflow`-Berechtigung hat.

## Lizenz

[MIT](LICENSE) – frei für jeden Zweck (privat und kommerziell) nutzbar. Es muss lediglich
der Copyright-Hinweis erhalten bleiben.
