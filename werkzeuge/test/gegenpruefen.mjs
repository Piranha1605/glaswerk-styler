// Zwei Themes Feld fuer Feld vergleichen.
//
//   node werkzeuge/test/gegenpruefen.mjs <soll.yaml> <ist.yaml>
//   node werkzeuge/test/gegenpruefen.mjs werkzeuge/themes/liquid_glass.yaml \
//        werkzeuge/sicherungen/von-der-maschine/liquid_glass_kopie.yaml
//
// Wozu: Am 13.10.2026 wurde die laufende Theme einmal komplett ueber das Panel
// nachgebaut. Erst dieser Vergleich hat drei Fehler gezeigt, die beim
// Draufschauen unsichtbar waren - die Palettenteile faerbten HAs Rampe um, der
// Kartenstil hoerte an der Kartenkante auf, und teilAnwenden verschluckte die
// Textfarben einer Palette. Die Theme sah dabei jedes Mal gut aus.
//
// DAS IST DER PUNKT: Eine Theme, die falsch ist, sieht nicht falsch aus. Sie
// sieht nur anders aus - und wer sie nicht gegen eine Referenz haelt, merkt es
// nicht. Deshalb gehoert dieser Lauf zu jedem neuen Modul.
//
// Was NICHT als Fehler gilt:
//   uix-theme      traegt den eigenen Theme-Namen, muss also abweichen
//   Kopfkommentar  Zeitstempel und Version stehen darin

import { readFileSync } from "node:fs";
import { leseTheme } from "../../custom_components/hats/www/theme.js";

const [sollPfad, istPfad] = process.argv.slice(2);
if (!sollPfad || !istPfad) {
  console.error("Aufruf: gegenpruefen.mjs <soll.yaml> <ist.yaml>");
  process.exit(2);
}

const soll = leseTheme(readFileSync(sollPfad, "utf8"));
const ist = leseTheme(readFileSync(istPfad, "utf8"));

// Felder, deren Abweichung keine ist.
const ERLAUBT = new Set(["uix-theme"]);

const kurz = (s, n = 54) => { const t = String(s); return t.length > n ? t.slice(0, n - 3) + "..." : t; };

let gleich = 0;
const anders = [], fehlt = [], zuviel = [], geduldet = [];

for (const ebene of ["flach", "light", "dark"]) {
  const s = soll[ebene] || {}, i = ist[ebene] || {};
  for (const [name, wert] of Object.entries(s)) {
    if (!(name in i)) { fehlt.push([ebene, name, wert]); continue; }
    if (String(i[name]) === String(wert)) { gleich++; continue; }
    (ERLAUBT.has(name) ? geduldet : anders).push([ebene, name, i[name], wert]);
  }
  for (const name of Object.keys(i)) if (!(name in s)) zuviel.push([ebene, name, i[name]]);
}

const rot = (t) => `\x1b[31m${t}\x1b[0m`, gruen = (t) => `\x1b[32m${t}\x1b[0m`;

console.log(`soll  ${sollPfad}`);
console.log(`ist   ${istPfad}`);
console.log();
console.log(`  stimmt      ${String(gleich).padStart(4)}`);
console.log(`  abweichend  ${String(anders.length).padStart(4)}` + (anders.length ? rot("  <--") : ""));
console.log(`  fehlt       ${String(fehlt.length).padStart(4)}` + (fehlt.length ? rot("  <--") : ""));
console.log(`  zu viel     ${String(zuviel.length).padStart(4)}` + (zuviel.length ? rot("  <--") : ""));
if (geduldet.length) console.log(`  geduldet    ${String(geduldet.length).padStart(4)}  (${geduldet.map((g) => g[1]).join(", ")})`);

for (const [ebene, name, i, s] of anders) {
  console.log(`\n  ${rot("!")} ${ebene}/${name}`);
  console.log(`      ist   ${kurz(i)}`);
  console.log(`      soll  ${kurz(s)}`);
}
for (const [ebene, name, wert] of fehlt) console.log(`\n  ${rot("-")} ${ebene}/${name}  =  ${kurz(wert)}`);
for (const [ebene, name, wert] of zuviel) console.log(`\n  ${rot("+")} ${ebene}/${name}  =  ${kurz(wert)}`);

const schlimm = anders.length + fehlt.length + zuviel.length;
console.log();
console.log(schlimm === 0 ? gruen("Deckungsgleich.") : rot(`${schlimm} Abweichungen.`));
process.exit(schlimm === 0 ? 0 : 1);
