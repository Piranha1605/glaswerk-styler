// Forge-Vorlagen: fertige Konfigurationen fuer UIX Forge.
//
// Jede Pruefung hier steht fuer einen Fehler, der eine Vorlage still
// unbrauchbar machen wuerde - sie sieht dann richtig aus und tut nichts.
//
// Die drei, die wirklich wehtun:
//   - `type` in `element` statt in `element_base`: Forge lehnt es ab, die
//     Karte bleibt leer.
//   - Ein Template in `element_base`: Forge reicht es durch, ohne es
//     auszuwerten - der Nutzer sieht die geschweiften Klammern im Klartext.
//   - Ein fester Farbwert statt eines Theme-Felds: Wer die Theme aendert,
//     sieht nichts passieren und sucht an der falschen Stelle.

import assert from "node:assert";
import {
  FORGE_VORLAGEN, FORGE_GRUPPEN, forgeVorlageFuellen, forgeVorlagenDerGruppe,
} from "../custom_components/hats/www/forge-vorlagen.js";

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

// ---------------------------------------------------------------- Grundform

pruefe("es gibt Vorlagen - sonst prueft der Rest nichts", () => {
  assert.ok(FORGE_VORLAGEN.length >= 5, `nur ${FORGE_VORLAGEN.length} Vorlagen`);
});

pruefe("jede Vorlage traegt die Pflichtfelder", () => {
  for (const v of FORGE_VORLAGEN) {
    for (const feld of ["id", "gruppe", "de", "en", "zweckDe", "zweckEn", "yaml"]) {
      assert.ok(v[feld], `${v.id || "?"}: ${feld} fehlt`);
    }
  }
});

pruefe("die Kennungen sind eindeutig", () => {
  const ids = FORGE_VORLAGEN.map((v) => v.id);
  assert.strictEqual(new Set(ids).size, ids.length, "doppelte id: " + ids.join(", "));
});

pruefe("jede Gruppe aus der Liste kommt vor, und keine andere", () => {
  const bekannt = new Set(FORGE_GRUPPEN.map((g) => g.id));
  for (const v of FORGE_VORLAGEN) {
    assert.ok(bekannt.has(v.gruppe), `${v.id}: Gruppe "${v.gruppe}" steht nicht in FORGE_GRUPPEN`);
  }
  for (const g of FORGE_GRUPPEN) {
    assert.ok(forgeVorlagenDerGruppe(g.id).length > 0, `Gruppe ${g.id} ist leer`);
  }
});

// -------------------------------------------------------------- Forge-Regeln

pruefe("jede Vorlage ist eine Forge-Karte mit mold", () => {
  for (const v of FORGE_VORLAGEN) {
    assert.match(v.yaml, /^type: custom:uix-forge$/m, `${v.id}: kein uix-forge`);
    assert.match(v.yaml, /^ {2}mold: /m, `${v.id}: kein mold`);
  }
});

pruefe("jede Vorlage hat element_base - sonst traegt sie keine Karte", () => {
  for (const v of FORGE_VORLAGEN) {
    assert.match(v.yaml, /^element_base:$/m, `${v.id}: kein element_base`);
    assert.match(v.yaml, /^ {2}type: /m, `${v.id}: element_base ohne type`);
  }
});

pruefe("type steht NIE im element-Block", () => {
  // Forge kann type nicht ueberschreiben. Steht er dort, bleibt die Karte leer.
  for (const v of FORGE_VORLAGEN) {
    const ab = v.yaml.indexOf("\nelement:");
    if (ab === -1) continue;
    const block = v.yaml.slice(ab);
    assert.ok(!/^ {2}type: /m.test(block), `${v.id}: type im element-Block`);
  }
});

