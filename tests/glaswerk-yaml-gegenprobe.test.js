// Gegenprobe mit PyYAML - dem Parser, den Home Assistant beim Start benutzt.
//
// Der eigene Parser liest manches klaglos zurueck, was HA in den
// Wiederherstellungsmodus schickt. Diese Pruefung ist deshalb die einzige, die
// wirklich zaehlt; die uebrigen pruefen nur, dass wir uns selbst verstehen.
//
// Faellt python3 oder PyYAML aus, schlaegt der Test FEHL und wird nicht
// uebersprungen: ein Test, der sich selbst stilllegt, war bei HATG schon
// einmal der Grund, warum ein Fehler durchging.

import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { leeresModell, schreibeTheme } from "../custom_components/glaswerk/www/theme.js";

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

const faelle = {
  "mit-anfuehrung": 'content: "A"',
  "mit-backslash": 'content: "\\201C"',
  "endet-backslash": "pfad\\",
  "umlaute": "Grün über Straße",
  "doppelpunkt": "a: b",
  "raute": "#ff9800",
  "klammern": "var(--x, rgba(0,0,0,.5))",
  "leerzeichen-aussen": "  gepolstert  ",
  "prozent": "90%",
  "eckig": "[nicht] {gemeint}",
  // Mehrzeilig. Das ist der Fall, bei dem ein Fehler nicht ein Feld kostet,
  // sondern die ganze Datei: Ein falsch geschriebener Blockskalar schickt
  // Home Assistant beim naechsten Start in den Wiederherstellungsmodus.
  "mehrzeilig": ":host(ha-card) {\n  border: 0;\n  /* Kommentar */\n}\nha-card { color: red }",
  "mehrzeilig-mit-umbruch": "eins\nzwei\n",
  "mehrzeilig-leerzeile": "eins\n\ndrei",
  "mehrzeilig-mit-anfuehrung": 'a::before { content: "x" }\nb { color: #fff }',
};

const m = leeresModell("gegenprobe");
m.flach = { ...faelle };
m.light = { nur_hell: "#ffffff", hell_mehrzeilig: "a {\n  b: 1\n}" };
m.dark = { nur_dunkel: "#000000", dunkel_mehrzeilig: "a {\n  b: 2\n}" };

const ordner = mkdtempSync(path.join(tmpdir(), "glaswerk-"));
const datei = path.join(ordner, "probe.yaml");
writeFileSync(datei, schreibeTheme(m));

const py = `
import json, sys, yaml
d = yaml.safe_load(open(sys.argv[1]))
print(json.dumps(d))
`;
let gelesen;
pruefe("PyYAML liest die erzeugte Datei ueberhaupt", () => {
  const aus = execFileSync("python3", ["-c", py, datei], { encoding: "utf8" });
  gelesen = JSON.parse(aus);
  assert.ok(gelesen && gelesen.gegenprobe, "kein Theme-Block zurueckgekommen");
});

pruefe("Jeder Wert kommt wortgetreu zurueck", () => {
  for (const [k, v] of Object.entries(faelle))
    assert.strictEqual(gelesen.gegenprobe[k], v, `Feld ${k} kam anders zurueck`);
});

pruefe("Die Modus-Ebenen bleiben getrennt", () => {
  assert.strictEqual(gelesen.gegenprobe.modes.light.nur_hell, "#ffffff");
  assert.strictEqual(gelesen.gegenprobe.modes.dark.nur_dunkel, "#000000");
  assert.strictEqual(gelesen.gegenprobe.nur_hell, undefined);
});

pruefe("Gegenprobe: eine falsch maskierte Datei wird abgelehnt", () => {
  // Nur das Anfuehrungszeichen maskiert, den Backslash nicht - genau der
  // Fehler, den HATG bis 1.3.2b25 hatte. PyYAML muss hier aussteigen, sonst
  // prueft der Test oben nichts.
  const kaputt = path.join(ordner, "kaputt.yaml");
  writeFileSync(kaputt, 't:\n  x: "content: \\"\\201C\\""\n');
  assert.throws(() => execFileSync("python3", ["-c", py, kaputt], { encoding: "utf8", stdio: "pipe" }),
    "PyYAML hat eine ungueltige Fluchtfolge angenommen - die Pruefung oben sagt dann nichts");
});

assert.ok(n >= 4, `nur ${n} Pruefungen gelaufen - der Test prueft nichts`);
console.log(`\n${n} Pruefungen`);
