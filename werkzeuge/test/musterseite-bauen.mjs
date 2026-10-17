// Die Musterseite: eine Ansicht, auf der jede UIX-Vorlage etwas zum Wirken hat.
//
// Angelegt am 17.10.2026 fuer die Vorschaubilder der UIX-Sektion. Bis dahin
// gab es drei Bildpaare von zwanzig, von Hand gemacht - und kein Werkzeug,
// das weitere erzeugt.
//
// WARUM EINE EIGENE ANSICHT. Die Bilder sollen die Vorlage zeigen, nicht ein
// zufaelliges Dashboard. Jede Vorlage braucht ein Bauteil, an dem sie
// sichtbar wird:
//
//     Vorlage                     braucht im Bild
//     glas-karten, -lichtkante    eine gewoehnliche Karte
//     regler-gluehen, -schlank    einen Schieberegler, der AN ist
//     glas-badges                 Badges ueber den Karten
//     glas-symbolkachel           Tile-Karten mit Symbolflaeche
//     glas-knoepfe                Symbolknoepfe
//     abschnitte-trennen          mehrere Abschnitte untereinander
//     verlauf-kapsel              die Glaswerk-Bar mit aktivem Knopf
//     glas-nur-weichzeichnung     eine Karte, die ihre Flaeche selbst malt
//
// Die uebrigen wirken ausserhalb der Ansicht - Seitenleiste, Kopfleiste,
// Dialoge, Meldungen. Die stehen in der Aufnahmeliste von
// vorlagen-vorschau.mjs, nicht hier.
//
// IDEMPOTENT. Das Skript laesst sich beliebig oft laufen; es schreibt immer
// dieselbe Konfiguration. Ein vorhandenes Dashboard wird ueberschrieben,
// nicht verdoppelt - sonst haette man nach dem dritten Lauf drei davon.
//
// RUEHRT NUR SEIN EIGENES DASHBOARD AN. Pfad "glaswerk-muster". Andere
// Dashboards der Instanz werden gelesen (um zu wissen, ob es schon da ist),
// aber nie geschrieben.

import { verbinde } from "/Users/enricofischer/Projekte/haos-test/ws.mjs";

const PFAD = "glaswerk-muster";
const TITEL = "Glaswerk Muster";

// --- Die Entitaeten, mit denen gebaut wird --------------------------------
//
// Fest benannt statt zur Laufzeit gesucht: Ein Bild, auf dem beim naechsten
// Lauf andere Zimmer stehen, laesst sich nicht mit dem vorigen vergleichen.
// Alle am 17.10.2026 auf der Testmaschine vorhanden.
const E = {
  lichter: ["light.wohnzimmer", "light.kuche", "light.schlafzimmer", "light.bad"],
  schalter: ["switch.fernseher", "switch.kaffeemaschine", "switch.waschmaschine", "switch.ladestation"],
  klima: ["climate.wohnzimmer", "climate.schlafzimmer", "climate.bad"],
  rollos: ["cover.rollo_wohnzimmer", "cover.rollo_schlafzimmer"],
  fenster: ["binary_sensor.fenster_wohnzimmer", "binary_sensor.fenster_kuche",
            "binary_sensor.fenster_schlafzimmer", "binary_sensor.fenster_bad"],
  regler: ["input_number.hell_wohnzimmer", "input_number.hell_kueche",
           "input_number.hell_schlafzimmer", "input_number.hell_bad"],
  wetter: "weather.forecast_home",
};

// --- Die Ansicht ----------------------------------------------------------
//
// Ein Sections-Dashboard, weil abschnitte-trennen auf grid-section zielt und
// nur dort etwas zu trennen findet.
function ansicht() {
  return {
    title: "Muster",
    path: "muster",
    type: "sections",
    max_columns: 3,
    // Badges ueber den Karten - fuer glas-badges. Ohne sie bliebe die
    // Vorlage ohne Bild, obwohl sie wirkt.
    badges: [
      { type: "entity", entity: E.wetter },
      { type: "entity", entity: E.fenster[0] },
      { type: "entity", entity: E.lichter[0] },
      { type: "entity", entity: E.klima[0] },
    ],
    sections: [
      {
        type: "grid",
        cards: [
          { type: "heading", heading: "Licht" },
          // Tile-Karten: Symbolflaeche links, Zustand rechts. Das Bauteil,
          // an dem glas-symbolkachel sichtbar wird.
          ...E.lichter.map((e) => ({ type: "tile", entity: e, features_position: "bottom",
                                     features: [{ type: "light-brightness" }] })),
        ],
      },
      {
        type: "grid",
        cards: [
          { type: "heading", heading: "Regler" },
          // Die Regler fuer regler-gluehen und regler-schlank. Sie muessen
          // einen Wert > 0 haben, sonst ist der Balken leer und der Schein
          // der Vorlage haette nichts zu umrahmen.
          { type: "entities", title: "Helligkeit", entities: E.regler },
          ...E.klima.slice(0, 2).map((e) => ({ type: "thermostat", entity: e })),
        ],
      },
      {
        type: "grid",
        cards: [
          { type: "heading", heading: "Haus" },
          ...E.schalter.map((e) => ({ type: "tile", entity: e })),
          ...E.rollos.map((e) => ({ type: "tile", entity: e, features_position: "bottom",
                                    features: [{ type: "cover-open-close" }] })),
          // Eine Karte, die ihre Flaeche SELBST malt - fuer
          // glas-nur-weichzeichnung. Die Markdown-Karte bringt einen eigenen
          // Hintergrund mit, genau der Fall, den die Vorlage adressiert.
          { type: "markdown", content: "### Glaswerk\nEine Oberflaeche aus Karten und Themes." },
        ],
      },
      {
        type: "grid",
        cards: [
          { type: "heading", heading: "Zustand" },
          { type: "glance", entities: E.fenster },
          { type: "entities", title: "Klima", entities: E.klima },
        ],
      },
    ],
  };
}

// --- Die Bar-Ansicht ------------------------------------------------------
//
// Eigene Ansicht, weil verlauf-kapsel die Kapsel der Bar braucht und die
// nur dort steht, wo die Bar auch liegt. Auf der Musteransicht waere sie
// ein Fremdkoerper in jedem anderen Bild.
function barAnsicht() {
  return {
    title: "Leiste",
    path: "leiste",
    type: "sections",
    max_columns: 2,
    sections: [
      {
        type: "grid",
        cards: [
          { type: "heading", heading: "Bedienleiste" },
          {
            type: "custom:glaswerk-bar",
            buttons: [
              { link: "/glaswerk-muster/muster", name: "Muster", icon: "mdi:view-dashboard" },
              { entity: E.lichter[0], state_background: true },
              { entity: E.schalter[2], state_background: true },
              { function: "theme" },
              { function: "mode" },
              { function: "settings" },
              { function: "fullscreen" },
            ],
          },
          ...E.lichter.slice(0, 2).map((e) => ({ type: "tile", entity: e })),
        ],
      },
    ],
  };
}

// --- Schreiben ------------------------------------------------------------
const c = await verbinde();
await c.ruf({ type: "ping" });   // tote Leitung ausschliessen, bevor man misst

const liste = await c.ruf({ type: "lovelace/dashboards/list" });
const da = liste.find((d) => d.url_path === PFAD);

if (!da) {
  await c.ruf({
    type: "lovelace/dashboards/create",
    url_path: PFAD,
    title: TITEL,
    icon: "mdi:image-frame",
    show_in_sidebar: true,
    require_admin: false,
  });
  console.log(`Dashboard angelegt: /${PFAD}`);
} else {
  console.log(`Dashboard gibt es schon: /${PFAD} (wird ueberschrieben)`);
}

const config = { views: [ansicht(), barAnsicht()] };
await c.ruf({ type: "lovelace/config/save", url_path: PFAD, config });

// --- Gegenprobe -----------------------------------------------------------
//
// Nicht geraten, sondern zurueckgelesen: Was steht wirklich dort?
const zurueck = await c.ruf({ type: "lovelace/config", url_path: PFAD });
const karten = JSON.stringify(zurueck).match(/"type":"[^"]+"/g) || [];
const arten = {};
for (const k of karten) { const t = k.slice(8, -1); arten[t] = (arten[t] || 0) + 1; }

console.log(`\nAnsichten: ${zurueck.views.length}`);
for (const v of zurueck.views) {
  const n = (v.sections || []).reduce((s, x) => s + (x.cards || []).length, 0);
  console.log(`  /${PFAD}/${v.path}  ${n} Karten, ${(v.badges || []).length} Badges`);
}
console.log(`\nKartenarten: ${Object.entries(arten).map(([k, v]) => `${k}=${v}`).join("  ")}`);

// Was jede Vorlage braucht, gegen das gezaehlt, was dasteht.
const braucht = {
  "glas-symbolkachel": arten.tile > 0,
  "regler-gluehen / -schlank": arten.entities > 0 || arten.thermostat > 0,
  "glas-badges": (zurueck.views[0].badges || []).length > 0,
  "abschnitte-trennen": (zurueck.views[0].sections || []).length > 1,
  "glas-nur-weichzeichnung": arten.markdown > 0,
  "verlauf-kapsel": JSON.stringify(zurueck).includes("glaswerk-bar"),
};
console.log("\nWas die Vorlagen brauchen:");
let fehlt = 0;
for (const [v, ok] of Object.entries(braucht)) {
  console.log(`  ${ok ? "ok  " : "FEHLT"} ${v}`);
  if (!ok) fehlt++;
}
if (fehlt) { console.log(`\n${fehlt} Vorlagen haetten nichts zum Wirken.`); process.exit(1); }
console.log("\nJede Vorlage findet ein Bauteil.");
process.exit(0);
