// Die Steuerkarte in Home Assistants Ressourcenliste: anlegen, erneuern,
// nichts doppelt, Fremdes in Ruhe lassen, beim Entfernen aufraeumen.
//
// Geprueft wird der Abgleich aus custom_components/hats/karte.py, und zwar
// mit python3 gegen einen Nachbau der Liste. Der Nachbau folgt Home
// Assistants resources.py von 2026.10.1, am 13.10.2026 an der Testmaschine
// gelesen - samt der Eigenheit, an der ein naiver Abgleich scheitert:
// async_items() laedt die Liste NICHT. Vor dem ersten Laden ist sie leer.
//
// Faellt python3 aus, schlaegt der Test fehl und wird nicht uebersprungen.

import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const hier = path.dirname(fileURLToPath(import.meta.url));
const wurzel = path.join(hier, "..");
const lies = (p) => readFileSync(path.join(wurzel, p), "utf8");

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

const PYTHON = String.raw`
import asyncio, importlib.util, sys, uuid

spec = importlib.util.spec_from_file_location("karte", sys.argv[1])
karte = importlib.util.module_from_spec(spec)
spec.loader.exec_module(karte)

class Liste:
    """Home Assistants ResourceStorageCollection, soweit die Karte sie sieht."""
    def __init__(self, gespeichert=()):
        self._gespeichert = [dict(e) for e in gespeichert]   # liegt "auf der Platte"
        self.data = {}                                       # leer bis zum Laden
        self.loaded = False
        self.schreiben = []                                  # jeder Schreibzugriff
    async def _laden(self):
        if not self.loaded:
            self.data = {e["id"]: e for e in self._gespeichert}
            self.loaded = True
    async def async_get_info(self):
        await self._laden()
        return {"resources": len(self.data)}
    def async_items(self):
        return list(self.data.values())
    async def async_create_item(self, data):
        await self._laden()
        assert set(data) == {"res_type", "url"}, data
        e = {"id": uuid.uuid4().hex, "type": data["res_type"], "url": data["url"]}
        self.data[e["id"]] = e
        self.schreiben.append(("create", e["url"]))
        return e
    async def async_update_item(self, item_id, updates):
        await self._laden()
        assert set(updates) <= {"res_type", "url"}, updates
        u = dict(updates)
        if "res_type" in u: u["type"] = u.pop("res_type")
        self.data[item_id] = {**self.data[item_id], **u}
        self.schreiben.append(("update", item_id))
        return self.data[item_id]
    async def async_delete_item(self, item_id):
        await self._laden()
        del self.data[item_id]
        self.schreiben.append(("delete", item_id))
    def neustart(self):
        """Dieselben Daten, aber eine frische, ungeladene Liste."""
        # Eine Liste, die selbst nie geladen wurde, hat ihre Daten noch "auf
        # der Platte". Ohne diese Unterscheidung gaebe neustart() dann eine
        # LEERE Liste zurueck - der erste Lauf dieser Datei ist daran
        # gescheitert, und zwar am Nachbau, nicht am Abgleich.
        return Liste(self.data.values() if self.loaded else self._gespeichert)

EINS = "/hats_static/hats-control-card.js?v=0.2.0b3.aaaaaaaa"
ZWEI = "/hats_static/hats-control-card.js?v=0.2.0b3.bbbbbbbb"
FREMD = [
    {"id": "fremd-1", "type": "module", "url": "/hacsfiles/Bubble-Card/bubble-card.js?hacstag=1"},
    {"id": "fremd-2", "type": "module", "url": "/hacsfiles/lovelace-mushroom/mushroom.js"},
    # Sieht aehnlich aus und ist es nicht: derselbe Dateiname an anderem Ort,
    # und ein Name, der nur mit unserem BEGINNT.
    {"id": "fremd-3", "type": "module", "url": "/local/hats-control-card.js"},
    {"id": "fremd-4", "type": "module", "url": "/hats_static/hats-control-card.js.map"},
]
# "fremd-" und nicht bloss "f": Die Liste vergibt ihre IDs als uuid4().hex, und
# jede sechzehnte davon beginnt mit f. Der eigene Eintrag gaelte dann als
# fremd, und die Pruefung fiele in einem von sechzehn Laeufen um.
ist_fremd = lambda e: e["id"].startswith("fremd-")
fremde = lambda l: sorted(e["id"] for e in l.async_items() if ist_fremd(e))
eigene = lambda l: [e for e in l.async_items() if not ist_fremd(e)]
n = 0
def ok(was):
    global n; n += 1; print("ok", was)

async def lauf():
    # 1. Leere Liste
    l = Liste()
    assert await karte.ressource_abgleichen(l, EINS) == "angelegt"
    assert [(e["type"], e["url"]) for e in l.async_items()] == [("module", EINS)]
    ok("In eine leere Liste kommt genau ein Eintrag, als Modul")

    # 2. Noch einmal dasselbe: nichts wird geschrieben
    l.schreiben.clear()
    assert await karte.ressource_abgleichen(l, EINS) == "unveraendert"
    assert l.schreiben == [], l.schreiben
    ok("Ein zweiter Lauf mit derselben Adresse schreibt nichts")

    # 3. Nach einem Neustart ist die Liste ungeladen - und trotzdem kein Doppel
    l2 = l.neustart()
    assert l2.async_items() == [], "der Nachbau laedt von selbst - die Pruefung waere leer"
    assert await karte.ressource_abgleichen(l2, EINS) == "unveraendert"
    assert len(l2.async_items()) == 1 and l2.schreiben == []
    ok("Nach einem Neustart entsteht kein zweiter Eintrag")

    # 4. Neue Pruefsumme: derselbe Eintrag, neue Adresse
    vorher = l2.async_items()[0]["id"]
    assert await karte.ressource_abgleichen(l2, ZWEI) == "erneuert"
    assert [(e["id"], e["url"]) for e in l2.async_items()] == [(vorher, ZWEI)]
    ok("Eine neue Pruefsumme erneuert den Eintrag, statt einen zweiten anzulegen")

    # 5. Fremdes bleibt woertlich stehen
    l3 = Liste(FREMD)
    davor = [dict(e) for e in FREMD]
    assert await karte.ressource_abgleichen(l3, EINS) == "angelegt"
    assert [e for e in l3.async_items() if ist_fremd(e)] == davor
    assert len(eigene(l3)) == 1
    await karte.ressource_abgleichen(l3, ZWEI)
    assert [e for e in l3.async_items() if ist_fremd(e)] == davor
    ok("Fremde Eintraege bleiben stehen, auch die mit aehnlichem Namen")

    # 6. Doppelte eigene: einer bleibt
    l4 = Liste(FREMD + [
        {"id": "a", "type": "module", "url": EINS},
        {"id": "b", "type": "module", "url": "/hats_static/hats-control-card.js"},
        {"id": "c", "type": "module", "url": ZWEI},
    ])
    assert await karte.ressource_abgleichen(l4, ZWEI) == "erneuert"
    assert [(e["id"], e["url"]) for e in eigene(l4)] == [("a", ZWEI)]
    assert fremde(l4) == ["fremd-1", "fremd-2", "fremd-3", "fremd-4"]
    ok("Von doppelten eigenen Eintraegen bleibt einer")

    # 7. Falscher Typ wird berichtigt
    l5 = Liste([{"id": "a", "type": "js", "url": EINS}])
    assert await karte.ressource_abgleichen(l5, EINS) == "erneuert"
    assert l5.async_items() == [{"id": "a", "type": "module", "url": EINS}]
    ok("Ein Eintrag mit falschem Typ wird zum Modul")

    # 8. Entfernen nimmt nur das Eigene mit
    l6 = Liste(FREMD + [{"id": "a", "type": "module", "url": EINS}])
    assert await karte.ressource_entfernen(l6, "/hats_static/hats-control-card.js") == 1
    assert fremde(l6) == ["fremd-1", "fremd-2", "fremd-3", "fremd-4"] and eigene(l6) == []
    # Gegenprobe: Auf einer Liste ohne uns passiert nichts.
    l7 = Liste(FREMD)
    assert await karte.ressource_entfernen(l7, EINS) == 0
    assert l7.schreiben == [] and len(l7.async_items()) == 4
    ok("Entfernen nimmt den eigenen Eintrag mit und sonst nichts")

asyncio.run(lauf())
print("ANZAHL", n)
`;

let ausgabe = "";
pruefe("python3 faehrt den Abgleich gegen den Nachbau der Liste", () => {
  try {
    ausgabe = execFileSync("python3", ["-", path.join(wurzel, "custom_components/hats/karte.py")],
                           { input: PYTHON, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  } catch (e) {
    assert.fail("python3: " + String(e.stderr || e.message).trim().split("\n").slice(-6).join("\n"));
  }
});
// Die Zeilen aus Python zaehlen mit - jede ist eine eigene Pruefung.
for (const zeile of ausgabe.split("\n").filter((z) => z.startsWith("ok "))) { n++; console.log(zeile); }
pruefe("Alle acht Faelle sind gelaufen", () => {
  assert.match(ausgabe, /^ANZAHL 8$/m, "Python hat nicht alle Faelle erreicht:\n" + ausgabe);
});

const init = lies("custom_components/hats/__init__.py");
const karte = lies("custom_components/hats/karte.py");
const manifest = JSON.parse(lies("custom_components/hats/manifest.json"));

pruefe("karte.py importiert Home Assistant nicht", () => {
  // Sonst liefe der Abgleich oben nur noch auf einer Instanz.
  assert.ok(!/^\s*(from|import)\s+homeassistant/m.test(karte));
});

pruefe("lovelace steht in den Abhaengigkeiten", () => {
  // Ohne das kann HATS vor Lovelace starten, und die Liste gibt es noch nicht.
  assert.ok(manifest.dependencies.includes("lovelace"));
});

pruefe("Angemeldet wird ueber die Ressourcenliste, das Modul ist nur der Ausweg", () => {
  assert.ok(/await ressource_abgleichen\(lovelace\.resources, karten_url\)/.test(init));
  assert.ok(/resource_mode == MODE_STORAGE/.test(init), "YAML-Ressourcen werden nicht erkannt");
  // Genau ein Aufruf, und der steht NACH dem Abgleich - also im Ausweg.
  const stellen = [...init.matchAll(/frontend\.add_extra_js_url\(/g)].map((m) => m.index);
  assert.strictEqual(stellen.length, 1);
  assert.ok(stellen[0] > init.indexOf("await ressource_abgleichen("));
});

pruefe("Beim Entfernen der Integration geht der Eintrag mit, beim Reload nicht", () => {
  const entfernen = /async def async_remove_entry\([\s\S]*?(?=\nasync def |\ndef |$)/.exec(init);
  assert.ok(entfernen, "async_remove_entry fehlt");
  assert.ok(/await ressource_entfernen\(/.test(entfernen[0]));
  const entladen = /async def async_unload_entry\([\s\S]*?(?=\nasync def |\ndef )/.exec(init);
  assert.ok(entladen, "async_unload_entry nicht gefunden");
  assert.ok(!/ressource_entfernen/.test(entladen[0]),
    "ein Reload wuerfe die Karte aus der Liste - jedes offene Dashboard zeigte einen Fehler");
});

console.log(`\n${n} Pruefungen`);
if (n < 14) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }
