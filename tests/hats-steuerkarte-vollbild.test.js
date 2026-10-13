// Das Vollbild der Steuerkarte: Kiosk-Modus von Home Assistant und Vollbild
// des Browsers, gekoppelt.
//
// Warum eine eigene Datei und ein nachgebautes document: Die Kopplung laesst
// sich im eingebauten Browser der Claude-App nicht messen. Am 13.10.2026
// blieb requestFullscreen() dort einfach offen - ein echter Klick, die Seite
// galt als aktiviert, und das Versprechen wurde weder erfuellt noch
// abgelehnt. Der Kiosk-Teil ist an der Instanz gemessen, dieser hier nicht.
//
// Die Karte haengt ihren Hoerer beim Laden an document. Der Nachbau muss also
// stehen, BEVOR das Modul geladen wird - deshalb der import weiter unten.

import assert from "node:assert";

let n = 0;
async function pruefe(was, fn) { await fn(); n++; console.log("ok", was); }
const gleich = () => new Promise((r) => setTimeout(r, 0));

const kiosk = [];            // was an Home Assistant ging
const hoerer = {};
let antwort = null;          // die offene Anfrage: { erfuelle, lehneAb }
const doc = {
  fullscreenEnabled: true,
  fullscreenElement: null,
  anfragen: 0,
  beendet: 0,
  documentElement: {
    requestFullscreen() {
      doc.anfragen++;
      return new Promise((ok, nein) => {
        antwort = {
          erfuelle() { doc.fullscreenElement = doc.documentElement; ok(); },
          lehneAb() { nein(new TypeError("nicht erlaubt")); },
        };
      });
    },
  },
  exitFullscreen() { doc.beendet++; doc.fullscreenElement = null; return Promise.resolve(); },
  addEventListener(typ, fn) { hoerer[typ] = fn; },
};
globalThis.document = doc;
globalThis.window = { dispatchEvent(e) { kiosk.push(`${e.type}:${e.detail.enable}`); return true; } };

const { schalteVollbild } = await import("../custom_components/hats/www/hats-control-card.js");

// Was der Browser bei Esc tut: Element weg, dann das Ereignis.
const esc = () => { doc.fullscreenElement = null; hoerer.fullscreenchange(); };
function leer() {
  kiosk.length = 0; doc.anfragen = 0; doc.beendet = 0;
  doc.fullscreenElement = null; doc.fullscreenEnabled = true; antwort = null;
}

await pruefe("Die Karte haengt genau einen Hoerer an, und zwar fuer fullscreenchange", () => {
  assert.deepStrictEqual(Object.keys(hoerer), ["fullscreenchange"]);
});

await pruefe("Einschalten: Kiosk an und eine Anfrage an den Browser", async () => {
  leer();
  schalteVollbild(true, false);
  assert.deepStrictEqual(kiosk, ["hass-kiosk-mode:true"]);
  assert.strictEqual(doc.anfragen, 1);
  antwort.erfuelle(); await gleich();
});

await pruefe("Esc beendet auch den Kiosk-Modus", async () => {
  kiosk.length = 0;
  esc();
  assert.deepStrictEqual(kiosk, ["hass-kiosk-mode:false"]);
  // Und nur einmal: Ein zweites Ereignis ohne unser Vollbild tut nichts mehr.
  esc();
  assert.deepStrictEqual(kiosk, ["hass-kiosk-mode:false"]);
});

await pruefe("Gegenprobe: Ein fremdes Vollbild, das endet, laesst den Kiosk-Modus in Ruhe", () => {
  leer();
  // Niemand hat ueber die Karte etwas geoeffnet - ein Kamerabild geht zu.
  esc();
  assert.deepStrictEqual(kiosk, []);
});

await pruefe("Bleibt die Anfrage offen, schaltet nur der Kiosk-Modus", async () => {
  leer();
  schalteVollbild(true, false);
  await gleich();
  esc();                                   // irgendein fullscreenchange
  assert.deepStrictEqual(kiosk, ["hass-kiosk-mode:true"], "ein offenes Vollbild gilt als unseres");
  schalteVollbild(false, false);
  assert.deepStrictEqual(kiosk, ["hass-kiosk-mode:true", "hass-kiosk-mode:false"]);
  assert.strictEqual(doc.beendet, 0, "die Karte beendet ein Vollbild, das sie nie bekommen hat");
});

await pruefe("Kommt die Erlaubnis erst nach dem Abwaehlen, geht das Vollbild sofort wieder zu", async () => {
  // Die Anfrage aus der Pruefung davor ist noch offen.
  antwort.erfuelle(); await gleich();
  assert.strictEqual(doc.beendet, 1);
  assert.strictEqual(doc.fullscreenElement, null);
  // Und das Ereignis dazu aendert am Kiosk-Modus nichts mehr.
  kiosk.length = 0;
  hoerer.fullscreenchange();
  assert.deepStrictEqual(kiosk, []);
});

await pruefe("Abgelehnt heisst: nur Kiosk, und spaeter kein Aufraeumen", async () => {
  leer();
  schalteVollbild(true, false);
  antwort.lehneAb(); await gleich();
  esc();
  assert.deepStrictEqual(kiosk, ["hass-kiosk-mode:true"]);
  schalteVollbild(false, false);
  assert.strictEqual(doc.beendet, 0);
});

await pruefe("Ausschalten ueber die Karte beendet das Vollbild, das sie geoeffnet hat", async () => {
  leer();
  schalteVollbild(true, false);
  antwort.erfuelle(); await gleich();
  schalteVollbild(false, false);
  assert.strictEqual(doc.beendet, 1);
  assert.deepStrictEqual(kiosk, ["hass-kiosk-mode:true", "hass-kiosk-mode:false"]);
  // Das Ereignis, das der Browser danach schickt, schaltet nicht noch einmal.
  hoerer.fullscreenchange();
  assert.deepStrictEqual(kiosk, ["hass-kiosk-mode:true", "hass-kiosk-mode:false"]);
});

await pruefe("Ein Vollbild ueber unserem - ein Kamerabild - beendet nichts", async () => {
  leer();
  schalteVollbild(true, false);
  antwort.erfuelle(); await gleich();
  kiosk.length = 0;
  // Das Bild geht auf und wieder zu: Der Browser faellt auf die Seite zurueck,
  // nicht auf null.
  doc.fullscreenElement = { tagName: "VIDEO" };
  hoerer.fullscreenchange();
  doc.fullscreenElement = doc.documentElement;
  hoerer.fullscreenchange();
  assert.deepStrictEqual(kiosk, []);
  // Gegenprobe: Erst wenn alles zu ist, geht auch der Kiosk-Modus.
  esc();
  assert.deepStrictEqual(kiosk, ["hass-kiosk-mode:false"]);
});

await pruefe("Ein fremdes Vollbild wird weder ersetzt noch beendet", () => {
  leer();
  doc.fullscreenElement = { tagName: "VIDEO" };
  schalteVollbild(true, false);
  assert.strictEqual(doc.anfragen, 0);
  schalteVollbild(false, false);
  assert.strictEqual(doc.beendet, 0);
  assert.deepStrictEqual(kiosk, ["hass-kiosk-mode:true", "hass-kiosk-mode:false"]);
});

await pruefe("kiosk_only fragt den Browser gar nicht", () => {
  leer();
  schalteVollbild(true, true);
  schalteVollbild(false, true);
  assert.strictEqual(doc.anfragen, 0);
  assert.strictEqual(doc.beendet, 0);
  assert.deepStrictEqual(kiosk, ["hass-kiosk-mode:true", "hass-kiosk-mode:false"]);
});

await pruefe("Kann der Browser kein Vollbild, bleibt der Kiosk-Modus", () => {
  leer();
  doc.fullscreenEnabled = false;
  schalteVollbild(true, false);
  assert.strictEqual(doc.anfragen, 0);
  assert.deepStrictEqual(kiosk, ["hass-kiosk-mode:true"]);
});

console.log(`\n${n} Pruefungen`);
if (n < 12) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }
