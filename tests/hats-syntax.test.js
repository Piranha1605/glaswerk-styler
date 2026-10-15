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

// ---------------------------------------------------------------------------
// Die zweite Falle derselben Familie: benutzt, bevor es da ist.
//
// Am 15.10.2026 bezahlt. In zeichneBaukasten() stand eine neue Zeile, die
// `dunkel` las - zwei Zeilen VOR dem `const dunkel = ...`. Das ist gueltige
// Syntax, also kommt es durch jeden Parser; erst im Browser kam
//
//     Uncaught ReferenceError: Cannot access 'dunkel' before initialization
//
// und der Baukasten ging gar nicht mehr auf. Kein Test hat es gesehen, denn
// die Tests lesen die Quelle als TEXT - sie fuehren sie nicht aus.
//
// Diese Pruefung schliesst die Luecke fuer den Fall, der dabei auftrat: eine
// Konstante der obersten Ebene einer Methode, die weiter oben schon gelesen
// wird. Sie prueft nicht alles (eine Zuweisung in einer verschachtelten
// Funktion, die spaeter laeuft, ist erlaubt und faellt hier nicht auf) - aber
// genau diesen Fehler faengt sie, und der kostete den Baukasten.
// Zeichenketten und Kommentare werden GEWEISST, nicht entfernt: Die Stellen
// muessen vergleichbar bleiben. Drei falsche Treffer hat der erste Entwurf
// dieser Pruefung gemeldet, und alle drei waren Text, kein Code:
//
//     "Welches Teil sitzt gerade?"     ein Kommentar
//     data-bk-seite="${schluessel}"    ein Attributname mit Bindestrich
//     accept=".yaml,text/plain"        ein Wort in einer Zeichenkette
//
// In einer Schablone bleibt stehen, was in ${...} steht - das IST Code.
function maskiere(t) {
  let aus = "", i = 0, art = null;
  while (i < t.length) {
    const c = t[i];
    if (!art) {
      if (c === '"' || c === "'" || c === "`") { art = c; aus += " "; i++; continue; }
      if (c === "/" && t[i + 1] === "/") { while (i < t.length && t[i] !== "\n") { aus += " "; i++; } continue; }
      if (c === "/" && t[i + 1] === "*") { const e = t.indexOf("*/", i + 2);
        const bis = e < 0 ? t.length : e + 2;
        for (; i < bis; i++) aus += t[i] === "\n" ? "\n" : " ";
        continue; }
      aus += c; i++; continue;
    }
    if (c === "\\") { aus += "  "; i += 2; continue; }
    if (art === "`" && c === "$" && t[i + 1] === "{") {
      aus += "  "; i += 2;
      let tiefe = 1;
      while (i < t.length && tiefe > 0) {
        if (t[i] === "{") tiefe++;
        else if (t[i] === "}") { tiefe--; if (!tiefe) { aus += " "; i++; break; } }
        aus += t[i]; i++;
      }
      continue;
    }
    if (c === art) { art = null; aus += " "; i++; continue; }
    aus += c === "\n" ? "\n" : " "; i++;
  }
  return aus;
}

pruefe("Keine Konstante wird vor ihrer Zeile gelesen", () => {
  const quelle = readFileSync(path.join(wwwDir, "hats-panel.js"), "utf8");
  // Methoden einer Klasse: zwei Leerzeichen Einzug, ihr Rumpf vier.
  const methoden = [...quelle.matchAll(/^  (?:async )?([a-zA-Z_$][\w$]*)\([^)]*\) \{$/gm)];
  let geprueft = 0;
  for (const m of methoden) {
    const ab = m.index + m[0].length;
    const ende = quelle.indexOf("\n  }\n", ab);
    if (ende < 0) continue;
    const rumpf = maskiere(quelle.slice(ab, ende));
    // Die Namen, die als Parameter einer inneren Funktion vorkommen:
    // (a, b) => ... und function f(a, b) { ... }
    const parameter = new Set();
    for (const re of [/\(([^()]*)\)\s*=>/g, /function\s*[\w$]*\s*\(([^()]*)\)/g])
      for (const m of rumpf.matchAll(re))
        for (const teil of m[1].split(","))
          if (/^\s*[a-zA-Z_$][\w$]*\s*$/.test(teil)) parameter.add(teil.trim());
    for (const d of rumpf.matchAll(/^    const (?:\{ )?([a-zA-Z_$][\w$]*)/gm)) {
      const name = d[1];
      // UEBERSPRUNGEN wird, was derselbe Name in einem anderen
      // Gueltigkeitsbereich sein koennte: Ein Parameter einer inneren
      // Funktion verdeckt die aeussere Konstante, und sein Auftreten weiter
      // oben ist voellig richtig - in oeffneFeld() etwa `(v, modus) => ...`
      // neben einem spaeteren `const v`.
      //
      // GESAMMELT WERDEN NUR ECHTE PARAMETERLISTEN. Der erste Entwurf nahm
      // jede Klammer mit Kommas, also auch den AUFRUF palettenVorschau(teil,
      // dunkel) - und uebersprang damit ausgerechnet `dunkel`, den Namen,
      // dessentwegen diese Pruefung entstanden ist. Die Gegenprobe unten hat
      // es gezeigt: Sie blieb gruen, obwohl der Fehler wieder drin war.
      if (name.length < 3 || parameter.has(name)) continue;
      // Nicht als Wortgrenze zaehlen: der Bindestrich (sonst traefe `seite`
      // mitten in data-bk-seite) und der Punkt davor (x.v ist ein Zugriff
      // auf eine Eigenschaft, keine Benutzung der Konstanten v).
      const erste = rumpf.search(new RegExp(`(?<![\\w$\\-.])${name}(?![\\w$-])`));
      geprueft++;
      assert.ok(erste >= d.index,
        `${m[1]}(): "${name}" wird gelesen, bevor es deklariert ist ` +
        `(Zeichen ${erste} statt ${d.index}) - im Browser ein ReferenceError`);
    }
  }
  assert.ok(geprueft > 50, `nur ${geprueft} Konstanten geprueft - der Leser trifft nichts`);
});

console.log(`\n${n} Pruefungen`);
if (n < 5) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }
