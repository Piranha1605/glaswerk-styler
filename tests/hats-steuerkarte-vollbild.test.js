// Das Vollbild der Steuerkarte: Kiosk-Modus von Home Assistant und Vollbild
// des Browsers, gekoppelt.
//
// Warum ein nachgebautes document: Hier stehen die Faelle, die sich an einem
// Browser nicht herstellen lassen. Im eingebauten Browser der Claude-App
// blieb requestFullscreen() am 13.10.2026 einfach offen - ein echter Klick,
// die Seite galt als aktiviert, und das Versprechen wurde weder erfuellt noch
// abgelehnt. Genau diesen Fall und die Erlaubnis, die zu spaet kommt, kann
// nur ein Nachbau liefern.
//
// Die Faelle, die ein Browser liefern KANN, sind an einem echten Chrome
// gemessen: werkzeuge/test/vollbild-messen.mjs.
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

// Der Speicher des Browsers, in dem sich die Leiste das Vollbild je Geraet
// merkt. Als Eigenschaft definiert, nicht zugewiesen: node bringt unter
// diesem Namen etwas Eigenes mit.
const speicher = new Map();
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
  getItem: (k) => (speicher.has(k) ? speicher.get(k) : null),
  setItem: (k, v) => { speicher.set(k, String(v)); },
} });

const { schalteVollbild, vollbildGemerkt, gleicheVollbildAb } =
  await import("../custom_components/hats/www/hats-control-card.js");

// Vor allem anderen, denn der Abgleich laeuft nur EINMAL je Seite: Wer von
// der Menueleiste der Horizon-Cards kommt, hat seine Wahl unter deren Namen
// liegen und soll weiter im Vollbild starten.
await pruefe("Der gemerkte Zustand der Menueleiste wird uebernommen und einmal eingeschaltet", () => {
  assert.strictEqual(vollbildGemerkt(), false, "ein leerer Speicher gilt als gemerkt");
  speicher.set("menue-leiste:kiosk", "1");
  assert.strictEqual(vollbildGemerkt(), true);
  gleicheVollbildAb({ kioskMode: false });
  assert.deepStrictEqual(kiosk, ["hass-kiosk-mode:true"]);
  // Nur einmal - und nie ein "aus": Das loeschte einen Kiosk-Modus, den
  // jemand anders gesetzt hat.
  gleicheVollbildAb({ kioskMode: false });
  speicher.set("hats-control:fullscreen", "0");
  gleicheVollbildAb({ kioskMode: true });
  assert.deepStrictEqual(kiosk, ["hass-kiosk-mode:true"]);
  kiosk.length = 0;
});

await pruefe("Die eigene Wahl schlaegt die uebernommene, und jedes Schalten wird gemerkt", () => {
  // Der eigene Schluessel steht auf "0", der alte noch auf "1".
  assert.strictEqual(vollbildGemerkt(), false);
  schalteVollbild(true, true);
  assert.strictEqual(speicher.get("hats-control:fullscreen"), "1");
  assert.strictEqual(vollbildGemerkt(), true);
  schalteVollbild(false, true);
  assert.strictEqual(speicher.get("hats-control:fullscreen"), "0");
  // Den Schluessel der Menueleiste fasst die Leiste nicht an.
  assert.strictEqual(speicher.get("menue-leiste:kiosk"), "1");
  kiosk.length = 0;
});

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

await pruefe("Esc beendet auch den Kiosk-Modus - und das wird gemerkt", async () => {
  kiosk.length = 0;
  assert.strictEqual(speicher.get("hats-control:fullscreen"), "1");
  esc();
  assert.deepStrictEqual(kiosk, ["hass-kiosk-mode:false"]);
  // Sonst startete das Wandtablett nach dem naechsten Neuladen wieder im
  // Vollbild, obwohl jemand es verlassen hat.
  assert.strictEqual(speicher.get("hats-control:fullscreen"), "0");
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
if (n < 14) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }
