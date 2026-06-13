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
Die Notation lehnt sich an die übliche Trainings-Kurzschreibweise an und ist bewusst tolerant.

```
[N mal] TECHNIK [Richtung] [aus [Tiefe] POSITION] in [Tiefe] ZIEL
Frei | endlos

Richtung = diagonal | längs | parallel
Tiefe    = kurz | halblang | lang
POSITION = VH | RH | Mitte | Mitte der VH | Mitte der RH | Ellbogen | ganzer Tisch
ZIEL     = POSITION [oder [Tiefe] POSITION] …   |   POSITION bis POSITION
```

- **TECHNIK** – ein Wort; Varianten mit „/“ (`RHK/RHT`). Auch `Aufschlag`/`AS`.
- **`aus …` ist optional.** Fehlt es, kommt der Ball vom letzten Landepunkt (Rally-Kette) –
  man gibt also nur das Ziel an (`RHK/RHT in RH` → `RHB in RH` → …).
- **Richtung** statt fester Position: `VHT aus VH diagonal` leitet das Ziel selbst ab.
- `Frei` beendet, `endlos` markiert eine Dauerübung.
- **Multiball:** Schalter „Multiball (Zuspiel)“ macht Spieler B zum Zuspieler
  (gestrichelte Zuspiel-Pfeile in Grau).

### Beispiele

| Eingabe | Bedeutung |
| --- | --- |
| `VHT aus VH in Mitte` | Vorhand-Topspin aus der Vorhand in die Mitte |
| `RHK/RHT in RH` | Konter **oder** Topspin in die Rückhand (Ursprung aus Ballverlauf) |
| `VHT aus VH diagonal` | Topspin diagonal (Ziel wird abgeleitet) |
| `kurzer Aufschlag in kurze RH` | kurzer Aufschlag, der kurz in die RH gelegt wird |
| `Flip in halblang RH` | Flip, der halblang (mittlere Tiefe) in die RH gespielt wird |
| `VHT in Mitte oder RH` | unregelmäßig: Ziel Mitte **oder** RH (gestrichelt) |
| `VHT in VH bis Mitte` | Zielbereich zwischen Vorhand und Mitte (schattiert) |
| `Block unregelmäßig` | Block variabel auf den ganzen Tisch (Variabilitäts-Band) |
| `2-3 mal RHT in RH` | Schritt 2- bis 3-mal wiederholen |

## Grafik-Legende

- Blauer Pfeil = Schlag von **Spieler A**, roter Pfeil = **Spieler B**, grau gestrichelt = **Zuspiel**
- Gestrichelt = Alternative bei `oder`
- Schattierte Fläche = Bereich (`bis`), `ganzer Tisch` oder `unregelmäßig`
- Tiefe am Tisch: am Netz = **kurz**, Mitte = **halblang**, Grundlinie = **lang**

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
    ├── geometry.js     Tisch- und Positions-Koordinaten (Tiefen + Zonen)
    ├── resolver.js     Ballverlauf-Kette + Richtungs-Ableitung
    ├── renderer.js     SVG-Zeichnung (Tisch, Pfeile, Zonen, Multiball, Labels)
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
