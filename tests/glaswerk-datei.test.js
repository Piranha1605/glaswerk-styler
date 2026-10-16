// Sicheres Schreiben einer Theme-Datei: custom_components/glaswerk/datei.py.
//
// Gefahren mit python3 gegen ein echtes Verzeichnis, nicht gegen einen
// Nachbau - es geht um Dateien, also wird auf der Platte geprueft. Was
// datei.py verspricht:
//
//   - eine neue Fassung ersetzt die alte in einem Schritt; bricht es ab, steht
//     die alte unberuehrt da
//   - vor jedem Ueberschreiben liegt die alte Fassung in sicherungen/<name>/
//   - nur die letzten zehn bleiben, und Sicherungen zweier Themes mischen sich
//     nicht
//   - im Themes-Ordner liegt danach nie etwas anderes als <name>.yaml
//
// Faellt python3 aus, schlaegt der Test fehl und wird nicht uebersprungen.

import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const hier = path.dirname(fileURLToPath(import.meta.url));
const MODUL = path.join(hier, "../custom_components/glaswerk/datei.py");

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

const PYTHON = String.raw`
import importlib.util, json, os, sys, tempfile
from datetime import datetime, timedelta
from pathlib import Path

spec = importlib.util.spec_from_file_location("datei", sys.argv[1])
datei = importlib.util.module_from_spec(spec)
spec.loader.exec_module(datei)

aus = {}
basis = Path(tempfile.mkdtemp())
themes, sich = basis / "themes", basis / "glaswerk" / "sicherungen"
t0 = datetime(2026, 10, 14, 20, 0, 0)
inhalt = lambda: sorted(p.name for p in themes.iterdir())

# 1. Neu anlegen, dann ohne ueberschreiben: abgewiesen, Datei unberuehrt
aus["neu"] = datei.theme_schreiben(themes, sich, "glas", "a: 1\n", False, t0)
aus["ohne"] = datei.theme_schreiben(themes, sich, "glas", "a: 2\n", False, t0)
aus["nach_ohne"] = (themes / "glas.yaml").read_text()
aus["sicherungen_nach_neu"] = len(datei.sicherungen_von(sich, "glas"))

# 2. Ueberschreiben: neue Fassung da, alte gesichert, nichts liegen geblieben
aus["ueber"] = datei.theme_schreiben(themes, sich, "glas", "a: 2\n", True, t0 + timedelta(seconds=1))
aus["nach_ueber"] = (themes / "glas.yaml").read_text()
s = datei.sicherungen_von(sich, "glas")
aus["sicherung"] = [p.name for p in s]
aus["sicherung_inhalt"] = s[0].read_text()
aus["ordner_nach_ueber"] = inhalt()

# 3. Derselbe Text noch einmal: keine neue Sicherung
datei.theme_schreiben(themes, sich, "glas", "a: 2\n", True, t0 + timedelta(seconds=2))
aus["gleich"] = len(datei.sicherungen_von(sich, "glas"))

# 4. Zweimal in derselben Sekunde: zwei Sicherungen, keine ueberschreibt die andere
datei.theme_schreiben(themes, sich, "glas", "a: 3\n", True, t0 + timedelta(seconds=5))
datei.theme_schreiben(themes, sich, "glas", "a: 4\n", True, t0 + timedelta(seconds=5))
s = datei.sicherungen_von(sich, "glas")
aus["selbe_sekunde"] = [p.name for p in s[:2]]
aus["selbe_sekunde_inhalt"] = [p.read_text() for p in s[:2]]

# 5. Zwoelf weitere: es bleiben zehn, die neuesten
for i in range(12):
    datei.theme_schreiben(themes, sich, "glas", f"a: {100 + i}\n", True, t0 + timedelta(minutes=1 + i))
s = datei.sicherungen_von(sich, "glas")
aus["behalten"] = len(s)
aus["neueste"] = s[0].read_text()
aus["aelteste"] = s[-1].read_text()

# 6. Eine zweite Theme mit gleichem Anfang mischt sich nicht ein
datei.theme_schreiben(themes, sich, "glas-dunkel", "b: 1\n", True, t0)
datei.theme_schreiben(themes, sich, "glas-dunkel", "b: 2\n", True, t0 + timedelta(seconds=1))
aus["andere"] = len(datei.sicherungen_von(sich, "glas-dunkel"))
aus["glas_unveraendert"] = len(datei.sicherungen_von(sich, "glas"))

# 7. Bricht das Ersetzen ab, steht die alte Datei unberuehrt da
vorher = (themes / "glas.yaml").read_text()
echt = os.replace
def kaputt(*a, **k):
    aus["hilfsname"] = Path(a[0]).name
    raise OSError("Platte voll")
os.replace = kaputt
try:
    datei.theme_schreiben(themes, sich, "glas", "kaputt: ja\n", True, t0 + timedelta(hours=1))
    aus["abbruch"] = "kein Fehler"
except OSError as e:
    aus["abbruch"] = str(e)
os.replace = echt
aus["nach_abbruch"] = (themes / "glas.yaml").read_text() == vorher
aus["ordner_nach_abbruch"] = inhalt()

# 8. Im Themes-Ordner liest HA nur *.yaml - und es gibt nur die Themes selbst
aus["yaml_im_ordner"] = sorted(p.name for p in themes.rglob("*.yaml"))
aus["sicherungen_ausserhalb"] = not str(sich).startswith(str(themes))

print(json.dumps(aus))
`;

let aus;
try {
  aus = JSON.parse(execFileSync("python3", ["-c", PYTHON, MODUL], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }));
} catch (e) {
  assert.fail("python3 lief nicht durch: " + String(e.stderr || e.message).trim().split("\n").slice(-4).join(" | "));
}

pruefe("Eine neue Theme wird angelegt, ohne Freigabe nicht ueberschrieben", () => {
  assert.strictEqual(aus.neu, null);
  assert.strictEqual(aus.ohne, "exists");
  assert.strictEqual(aus.nach_ohne, "a: 1\n");
  // Eine neue Datei hat nichts zu sichern.
  assert.strictEqual(aus.sicherungen_nach_neu, 0);
});

pruefe("Ueberschreiben sichert die alte Fassung, mit Zeit im Namen", () => {
  assert.strictEqual(aus.ueber, null);
  assert.strictEqual(aus.nach_ueber, "a: 2\n");
  assert.deepStrictEqual(aus.sicherung, ["20261014-200001.yaml"]);
  assert.strictEqual(aus.sicherung_inhalt, "a: 1\n");
});

pruefe("Neben der Theme bleibt keine Hilfsdatei liegen", () => {
  assert.deepStrictEqual(aus.ordner_nach_ueber, ["glas.yaml"]);
});

pruefe("Derselbe Text noch einmal legt keine Sicherung an", () => {
  // Sonst verdraengten zehn Klicks ohne Aenderung die Fassung, die man will.
  assert.strictEqual(aus.gleich, 1);
});

pruefe("Zwei Speicher in derselben Sekunde ueberschreiben einander nicht - die spaetere zuerst", () => {
  // Die Reihenfolge steht hier ausgeschrieben, nicht nachgerechnet: Nach dem
  // Namen sortiert kaeme "200005.yaml" vor "200005-2.yaml", und das ist falsch.
  assert.deepStrictEqual(aus.selbe_sekunde, ["20261014-200005-2.yaml", "20261014-200005.yaml"]);
  assert.deepStrictEqual(aus.selbe_sekunde_inhalt, ["a: 3\n", "a: 2\n"]);
});

pruefe("Es bleiben zehn Sicherungen, die neuesten", () => {
  assert.strictEqual(aus.behalten, 10);
  // Die neueste Sicherung ist die Fassung VOR dem letzten Schreiben.
  assert.strictEqual(aus.neueste, "a: 110\n");
  assert.strictEqual(aus.aelteste, "a: 101\n");
});

pruefe("Zwei Themes mit gleichem Anfang halten ihre Sicherungen getrennt", () => {
  assert.strictEqual(aus.andere, 1);
  assert.strictEqual(aus.glas_unveraendert, 10);
});

pruefe("Bricht das Ersetzen ab, steht die alte Datei unberuehrt - und keine Hilfsdatei", () => {
  assert.strictEqual(aus.abbruch, "Platte voll");
  assert.strictEqual(aus.nach_abbruch, true);
  assert.deepStrictEqual(aus.ordner_nach_abbruch, ["glas-dunkel.yaml", "glas.yaml"]);
});

pruefe("Die Hilfsdatei ist nie als Theme lesbar - versteckt und ohne .yaml am Ende", () => {
  // Bleibt sie nach einem Absturz liegen, darf HA sie beim Start nicht laden.
  assert.ok(aus.hilfsname, "das Umbenennen wurde nicht abgefangen");
  assert.ok(aus.hilfsname.startsWith("."), aus.hilfsname);
  assert.ok(!aus.hilfsname.endsWith(".yaml"), aus.hilfsname);
});

pruefe("Im Themes-Ordner gibt es nur die Themes, die Sicherungen liegen ausserhalb", () => {
  assert.deepStrictEqual(aus.yaml_im_ordner, ["glas-dunkel.yaml", "glas.yaml"]);
  assert.strictEqual(aus.sicherungen_ausserhalb, true);
});

console.log(`\n${n} Pruefungen`);
if (n < 10) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }
