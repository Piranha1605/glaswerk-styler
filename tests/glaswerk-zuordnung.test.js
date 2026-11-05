// Die Zuordnung von Bubble Card und Mushroom auf HAs Farbebene.

import assert from "node:assert";
import { ZUORDNUNG, BUBBLE, MUSHROOM, TOENE, ANZAHL } from "../custom_components/glaswerk/www/zuordnung.js";

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

pruefe("Umfang stimmt mit der gemessenen Erhebung", () => {
  // 62, nicht mehr 68: sechs Eintraege sind am 12.10.2026 entfallen, weil
  // Bubbles eigene Rueckfallkette sie besser erledigt - siehe unten.
  assert.strictEqual(ANZAHL.bubble, 62);
  assert.strictEqual(ANZAHL.mushroom, 72);
  assert.strictEqual(ANZAHL.toene, 19);
  assert.strictEqual(Object.keys(ZUORDNUNG).length, 153);
});

// Ein Akzent ist ein Vordergrund, eine Flaeche ist ein Hintergrund.
const FLAECHE = /fill-[a-z]+-(normal|quiet)-/;
const istAkzent = (k) => /accent/.test(k);

pruefe("Kein Akzent zeigt auf eine -normal- oder -quiet-Flaeche", () => {
  // Der teuerste Denkfehler dieser Tabelle, gemessen am 12.10.2026:
  // --ha-color-fill-<rolle>-normal-* ist bei HA eine dezent getoente FLAECHE
  // fuer Ueberfahr-Zustaende, kein Vordergrund-Akzent. Bubble benutzt seine
  // --bubble-*-accent-color dagegen fuer Slider-Fuellungen, Rahmen und
  // Dropdown-Pfeile. Sieben Eintraege zeigten dorthin; im Dunkeln ergab das
  // #090f35 auf einer Karte in #1c1c1c - Kontrast 1.09 : 1, also unsichtbar.
  // Richtig ist ein literaler Wert: --accent-color kommt dort auf 6.28 : 1.
  //
  // Fuer einen HINTERGRUND ist dieselbe Flaeche dagegen genau richtig -
  // bubble-button-background-color liest bewusst fill-neutral-quiet-resting.
  // Die Unterscheidung ist der Name, nicht der Wert.
  for (const [k, v] of Object.entries(ZUORDNUNG)) {
    if (typeof v !== "string" || !istAkzent(k)) continue;
    assert.doesNotMatch(v, FLAECHE, `${k} = ${v} zeigt auf eine Flaeche, nicht auf einen Akzent`);
  }
});

pruefe("Gegenprobe: ein Akzent auf einer Flaeche wird gefunden", () => {
  // Ohne sie liefe die Pruefung oben leer durch, sobald jemand die Tabelle
  // umbaut oder das Wort "accent" aus den Namen verschwindet.
  const kaputt = { ...ZUORDNUNG, "bubble-test-accent-color": "var(--ha-color-fill-primary-normal-resting)" };
  const treffer = Object.entries(kaputt).filter(([k, v]) => istAkzent(k) && FLAECHE.test(v));
  assert.strictEqual(treffer.length, 1);
  // und es muss ueberhaupt Akzente geben, sonst prueft die Regel nichts
  assert.ok(Object.keys(ZUORDNUNG).filter(istAkzent).length >= 1, "keine Akzente in der Tabelle");
});

pruefe("Ein var() ohne Ausweichwert zeigt auf etwas, das es gibt", () => {
  // --ha-card-background, --ha-dialog-surface-background und
  // --ha-card-backdrop-filter sind von HA NICHT gesetzt - ihr Ausweichwert
  // steht im Bauteil, nicht in der Variablen. Ein nacktes var(--ha-card-background)
  // loeste deshalb zu nichts auf, und Bubble nahm seine eigene Vorgabe statt
  // der Theme. Am 12.10.2026 an sechs Eintraegen gemessen.
  const brauchtAusweich = [
    "ha-card-background", "ha-dialog-surface-background",
    "ha-card-backdrop-filter", "mdc-dialog-scrim-color",
  ];
  for (const [k, v] of Object.entries(ZUORDNUNG)) {
    if (typeof v !== "string") continue;
    const m = /^var\(\s*--([a-z0-9-]+)\s*(,)?/.exec(v.trim());
    if (!m || m[2]) continue;                       // hat einen Ausweichwert
    assert.ok(!brauchtAusweich.includes(m[1]),
      `${k} = ${v} braucht einen Ausweichwert - HA setzt --${m[1]} nicht`);
  }
});

pruefe("Bubble und Mushroom bekommen Verweise, keine Farben", () => {
  // Ein Verweis gilt in beiden Modi zugleich - das ist der ganze Gewinn.
  // Eine feste Farbe muesste je Modus doppelt stehen und liefe auseinander.
  for (const [k, v] of [...Object.entries(BUBBLE), ...Object.entries(MUSHROOM)])
    assert.match(v, /^var\(--/, `${k} = ${v} ist kein Verweis`);
});

pruefe("Die klassischen Toene sind Hex, keine Verweise", () => {
  // Home Assistant leitet --rgb-<name> NUR aus Werten ab, die mit # beginnen.
  // Stuende hier ein var(), gaebe es kein Tripel - und Mushroom baut seine
  // Zustandsfarben aus genau diesen Tripeln.
  for (const [k, v] of Object.entries(TOENE))
    assert.match(v, /^#[0-9a-f]{6}$/i, `${k} = ${v} liefert kein Tripel`);
});

pruefe("Mushrooms Tripelfelder zeigen auf rgb-Namen, nicht auf Farben", () => {
  // rgb(var(--mush-rgb-red)) braucht Zahlen. Ein var(--ha-color-red-60) waere
  // ein Hexwert und die Regel ungueltig - die Farbe fiele stumm aus.
  for (const [k, v] of Object.entries(MUSHROOM)) {
    if (!k.startsWith("mush-rgb-")) continue;
    assert.match(v, /^var\(--rgb-/, `${k} = ${v} zeigt nicht auf ein Tripel`);
  }
});

pruefe("Jeder Verweis zeigt auf einen Namen, den wir kennen", () => {
  const erlaubt = /^var\(--(ha-color-|ha-card-|ha-dialog-|ha-border-|ha-box-shadow-|ha-space-|ha-font-|ha-line-height-|rgb-|mdc-dialog-scrim-color|accent-color|light-blue-color|amber-color)/;
  for (const [k, v] of [...Object.entries(BUBBLE), ...Object.entries(MUSHROOM)])
    assert.match(v, erlaubt, `${k} zeigt auf etwas Unbekanntes: ${v}`);
});

pruefe("Kein Eintrag zeigt auf sich selbst", () => {
  for (const [k, v] of Object.entries(ZUORDNUNG))
    assert.ok(!v.includes(`--${k}`), `${k} verweist auf sich selbst`);
});

pruefe("Die Toene decken ab, was Mushroom an Farbtoenen braucht", () => {
  // HAs neue Ebene hat nur fuenf Toene. Alles, was Mushroom darueber hinaus
  // liest, muss aus der klassischen Ebene kommen - sonst faellt es aus.
  const gebraucht = Object.entries(MUSHROOM)
    .filter(([k, v]) => k.startsWith("mush-rgb-") && /var\(--rgb-[a-z-]+-color\)/.test(v))
    .map(([, v]) => v.replace(/var\(--rgb-(.+)\)/, "$1"));
  for (const ton of gebraucht)
    assert.ok(TOENE[ton], `${ton} wird gebraucht, steht aber nicht im Tonblock`);
  assert.ok(gebraucht.length >= 10, `nur ${gebraucht.length} Toene geprueft`);
});

assert.ok(n >= 10, `nur ${n} Pruefungen gelaufen - der Test prueft nichts`);
console.log(`\n${n} Pruefungen`);
