// Die Frage vom 17.10.2026: Was zeigt die Leiste OHNE `buttons`?
//
// Im Code steht BEDIENTEILE = ["mode", "fullscreen"] - die Kurzform `controls`
// kennt genau zwei Teile. `settings`, `motion`, `appearance` und die uebrigen
// gibt es nur als `function:` in `buttons`. Enrico vermutete, es seien
// inzwischen mehr. Statt darueber zu reden: hinstellen und ansehen.
//
// Die Ansicht zeigt untereinander:
//   1. ganz ohne Konfiguration        - die Vorgabe
//   2. controls mit beiden Teilen     - dasselbe, ausgeschrieben
//   3. controls mit settings          - FEHLER, absichtlich: so sieht es aus
//   4. dieselben Knoepfe als buttons  - der Weg, der heute geht
//
// Danach steht die Entscheidung an: bleibt die Kurzform bei zwei Teilen, oder
// soll sie alle Funktionen koennen?
//
//   node werkzeuge/test/kurzform-ansehen.mjs

import { verbinde } from "/Users/enricofischer/Projekte/haos-test/ws.mjs";

// Das Dashboard der Testmaschine heisst seit dem Rebranding so; "hats-test"
// gibt es nach dem Ruecksetzen am 16.10.2026 nicht mehr.
const URL_PFAD = "glaswerk-controls";
const ANSICHT = "kurzform";

const karte = (titel, erklaerung, config) => [
  { type: "heading", heading: titel, heading_style: "title", icon: "mdi:eye-outline" },
  { type: "markdown", content: erklaerung },
  config,
];

const ha = await verbinde();

const config = await ha.ruf({ type: "lovelace/config", url_path: URL_PFAD, force: true });
const ansichten = config.views.filter((v) => v.path !== ANSICHT);

ansichten.push({
  title: "Kurzform",
  path: ANSICHT,
  icon: "mdi:dock-top",
  type: "sections",
  max_columns: 2,
  sections: [
    { type: "grid", cards: [
      ...karte(
        "1. Ohne alles",
        "`type: custom:glaswerk-bar` und sonst nichts.\n\n"
        + "Das ist die Vorgabe aus `BEDIENTEILE`. **Erwartet: Modus und Vollbild.**",
        { type: "custom:glaswerk-bar" },
      ),
      ...karte(
        "2. Kurzform ausgeschrieben",
        "```yaml\ncontrols: [mode, fullscreen]\n```\n\n"
        + "Muss identisch zu 1 aussehen.",
        { type: "custom:glaswerk-bar", controls: ["mode", "fullscreen"] },
      ),
    ]},
    { type: "grid", cards: [
      ...karte(
        "3. Kurzform mit settings — absichtlich falsch",
        "```yaml\ncontrols: [mode, fullscreen, settings]\n```\n\n"
        + "**Erwartet: ein Fehler.** `settings` steht nicht in `BEDIENTEILE`. "
        + "Genau hier faellt die Entscheidung — soll das gehen?",
        { type: "custom:glaswerk-bar", controls: ["mode", "fullscreen", "settings"] },
      ),
      ...karte(
        "4. Dasselbe als buttons — der Weg, der heute geht",
        "```yaml\nbuttons:\n  - function: mode\n  - function: fullscreen\n  - function: settings\n```\n\n"
        + "Alle zehn Funktionen stehen hier offen.",
        { type: "custom:glaswerk-bar", buttons: [
          { function: "mode" }, { function: "fullscreen" }, { function: "settings" },
        ]},
      ),
      ...karte(
        "5. Alle zehn Funktionen als buttons",
        "Was die Leiste ueberhaupt kann: `mode`, `theme`, `fullscreen`, `weather`, "
        + "`motion`, `appearance`, `settings`, `sidebar`, `assist`, `edit`.",
        { type: "custom:glaswerk-bar", buttons: [
          { function: "mode" }, { function: "theme" }, { function: "fullscreen" },
          { function: "weather", entity: "weather.forecast_home" },
          { function: "motion" }, { function: "appearance" }, { function: "settings" },
          { function: "sidebar" }, { function: "assist" }, { function: "edit" },
        ]},
      ),
    ]},
  ],
});

await ha.ruf({ type: "lovelace/config/save", url_path: URL_PFAD,
               config: { ...config, views: ansichten } });

// Gegenprobe: wirklich angekommen?
const nach = await ha.ruf({ type: "lovelace/config", url_path: URL_PFAD, force: true });
const da = nach.views.find((v) => v.path === ANSICHT);
if (!da) throw new Error("Ansicht nicht gespeichert");
const karten = da.sections.flatMap((s) => s.cards).filter((c) => c.type === "custom:glaswerk-bar");
console.log(`ok - ${karten.length} Leisten in der Ansicht`);
console.log(`\nhttp://localhost:8123/${URL_PFAD}/${ANSICHT}`);
process.exit(0);
