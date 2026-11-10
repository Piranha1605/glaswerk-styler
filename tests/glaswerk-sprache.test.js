// Panel und Leiste waehlen die Sprache nach derselben Regel: Deutsch nur bei
// deutscher Oberflaeche, alles andere Englisch. Bis 1.0.1 bekam im Panel jede
// Sprache ausser Englisch Deutsch (Meldung aus dem Forum, 10.11.2026).
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const hier = path.dirname(fileURLToPath(import.meta.url));
const panel = readFileSync(path.join(hier, "../custom_components/glaswerk/www/glaswerk-panel.js"), "utf8");
const getter = /get spr\(\) \{([\s\S]*?)\n  \}/.exec(panel);
assert.ok(getter, "get spr() im Panel nicht gefunden");
const spr = new Function("hass", getter[1].replace(/this\._hass/g, "hass"));

const { sprache } = await import("../custom_components/glaswerk/www/glaswerk-bar.js").catch(() => ({}));

let n = 0;
for (const [sprachcode, erwartet] of [["de", "de"], ["de-AT", "de"], ["en", "en"], ["en-GB", "en"], ["fr", "en"], ["nl", "en"], ["it", "en"], [undefined, "en"]]) {
  const hass = sprachcode ? { language: sprachcode } : {};
  assert.strictEqual(spr(hass), erwartet, `Panel bei ${sprachcode}: ${spr(hass)} statt ${erwartet}`);
  if (sprache) assert.strictEqual(sprache(hass === undefined ? {} : hass), erwartet === "de" ? "de" : (sprachcode ? "en" : sprache({})), `Leiste bei ${sprachcode}`);
  n++;
  console.log("ok", `${sprachcode ?? "(keine)"} -> ${erwartet}`);
}
assert.ok(n === 8);
console.log(`\n${n} Pruefungen`);
