// Die Leiste fuer die README - eine, die zeigt, was sie kann.
//
// Warum ein eigenes Dashboard und nicht die Bastelseite: Die alten Bilder
// (docs/bilder/steuerleiste-*.jpg, 13.10.2026) zeigten vier Varianten
// untereinander auf einer Seite namens "Zum Selberbauen", dazu "Boesel 14,9 °C"
// aus Enricos eigener Installation und die Ueberschrift "HATS" von vor dem
// Rebranding. Fuer eine oeffentliche Startseite taugt das nicht.
//
// Diese Leiste ist eine, die jemand wirklich so einsetzen wuerde:
//
//   Home | Licht | Klima          [Kueche-Lampe] | Wetter Vollbild Modus
//
// Drei Ziele links - deshalb gibt es DREI Ansichten, sonst zeigt die Kapsel
// auf dem aktiven Ziel nichts und `link` liefe ins Leere. Rechts ein Schalter
// an einer echten Lampe (leuchtet, solange sie an ist), dahinter die
// eingebauten Funktionen.
//
// Jede Ansicht traegt ein paar Karten, damit die Leiste nicht im Leeren steht
// und man sieht, wie sie ueber dem Inhalt sitzt.
//
//   node werkzeuge/test/leiste-bauen.mjs
//
// Idempotent: Ein zweiter Lauf ersetzt die Ansichten, statt sie zu doppeln.

import { verbinde } from "/Users/enricofischer/Projekte/haos-test/ws.mjs";

const URL_PFAD = "glaswerk-leiste";
const TITEL = "Glaswerk";

// Die Leiste, wie sie in der README stehen soll. Eine Stelle, die alle drei
// Ansichten benutzen - sonst laufen sie beim Bearbeiten auseinander.
const LEISTE = (aktiv) => ({
  type: "custom:glaswerk-bar",
  buttons: [
    { name: "Home",  icon: "mdi:home-outline",             link: `/${URL_PFAD}/home` },
    { name: "Licht", icon: "mdi:ceiling-light-multiple",   link: `/${URL_PFAD}/licht` },
    { name: "Klima", icon: "mdi:thermometer",              link: `/${URL_PFAD}/klima` },
    { entity: "light.kuche", align_end: true, separator_before: true },
    { function: "weather", entity: "weather.forecast_home", align_end: true },
    { function: "fullscreen", align_end: true },
    { function: "mode", align_end: true },
  ],
  collapse: "narrow",
  // Ohne das bleibt die Leiste auf Spaltenbreite: gemessen am 17.10.2026
  // 500 px im Kopfbereich und 492 px als normale Karte - beides unter der
  // Grenze von `collapse: narrow`, also zeigte sie nur "Home ⌄". Die volle
  // Breite gibt es erst an Stelle der Kopfzeile, und genau so ist die Leiste
  // auch gemeint.
  replace_header: true,
});

const kachel = (ent) => ({ type: "tile", entity: ent, features_position: "bottom", vertical: false });

const ansicht = (path, title, icon, karten) => ({
  title, path, icon,
  type: "sections",
  // Vier Spalten, damit der Kopf ueber die volle Breite laeuft. Mit zweien
  // sass die Leiste auf knapp der halben Seite, blieb unter den 500 px von
  // `collapse: narrow` und zeigte nur "Home ⌄" - richtig so, aber auf einem
  // Bild fuer die README will man die Reihe sehen, nicht das Menue.
  max_columns: 4,
  sections: [{ type: "grid", cards: karten }],
  // Die Leiste gehoert auf JEDE Ansicht - sonst ist HAs Kopfzeile auf der
  // einen wieder da und auf der anderen nicht. Steht so auch in der README.
  badges: [],
  cards: [],
  // "start" statt "responsive": Gemessen am 17.10.2026 gab "responsive" dem
  // Kopf genau 500 px - Abschnittsbreite, nicht Seitenbreite. Das ist exakt
  // die Grenze von `collapse: narrow`, und die Leiste zeigte nur "Home ⌄".
  header: { card: LEISTE(path), layout: "start", badges_position: "bottom" },
});

const ha = await verbinde();

// Dashboard anlegen, falls es noch nicht da ist.
const liste = await ha.ruf({ type: "lovelace/dashboards/list" });
if (!liste.some((d) => d.url_path === URL_PFAD)) {
  await ha.ruf({ type: "lovelace/dashboards/create", url_path: URL_PFAD,
                 title: TITEL, icon: "mdi:dock-top", show_in_sidebar: true, require_admin: false });
  console.log(`Dashboard "${TITEL}" angelegt`);
}

const config = {
  views: [
    ansicht("home", "Home", "mdi:home-outline", [
      { type: "heading", heading: "Wohnzimmer", heading_style: "title", icon: "mdi:sofa-outline" },
      kachel("light.wohnzimmer"), kachel("cover.rollo_wohnzimmer"), kachel("climate.wohnzimmer"),
      { type: "heading", heading: "Geraete", heading_style: "title", icon: "mdi:power-plug-outline" },
      kachel("switch.fernseher"), kachel("switch.kaffeemaschine"), kachel("switch.waschmaschine"),
    ]),
    ansicht("licht", "Licht", "mdi:ceiling-light-multiple", [
      { type: "heading", heading: "Alle Lampen", heading_style: "title", icon: "mdi:lightbulb-group-outline" },
      kachel("light.wohnzimmer"), kachel("light.kuche"), kachel("light.schlafzimmer"),
      kachel("light.bad"), kachel("light.flur"), kachel("light.buro"),
    ]),
    ansicht("klima", "Klima", "mdi:thermometer", [
      { type: "heading", heading: "Heizung", heading_style: "title", icon: "mdi:radiator" },
      kachel("climate.wohnzimmer"), kachel("climate.schlafzimmer"), kachel("climate.bad"),
      { type: "heading", heading: "Rollaeden", heading_style: "title", icon: "mdi:window-shutter" },
      kachel("cover.rollo_wohnzimmer"), kachel("cover.rollo_schlafzimmer"),
    ]),
  ],
};

await ha.ruf({ type: "lovelace/config/save", url_path: URL_PFAD, config });

// Gegenprobe: steht wirklich auf jeder Ansicht eine Leiste?
const nach = await ha.ruf({ type: "lovelace/config", url_path: URL_PFAD, force: true });
const ohne = nach.views.filter((v) => v.header?.card?.type !== "custom:glaswerk-bar");
if (ohne.length) throw new Error(`Ansichten ohne Leiste: ${ohne.map((v) => v.path).join(", ")}`);
console.log(`ok - ${nach.views.length} Ansichten, jede mit Leiste im Kopf`);
console.log(`\nhttp://localhost:8123/${URL_PFAD}/home`);
process.exit(0);
