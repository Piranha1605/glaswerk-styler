// Der Umzug der Bilder in HATGs Ordner: custom_components/hats/bilder.py.
//
// Auf Ansage vom 15.10.2026: "koennen wir hier die upload funktion benutzen
// und den upload ordner von HATG verwenden. Dann haben beide systeme den
// selben bilderpfad."
//
// Gefahren mit python3 gegen ein ECHTES Verzeichnis, nicht gegen einen
// Nachbau - es geht um Dateien. Was der Umzug verspricht:
//
//   - jedes Bild liegt danach im neuen Ordner, der alte ist weg
//   - ein Bild, das drueben schon mit demselben Inhalt liegt, wird nicht
//     doppelt abgelegt
//   - gleicher Name, anderer Inhalt: durchgezaehlt, nie ueberschrieben
//   - die Adressen in den EIGENEN Themes ziehen mit, umbenannte eingeschlossen
//   - fremde Themes bleiben unberuehrt
//   - ein zweiter Lauf tut nichts mehr
//
// Faellt python3 aus, schlaegt der Test fehl und wird nicht uebersprungen.

import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const hier = path.dirname(fileURLToPath(import.meta.url));
const MODUL = path.join(hier, "../custom_components/hats/bilder.py");

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

const PYTHON = String.raw`
import importlib.util, json, sys, tempfile
from pathlib import Path

spec = importlib.util.spec_from_file_location("bilder", sys.argv[1])
bilder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bilder)

basis = Path(tempfile.mkdtemp())
alt, neu, themes = basis / "www" / "hats", basis / "www" / "hatg", basis / "themes"
for p in (alt, neu, themes):
    p.mkdir(parents=True)

(alt / "wand.jpg").write_bytes(b"A" * 10)          # zieht um
(alt / "doppelt.jpg").write_bytes(b"B" * 10)       # liegt drueben schon genauso
(neu / "doppelt.jpg").write_bytes(b"B" * 10)
(alt / "streit.jpg").write_bytes(b"C" * 10)        # drueben anderer Inhalt
(neu / "streit.jpg").write_bytes(b"D" * 10)

MARKE = "# Erzeugt mit HATS "
(themes / "meine.yaml").write_text(
    MARKE + "0.2.0\nmeine:\n"
    '  lovelace-background: "url(/local/hats/wand.jpg) fixed"\n'
    '  popup-custom-wallpaper: "url(/local/hats/streit.jpg)"\n', encoding="utf-8")
(themes / "fremde.yaml").write_text(
    "fremde:\n  lovelace-background: \"url(/local/hats/wand.jpg)\"\n", encoding="utf-8")

geschrieben = []
def schreibe(name, text):
    geschrieben.append(name)
    (themes / f"{name}.yaml").write_text(text, encoding="utf-8")

aus = {}
aus["erster"] = bilder.umziehen(alt, neu, themes, "/local/hats", "/local/hatg", MARKE, schreibe)
aus["neu_ordner"] = sorted(p.name for p in neu.iterdir())
aus["alt_weg"] = not alt.exists()
aus["meine"] = (themes / "meine.yaml").read_text()
aus["fremde"] = (themes / "fremde.yaml").read_text()
aus["geschrieben"] = geschrieben
aus["inhalte"] = {p.name: p.read_bytes().decode() for p in sorted(neu.iterdir())}

# Zweiter Lauf: nichts mehr zu tun
aus["zweiter"] = bilder.umziehen(alt, neu, themes, "/local/hats", "/local/hatg", MARKE, schreibe)
aus["nach_zweitem"] = sorted(p.name for p in neu.iterdir())

print(json.dumps(aus))
`;

let aus;
try {
  aus = JSON.parse(execFileSync("python3", ["-c", PYTHON, MODUL], { encoding: "utf8" }));
} catch (e) {
  assert.fail("python3 konnte bilder.py nicht fahren: " + (e.stderr || e.message));
}

pruefe("Jedes Bild liegt danach im neuen Ordner, der alte ist weg", () => {
  assert.deepStrictEqual(aus.neu_ordner, ["doppelt.jpg", "streit-2.jpg", "streit.jpg", "wand.jpg"]);
  assert.ok(aus.alt_weg, "der alte Ordner steht noch da");
  assert.strictEqual(aus.erster.bilder, 2, "nicht zwei Bilder verschoben");
});

pruefe("Gleicher Inhalt wird nicht doppelt abgelegt", () => {
  // Sonst liegt dasselbe Bild zweimal auf der Platte, und der Waehler zeigt
  // es zweimal an.
  assert.strictEqual(aus.erster.doppelt, 1);
  assert.strictEqual(aus.inhalte["doppelt.jpg"], "BBBBBBBBBB");
});

pruefe("Gleicher Name, anderer Inhalt: durchgezaehlt, nichts ueberschrieben", () => {
  // Zwei Bilder mit demselben Namen gehoeren zwei Leuten. Eines davon zu
  // verlieren waere der schwerste Fehler, den dieser Umzug machen kann.
  assert.deepStrictEqual(aus.erster.umbenannt, ["streit.jpg -> streit-2.jpg"]);
  assert.strictEqual(aus.inhalte["streit.jpg"], "DDDDDDDDDD", "das fremde Bild wurde ueberschrieben");
  assert.strictEqual(aus.inhalte["streit-2.jpg"], "CCCCCCCCCC", "das eigene Bild ist weg");
});

pruefe("Die Adressen in der eigenen Theme ziehen mit", () => {
  // Ein Bild, das umgezogen ist, und eines, das dabei umbenannt wurde - beide
  // muessen in der Theme stimmen. Sonst zeigt sie auf nichts, und ein
  // fehlendes Bild tut in CSS einfach nichts.
  assert.match(aus.meine, /url\(\/local\/hatg\/wand\.jpg\)/, "die einfache Adresse steht nicht nach");
  assert.match(aus.meine, /url\(\/local\/hatg\/streit-2\.jpg\)/, "die umbenannte Adresse stimmt nicht");
  assert.doesNotMatch(aus.meine, /local\/hats/, "eine alte Adresse ist stehen geblieben");
  assert.deepStrictEqual(aus.erster.themes, ["meine.yaml"]);
});

pruefe("Eine fremde Theme bleibt unberuehrt", () => {
  // Ohne HATS-Kopf gehoert die Datei jemand anderem - und seine Bilder liegen
  // vielleicht gar nicht in unserem Ordner.
  assert.match(aus.fremde, /local\/hats\/wand\.jpg/, "die fremde Theme wurde angefasst");
  assert.deepStrictEqual(aus.geschrieben, ["meine"], "es wurde mehr geschrieben als die eigene");
});

pruefe("Ein zweiter Lauf tut nichts mehr", () => {
  // Er laeuft bei JEDEM Start. Taete er zweimal etwas, zaehlte er bei jedem
  // Neustart eine Datei hoch.
  assert.deepStrictEqual(aus.zweiter, { bilder: 0, doppelt: 0, umbenannt: [], themes: [] });
  assert.deepStrictEqual(aus.nach_zweitem, aus.neu_ordner, "der Ordner hat sich noch einmal geaendert");
});

console.log(`\n${n} Pruefungen`);
if (n < 6) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }
