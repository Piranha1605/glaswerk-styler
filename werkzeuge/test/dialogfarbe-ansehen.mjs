// Die Frage vom 17.10.2026: Sollen die Popups Kartenfarbe tragen?
//
// Gemessen auf der Testmaschine, dunkler Modus:
//   Karten   rgba(22, 28, 46, 0.36)   durchscheinend
//   Dialoge  rgba(26, 31, 48, 0.80)   fast deckend, leicht heller und blauer
//
// Die Deckkraft ist Absicht - glaswerk-bar.js, DIALOG_MIN: "Auf einem Dialog
// steht Text." Der FARBTON dagegen weicht ohne erkennbaren Grund ab.
//
// Dieses Skript oeffnet das Regler-Fenster und nimmt drei Bilder auf, ohne die
// Theme anzufassen - die Werte werden nur im Browser gesetzt:
//
//   1-jetzt    wie es heute ist
//   2-farbe    Farbton der Karten, Deckkraft wie bisher (0.8)
//   3-ganz     Farbe UND Deckkraft der Karten (0.36)
//
//   node werkzeuge/test/dialogfarbe-ansehen.mjs

import { starteChrome, warte, TIEF } from "./chrome.mjs";

const ZIEL = "/tmp/dialogfarbe";
const c = await starteChrome({ breite: 1300, hoehe: 820, ziel: ZIEL });
await c.geh("/glaswerk-muster/leiste", 10000);
await c.pruefeAnmeldung();
await warte(3000);

// Den Knopf fuer die Darstellungsregler finden und druecken.
const auf = await c.lies(`(() => { ${TIEF}
  const bar = tief(document, e => e.tagName === "GLASWERK-BAR")[0];
  if (!bar) return "keine Leiste";
  const w = bar.shadowRoot ?? bar;
  const k = tief(w, e => e.tagName === "HA-ICON" && e.icon === "mdi:tune-variant")[0];
  if (!k) return "kein Regler-Knopf";
  (k.closest("button") ?? k).click();
  return "geoeffnet";
})()`);
console.log(auf);
await warte(1800);

// Die gemessenen Ausgangswerte - aus der laufenden Seite, nicht geraten.
const karte = await c.lies(`getComputedStyle(document.documentElement).getPropertyValue("--ha-card-background").trim()`);
const dialog = await c.lies(`getComputedStyle(document.documentElement).getPropertyValue("--ha-dialog-surface-background").trim()`);
console.log(`Karten:  ${karte}\nDialoge: ${dialog}`);

const zahlen = (s) => (s.match(/[\d.]+/g) ?? []).map(Number);
const [r, g, b, aKarte] = zahlen(karte);
const aDialog = zahlen(dialog)[3] ?? 0.8;

const setze = (wert) => c.lies(
  `(() => { document.documentElement.style.setProperty("--ha-dialog-surface-background", ${JSON.stringify(wert)}, "important"); return "gesetzt"; })()`
);

await c.schuss("1-jetzt");
await setze(`rgba(${r}, ${g}, ${b}, ${aDialog})`);
await warte(900);
await c.schuss("2-farbe");
await setze(`rgba(${r}, ${g}, ${b}, ${aKarte})`);
await warte(900);
await c.schuss("3-ganz");

await c.zu();
console.log(`\nBilder in ${ZIEL}`);
process.exit(0);
