// Jede Datei des Panels muss als ES-Modul parsen.
//
// Warum eine eigene Pruefung dafuer: `node --check <datei>` reicht NICHT.
// Am 12.10.2026 gemessen - eine doppelte Deklaration im selben
// Gueltigkeitsbereich (ein const mit dem Namen eines Parameters) kam damit
// durch, und erst der Browser warf
//
//     Uncaught SyntaxError: Identifier 'schluessel' has already been declared
//
// Dann laedt die Datei gar nicht, und das Panel bleibt eine leere Flaeche.
// Dieselbe Quelle ueber stdin mit --input-type=module geparst faellt sofort
// auf. Gegenprobe unten.

import assert from "node:assert";
import { readFileSync, readdirSync, writeFileSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const hier = path.dirname(fileURLToPath(import.meta.url));
const wwwDir = path.join(hier, "../custom_components/hats/www");

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

function parst(quelle) {
  try {
    execFileSync(process.execPath, ["--input-type=module", "--check"],
                 { input: quelle, stdio: ["pipe", "pipe", "pipe"] });
    return null;
  } catch (e) {
    // Nicht zu knapp schneiden: Die eigentliche Meldung steht erst nach der
    // Quellzeile und dem Zeiger darauf - mit vier Zeilen fehlte sie.
    return String(e.stderr || e.message).split("\n").slice(0, 10).join(" ").trim();
  }
}

const dateien = readdirSync(wwwDir).filter((f) => f.endsWith(".js"));

pruefe("Es gibt ueberhaupt Dateien zu pruefen", () => {
  assert.ok(dateien.length >= 4, `nur ${dateien.length} Datei(en) gefunden`);
});

for (const f of dateien) {
  pruefe(`${f} parst als Modul`, () => {
    const fehler = parst(readFileSync(path.join(wwwDir, f), "utf8"));
    assert.strictEqual(fehler, null, `${f}: ${fehler}`);
  });
}

pruefe("Gegenprobe: eine doppelte Deklaration faellt auf", () => {
  // Genau der Fall, der durchgerutscht ist.
  const fehler = parst("export function f(schluessel) { const schluessel = 1; return schluessel; }");
  assert.ok(fehler, "Die Pruefung findet eine doppelte Deklaration nicht");
  assert.match(fehler, /already been declared/);
});

pruefe("Und node --check allein findet sie wirklich nicht", () => {
  // Haelt fest, WARUM diese Datei existiert. Sollte node irgendwann strenger
  // werden, faellt diese Pruefung um - dann ist der Umweg ueber stdin
  // ueberfluessig geworden, und das soll man sehen statt es zu erben.
  const probe = path.join(hier, ".syntax-probe.js");
  writeFileSync(probe, "export function f(a) { const a = 1; return a; }\n");
  let durchgelassen = false;
  try {
    execFileSync(process.execPath, ["--check", probe], { stdio: "pipe" });
    durchgelassen = true;
  } catch { /* gefunden - dann ist die strenge Pruefung nicht mehr noetig */ }
  finally { unlinkSync(probe); }
  assert.ok(durchgelassen,
    "node --check ist streng geworden - tests/hats-syntax.test.js kann vereinfacht werden");
});

console.log(`\n${n} Pruefungen`);
if (n < 5) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }
