// Die Palettenrechnung. Der strengste Test ist der Rueckweg: fuettert man HAs
// eigene Farbe hinein, muss HAs eigene Rampe herauskommen. Tut sie das nicht,
// taugt das Profil nicht.

import assert from "node:assert";
import { rampe, hexZuHsl, hslZuHex, STUFEN, HA_PROFIL } from "../custom_components/hats/www/palette.js";

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

// HAs eigene Stufe 60 je Rolle, aus docs/beispiele/ha-blanko.yaml
const HA_60 = { primary: "#37c8fd", neutral: "#989898", red: "#f3676c", green: "#00ac49", orange: "#f36d00" };
// und HAs eigene volle Rampen, soweit fuer die Pruefung gebraucht
const HA_NEUTRAL = ["#141414", "#202020", "#363636", "#4a4a4a", "#5e5e5e", "#7a7a7a", "#989898"];

function abstand(a, b) {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  return Math.max(
    Math.abs(((x >> 16) & 255) - ((y >> 16) & 255)),
    Math.abs(((x >> 8) & 255) - ((y >> 8) & 255)),
    Math.abs((x & 255) - (y & 255)));
}

pruefe("Neutral reproduziert HAs Rampe exakt", () => {
  const r = Object.values(rampe("#5e5e5e", "neutral"));
  HA_NEUTRAL.forEach((soll, i) => assert.strictEqual(r[i], soll, `Stufe ${STUFEN[i]}`));
});

pruefe("Jede Rolle trifft ihre eigene Stufe 60 nah", () => {
  // Nicht exakt: HAs Rampen sind von Hand abgestimmt, die Rechnung ist eine
  // Annaeherung. Zehn Stufen Abweichung je Kanal sind akzeptabel.
  for (const [rolle, hex] of Object.entries(HA_60)) {
    const r = rampe(hex, rolle);
    const d = abstand(r[`ha-color-${rolle}-60`], hex);
    assert.ok(d <= 10, `${rolle}: ${r[`ha-color-${rolle}-60`]} statt ${hex}, Abstand ${d}`);
  }
});

pruefe("Die Helligkeit steigt mit der Stufennummer, ohne Ausreisser", () => {
  for (const rolle of Object.keys(HA_PROFIL)) {
    const werte = Object.values(rampe("#3388cc", rolle));
    let vorher = -1;
    werte.forEach((hex, i) => {
      const l = hexZuHsl(hex).l;
      assert.ok(l > vorher, `${rolle} Stufe ${STUFEN[i]}: ${l} nicht heller als ${vorher}`);
      vorher = l;
    });
  }
});

pruefe("Jeder Wert ist sechsstelliges Hex - sonst gibt es kein RGB-Tripel", () => {
  // Home Assistant leitet --rgb-<name> nur aus Werten ab, die mit # beginnen.
  // Mushroom baut seine Zustandsfarben aus genau diesen Tripeln.
  for (const rolle of Object.keys(HA_PROFIL))
    for (const [k, v] of Object.entries(rampe("#ff9800", rolle)))
      assert.match(v, /^#[0-9a-f]{6}$/, `${k} = ${v}`);
});

pruefe("Elf Stufen mit den richtigen Namen", () => {
  const r = rampe("#ff9800", "orange");
  assert.strictEqual(Object.keys(r).length, 11);
  assert.deepStrictEqual(Object.keys(r), STUFEN.map((s) => `ha-color-orange-${s}`));
});

pruefe("Der Farbton des Nutzers bleibt erhalten", () => {
  const r = rampe("#cc3388", "primary");
  const soll = hexZuHsl("#cc3388").h;
  for (const st of ["30", "50", "70"]) {
    const h = hexZuHsl(r[`ha-color-primary-${st}`]).h;
    assert.ok(Math.abs(h - soll) < 2, `Stufe ${st}: ${h} statt ${soll}`);
  }
});

pruefe("Neutral bleibt grau, egal welche Farbe hineingeht", () => {
  for (const [k, v] of Object.entries(rampe("#cc3388", "neutral")))
    assert.strictEqual(hexZuHsl(v).s, 0, `${k} = ${v} ist nicht grau`);
});

pruefe("Unsinn liefert null statt einer erfundenen Rampe", () => {
  assert.strictEqual(rampe("kein hex", "orange"), null);
  assert.strictEqual(rampe("#ff9800", "gibtesnicht"), null);
  // Gegenprobe: gueltige Eingabe liefert sehr wohl etwas
  assert.ok(rampe("#ff9800", "orange"));
});

pruefe("hexZuHsl und hslZuHex sind zueinander umkehrbar", () => {
  for (const hex of ["#ff9800", "#37c8fd", "#00ac49", "#141414", "#ffffff"]) {
    const { h, s, l } = hexZuHsl(hex);
    assert.ok(abstand(hslZuHex(h, s, l), hex) <= 1, `${hex} -> ${hslZuHex(h, s, l)}`);
  }
});

assert.ok(n >= 9, `nur ${n} Pruefungen gelaufen - der Test prueft nichts`);
console.log(`\n${n} Pruefungen`);
