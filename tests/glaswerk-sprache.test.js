// Sprachen der Oberflaeche: Deutsch, Englisch, Franzoesisch, Niederlaendisch,
// Spanisch; alles andere Englisch. Panel und Leiste nach derselben Regel.
// Bis 1.0.1 bekam im Panel jede Sprache ausser Englisch Deutsch (Meldung aus
// dem Forum, 10.11.2026); seit 1.1.0 gibt es fr, nl und es.
//
// Ausserdem: Jeder englische Text, den Panel, Daten und Hilfe zeigen, steht in
// jedem Woerterbuch - sonst erschiene er in fr/nl/es englisch.
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const hier = path.dirname(fileURLToPath(import.meta.url));
const www = path.join(hier, "../custom_components/glaswerk/www");
const { sprachcode, lokal, wahl, WOERTERBUECHER, SPRACHEN } = await import(path.join(www, "sprachen.js"));
const { sprache, texte: texteLeiste } = await import(path.join(www, "glaswerk-bar.js")).catch(() => ({}));

let n = 0;
const pruefe = (was, fn) => { fn(); n++; console.log("ok", was); };

pruefe("Sprachcodes", () => {
  for (const [code, soll] of [["de", "de"], ["de-AT", "de"], ["en", "en"], ["en-GB", "en"], ["fr", "fr"], ["fr-BE", "fr"],
    ["nl", "nl"], ["nl-NL", "nl"], ["es", "es"], ["es-419", "es"], ["it", "en"], ["pt-BR", "en"], [undefined, "en"]]) {
    assert.strictEqual(sprachcode(code), soll, `${code}`);
    if (sprache && code) assert.strictEqual(sprache({ language: code }), soll, `Leiste ${code}`);
  }
});

pruefe("Panel benutzt dieselbe Regel", () => {
  const panel = readFileSync(path.join(www, "glaswerk-panel.js"), "utf8");
  assert.match(panel, /get spr\(\) \{\s*return sprachcode\(/);
});

pruefe("lokal und wahl", () => {
  assert.strictEqual(wahl("Hallo", "Hello", "de"), "Hallo");
  assert.strictEqual(wahl("Hallo", "Hello", "en"), "Hello");
  assert.strictEqual(lokal("gibt es nicht im Woerterbuch", "fr"), "gibt es nicht im Woerterbuch");
});

// Alle englischen Texte einsammeln, wie sie die Oberflaeche zeigt.
const texte = new Set();
const nimm = (s) => { if (typeof s === "string" && /[A-Za-z]{2}/.test(s)) texte.add(s); };
function lauf(o, tiefe = 0) {
  if (!o || typeof o !== "object" || tiefe > 8) return;
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === "string" && /^(en|zweckEn|hinweisEn)$/.test(k)) nimm(v);
    else if (k === "en" && v && typeof v === "object" && !Array.isArray(v)) Object.values(v).forEach(nimm);
    else lauf(v, tiefe + 1);
  }
}
for (const f of ["vorlagen.js", "baukasten.js", "hintergrund.js", "uix.js", "hilfe.js", "zuordnung.js", "bedienelemente.js", "palette.js", "theme.js"]) {
  lauf(await import(path.join(www, f)));
}
const panel = readFileSync(path.join(www, "glaswerk-panel.js"), "utf8");
const a = panel.indexOf("const TEXTE = {"), b = panel.indexOf("// Deutsch ist die Quelle.");
Object.values(eval("(" + panel.slice(a + 14, b).trim().replace(/;$/, "") + ")").en).forEach(nimm);
const hs = readFileSync(path.join(www, "hintergrund-seite.js"), "utf8");
const ha = hs.indexOf("const TEXTE = {"), hb = hs.indexOf("const T = (k, spr)");
Object.values(eval("(" + hs.slice(ha + 14, hb).trim().replace(/;$/, "") + ")")).forEach((v) => nimm(v[1]));

pruefe(`Es gibt Texte zu pruefen (${texte.size})`, () => assert.ok(texte.size > 500));

for (const spr of ["fr", "nl", "es"]) {
  pruefe(`Woerterbuch ${spr} vollstaendig`, () => {
    const w = WOERTERBUECHER[spr];
    const fehlt = [...texte].filter((x) => !w[x]);
    assert.deepStrictEqual(fehlt.slice(0, 5), [], `${fehlt.length} Texte fehlen in ${spr}`);
  });
  pruefe(`Woerterbuch ${spr}: Platzhalter erhalten`, () => {
    const w = WOERTERBUECHER[spr];
    for (const [en, ziel] of Object.entries(w)) {
      for (const p of en.match(/\{[a-z]+\}|\$\{[^}]+\}|--[a-z][a-z0-9-]+/gi) || []) {
        assert.ok(ziel.includes(p), `${spr}: "${p}" fehlt in "${ziel}"`);
      }
    }
  });
}

pruefe("Leiste: texte() liefert jede Sprache und faellt auf Englisch zurueck", () => {
  assert.ok(texteLeiste, "texte() nicht exportiert");
  for (const s of ["de", "en", "fr", "nl", "es"]) assert.ok(texteLeiste(s) && texteLeiste(s).vollbild, s);
  assert.strictEqual(texteLeiste("it"), texteLeiste("en"));
});

pruefe("SPRACHEN", () => assert.deepStrictEqual(SPRACHEN, ["de", "en", "fr", "nl", "es"]));
console.log(`\n${n} Pruefungen`);
