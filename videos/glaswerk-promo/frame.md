# Glaswerk — Gestaltungswahrheit

Die Marke dieses Videos ist die Theme selbst. Jeder Wert hier steht so in
`werkzeuge/themes/glaswerk.yaml` und in `custom_components/glaswerk/www/baukasten.js`
des Glaswerk-Repositories. **Nichts davon wird nachempfunden** — es wird eingesetzt.

## Die Palette

Dunkelmodus ist der Grundzustand des Films; der Hellmodus tritt als Gegenstueck
einmal auf.

| Rolle | dunkel | hell |
|---|---|---|
| Grundton der Flaeche | `#0d141f → #16202f → #0a111a` (145°) | `#a8c0da → #cbdaec → #9db6d2` |
| Karte | `rgba(22, 28, 46, .46)` | `rgba(255, 255, 255, .42)` |
| Schrift | `#e8edf7` | `#121a2b` |
| Schrift zweite Stufe | `#a6b1c8` | `#4b5873` |
| Akzent | `#5ab4f7` | `#2196f3` |
| Trennlinie | `rgba(255,255,255,.12)` | `rgba(16,30,60,.12)` |

Primaerrampe (modusunabhaengig): `#086ebf` (40) · `#2190e9` (50) · `#3fa4f5` (60).

Die neunzehn klassischen Toene tragen das Feuerwerk — es sind dieselben, aus
denen Home Assistant seine 86 Zustandsfarben rechnet:
`#f44336` `#ff9800` `#ffc107` `#4caf50` `#00bcd4` `#2196f3` `#926bc7`.

## Das Glas

```
--ha-card-backdrop-filter   blur(26px) saturate(180%)
--ha-card-border-radius     20px
```

Schatten dunkel:
`inset 0 1.5px 0 0 rgba(255,255,255,.16), inset 0 -1.5px 0 0 rgba(0,0,0,.35),
0 20px 52px rgba(0,0,0,.5), 0 2px 6px rgba(0,0,0,.3)`

Die Lichtkante oben und die Schattenkante unten sind die Handschrift des Stils
„Glas": Die Karte wirkt gewoelbt, nicht umrandet. Seiten bleiben offen, es gibt
keinen Rahmen.

## Der Grund

Ein diagonales Raster aus zwei `repeating-linear-gradient` bei 45° und −45°
(2 px Strich, 84 px Abstand), zwei Lichtbaender bei 118°, drei radiale
Farbinseln und darunter der Verlauf. Der vollstaendige Wert steht in
`glaswerk.yaml` unter `lovelace-background` und wird woertlich uebernommen.

## Die fuenf Stile, die im Film durchlaufen

Jeder wechselt **Flaeche und Schattenart** — darum geht es in der zweiten Szene.

| Stil | Flaeche (dunkel) | Schatten |
|---|---|---|
| Glas | `rgba(22,28,46,.46)` | Lichtkante oben, Schattenkante unten, 20 px Wurf |
| Liquid Glass | Verlauf 150°, `rgba(255,255,255,.17) → .02` | Innenrahmen, doppelte Lichtkante |
| macOS | `rgba(30,30,30,.58)` | Haarlinie 0.5 px, 12 px Wurf |
| Gepraegt | `#1a1c20` | `-6px -6px` hell / `6px 6px` dunkel — Relief |
| Kontur | `#17181c` | keiner, nur Rahmen |

## Schrift

`--ha-font-family-body` der Theme ist HAs eigene Leiter. Fuer den Film:
**Inter** (400 / 600 / 800) — dieselbe Anmutung wie Roboto/Noto, aber sicher
einbettbar. Keine zweite Schriftfamilie; die Theme hat auch keine.

Groessen im 1920 × 1080-Bild: Wortmarke 180 px / 800, Zeile darunter 44 px /
400, Stilnamen 28 px / 600 mit 0.12em Sperrung.

## Was dieser Film nicht tut

- Keine Verlaufsschrift, keine Neon-Akzente, kein reines `#000`.
- Kein Emoji, kein Ausrufezeichen, kein Marketing-Superlativ im Bild.
- Die Theme wird nicht „verbessert": Was im Film zu sehen ist, sieht der Nutzer
  nach der Installation genauso.