pruefe("element_base traegt kein Template - Forge wertet es dort nicht aus", () => {
  for (const v of FORGE_VORLAGEN) {
    const ab = v.yaml.indexOf("\nelement_base:");
    const bis = v.yaml.indexOf("\nelement:", ab + 1);
    const block = v.yaml.slice(ab, bis === -1 ? undefined : bis);
    assert.ok(!/\{\{|\{%/.test(block),
      `${v.id}: Template in element_base - das reicht Forge unveraendert durch`);
  }
});

// ------------------------------------------------------------ Theme-Bindung

pruefe("keine festen Farben, wo die Theme ein Feld hat", () => {
  // Regel 3 aus forge-vorlagen.js, dieselbe wie in vorlagen.js.
  for (const v of FORGE_VORLAGEN) {
    const treffer = v.yaml.match(/(background|color|border-color)\s*:\s*(#[0-9a-f]{3,8}|rgba?\()/gi);
    assert.strictEqual(treffer, null,
      `${v.id}: fester Farbwert statt Theme-Feld - ${treffer && treffer.join(", ")}`);
  }
});

pruefe("Weichzeichnung liest das Theme-Feld", () => {
  for (const v of FORGE_VORLAGEN) {
    if (!/backdrop-filter/.test(v.yaml)) continue;
    assert.match(v.yaml, /var\(--ha-card-backdrop-filter/,
      `${v.id}: backdrop-filter ohne var(--ha-card-backdrop-filter)`);
  }
});

pruefe("webkit-Praefix steht neben jedem backdrop-filter", () => {
  // Gezaehlt werden nur EIGENSCHAFTEN am Zeilenanfang, nicht die Nennungen
  // innerhalb von var(--ha-card-backdrop-filter) - sonst zaehlt der Test
  // den Variablennamen mit und schlaegt bei richtigen Vorlagen an.
  for (const v of FORGE_VORLAGEN) {
    const ohne = (v.yaml.match(/^\s*backdrop-filter\s*:/gm) || []).length;
    const mit = (v.yaml.match(/^\s*-webkit-backdrop-filter\s*:/gm) || []).length;
    assert.strictEqual(ohne, mit, `${v.id}: ${ohne}x backdrop-filter, aber ${mit}x mit -webkit-`);
  }
});

// -------------------------------------------------------------- Platzhalter

pruefe("jede Vorlage mit braucht hat den Platzhalter auch im Text", () => {
  for (const v of FORGE_VORLAGEN) {
    if (!v.braucht) continue;
    assert.ok(v.yaml.includes(`<${v.braucht}>`),
      `${v.id}: braucht "${v.braucht}", aber <${v.braucht}> steht nicht im YAML`);
  }
});

pruefe("kein Platzhalter ohne Ankuendigung in braucht", () => {
  for (const v of FORGE_VORLAGEN) {
    const gefunden = [...v.yaml.matchAll(/<([a-z]+)>/g)].map((m) => m[1]);
    for (const p of new Set(gefunden)) {
      assert.strictEqual(p, v.braucht,
        `${v.id}: Platzhalter <${p}>, aber braucht ist "${v.braucht}"`);
    }
  }
});

pruefe("fuellen ersetzt jeden Platzhalter, auch den mehrfachen", () => {
  const v = FORGE_VORLAGEN.find((x) => (x.yaml.match(/<entity>/g) || []).length > 1);
  assert.ok(v, "keine Vorlage mit mehrfachem <entity> - der Test prueft sonst nichts");
  const text = forgeVorlageFuellen(v, { entity: "light.kueche" });
  assert.ok(!text.includes("<entity>"), `${v.id}: Platzhalter blieb stehen`);
  assert.ok(text.includes("light.kueche"), `${v.id}: Wert kam nicht an`);
});

pruefe("fuellen laesst den Platzhalter stehen, wenn der Wert fehlt", () => {
  // Sichtbar stehen lassen ist besser als still leer einsetzen.
  const v = FORGE_VORLAGEN.find((x) => x.braucht === "entity");
  assert.strictEqual(forgeVorlageFuellen(v, {}), v.yaml);
  assert.strictEqual(forgeVorlageFuellen(v, { entity: "" }), v.yaml);
});

// ---------------------------------------------------------------- Gegenprobe

pruefe("Gegenprobe: die Pruefungen schlagen bei kaputten Vorlagen an", () => {
  const kaputt = [
    { id: "x", gruppe: "aussehen", de: "", en: "", zweckDe: "", zweckEn: "",
      yaml: "type: custom:uix-forge\nforge:\n  mold: card\nelement:\n  type: tile" },
  ];
  // type im element-Block muss auffallen
  const block = kaputt[0].yaml.slice(kaputt[0].yaml.indexOf("\nelement:"));
  assert.ok(/^ {2}type: /m.test(block), "die Pruefung auf type im element-Block greift nicht");
  // fester Farbwert muss auffallen
  assert.ok(/(background)\s*:\s*#[0-9a-f]{3}/i.test("background: #fff"),
    "die Pruefung auf feste Farben greift nicht");
});

console.log(`\n${n} Pruefungen, alle gruen`);
