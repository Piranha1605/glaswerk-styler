// UIX: eine eigene Seite hinter dem Symbol oben.
//
// Erst stand UIX in einer Spalte rechts, neben Bubble und Mushroom. Auf Ansage
// vom 13.10.2026 ist die Spalte weg - "UIX kann auch hoch ins Menue da bubble
// und Mushroom da auch schon in Fremdkarten liegen. so haben wir rechts frei."
// Bubble und Mushroom sind ueber Stufe 6 erreichbar, UIX ueber den Dialog.

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { UIX_ZIELE, UIX_ANZAHL } from "../custom_components/glaswerk/www/uix.js";

const hier = path.dirname(fileURLToPath(import.meta.url));
const panel = readFileSync(path.join(hier, "../custom_components/glaswerk/www/glaswerk-panel.js"), "utf8");

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

pruefe("Achtundzwanzig Stilziele, zeichengenau aus HATG", () => {
  // Die Namen sind die Typnamen von UIX. Stimmt einer nicht, entsteht ein
  // Feld, das nie gelesen wird - HATG hat das mit
  // uix-states-history-charts teuer gelernt.
  assert.strictEqual(UIX_ANZAHL, 28);
  const ids = UIX_ZIELE.map((z) => z.id);
  assert.strictEqual(new Set(ids).size, 28, "ein Stilziel kommt doppelt vor");
  for (const id of ids) assert.match(id, /^[a-z][a-z0-9-]*$/, `${id} sieht nicht wie ein Typname aus`);
  for (const z of ["card", "root", "sidebar", "more-info", "drawer"])
    assert.ok(ids.includes(z), `${z} fehlt`);
});

pruefe("Jedes Ziel hat beide Sprachen", () => {
  for (const z of UIX_ZIELE) {
    assert.ok(z.de && z.de.length > 2, `${z.id}: deutscher Name fehlt`);
    assert.ok(z.en && z.en.length > 2, `${z.id}: englischer Name fehlt`);
  }
});

pruefe("Nur die einfache Form, kein -yaml", () => {
  // Ein "-yaml"-Feld verdeckt sein einfaches Feld vollstaendig: Liegt
  // uix-<typ>-yaml im Theme, wird uix-<typ> nie mehr gelesen. Glaswerk bietet
  // deshalb bewusst nur die einfache Form an.
  for (const z of UIX_ZIELE) assert.doesNotMatch(z.id, /-yaml$/);
  assert.doesNotMatch(panel, /"uix-" \+ el\.dataset\.uix \+ "-yaml"/);
});

pruefe("UIX steht in der Werkzeugzeile, nicht mehr rechts", () => {
  // Am 13.10.2026 aus der Add-on-Spalte nach oben in die Leiste, am
  // 15.10.2026 mit der Leiste in die Werkzeugzeile ueber der Stufenliste.
  // Dort traegt es zum ersten Mal einen Namen statt nur eines Symbols.
  const w = panel.slice(panel.indexOf('{ id: "werkzeuge", titel: T("Werkzeuge"), wege: ['),
                        panel.indexOf("    ];", panel.indexOf('{ id: "werkzeuge", titel: T("Werkzeuge"), wege: [')));
  assert.match(w, /id: "uix"/, "der UIX-Knopf fehlt in der Reihe der Werkzeuge");
  assert.match(w, /t: "UI eXtension"/, "UIX steht ohne Namen da");
  // Die Spalte darf nicht zurueckkommen - sonst stuende UIX an zwei Stellen.
  assert.doesNotMatch(panel, /addonSpalte/, "die Add-on-Spalte ist zurueck");
  assert.doesNotMatch(panel, /class="addons"/, "die Add-on-Spalte ist zurueck");
});

pruefe("Die Seite zeigt alle 28 Ziele und haengt am Schalter", () => {
  const b = panel.slice(panel.indexOf("zeichneUix() {"), panel.indexOf("bindeUix(wurzel) {"));
  assert.ok(b.length > 600, "zeichneUix nicht gefunden");
  assert.match(b, /UIX_ZIELE\.map/);
  assert.match(b, /data-uix="\$\{z\.id\}"/, "die Schalter tragen keine Kennung");
  assert.match(panel, /uix: \(\) => this\.oeffneUix\(\)/, "der Knopf ruft die Seite nicht auf");
});

pruefe("Abschalten parkt das CSS, es wirft nichts weg", () => {
  // Ein Schalter, der Arbeit vernichtet, ist kein Schalter. Das CSS wandert
  // nach ZUSTAND.uixAus und kommt beim Wiedereinschalten zurueck.
  const b = panel.slice(panel.indexOf('querySelectorAll("[data-uix]")'),
                        panel.indexOf('querySelectorAll("[data-uix-css]")'));
  assert.ok(b.length > 200, "die Draehte des UIX-Dialogs wurden nicht gefunden");
  assert.match(b, /ZUSTAND\.uixAus\[name\] = ZUSTAND\.modell\.flach\[name\]/,
    "abgeschaltetes CSS wird nicht geparkt");
  assert.match(b, /setze\(ZUSTAND\.modell, name, ZUSTAND\.uixAus\[name\] \?\? ""/,
    "beim Einschalten kommt das geparkte CSS nicht zurueck");
  assert.match(b, /entferne\(ZUSTAND\.modell, name\)/);
});

pruefe("Die Texte der UIX-Seite stehen IM en-Block", () => {
  // Ein Eintrag NEBEN dem en-Block ist stumm unerreichbar - in HATG standen so
  // einmal 21 Stueck, und der Test war gruen, weil er im Quelltext suchte
  // statt im Objekt.
  const tab = panel.slice(panel.indexOf("const TEXTE = {"));
  const en = tab.slice(tab.indexOf("en: {"), tab.indexOf("\n  },"));
  for (const x of ["Stilzielen an", "erst eine Theme oeffnen"])
    assert.ok(en.includes(JSON.stringify(x)), `${x} fehlt im en-Block`);
});

pruefe("Gegenprobe: ein erfundener Typname faellt auf", () => {
  // Haelt fest, dass die Pruefung oben etwas pruefen WUERDE.
  const ids = UIX_ZIELE.map((z) => z.id);
  assert.ok(!ids.includes("gibt-es-nicht"), "die Liste ist nicht die, die geprueft wird");
});


// ---------------------------------------------------------------------------
// Bilder: derselbe Weg wie bei HATG.

import { readFileSync as lies } from "node:fs";
const py = lies(path.join(hier, "../custom_components/glaswerk/__init__.py"), "utf8");
const konst = lies(path.join(hier, "../custom_components/glaswerk/const.py"), "utf8");

pruefe("Bilder liegen in config/www/hatg, nicht hinter einer eigenen Route", () => {
  // Der ganze Punkt bleibt: Eine Adresse, die nur Glaswerk ausliefert, macht eine
  // weitergegebene Theme unbrauchbar - beim Empfaenger bliebe der Hintergrund
  // leer, ohne Fehlermeldung, weil ein fehlendes Bild in CSS nichts tut.
  // HATG hat das am 2026-09-30 an einer weitergegebenen Theme gelernt.
  //
  // DER ORDNER IST SEIT DEM 15.10.2026 HATGS, auf Ansage: "den upload ordner
  // von HATG verwenden. Dann haben beide systeme den selben bilderpfad." Er
  // heisst weiter "hatg", obwohl ihn beide benutzen - in jeder HATG-Theme
  // steht /local/hatg/<datei>, und HATG schreibt dorthin weiter.
  assert.match(konst, /BILDER_SUBDIR = "hatg"/);
  assert.match(konst, /BILDER_LOCAL_PATH = "\/local\/hatg"/);
  assert.match(py, /Path\(hass\.config\.path\(WWW_SUBDIR, BILDER_SUBDIR\)\)/);
  // Und der alte Ordner steht nur noch als Quelle des Umzugs da.
  assert.match(konst, /BILDER_SUBDIR_ALT = "glaswerk"/);
  assert.match(py, /umziehen\(/, "der Umzug wird nicht aufgerufen");
});

pruefe("Hochladen laesst nur Bilder durch und keinen Pfad", () => {
  // Path(...).name wirft jedes Verzeichnis weg, die Endungsliste jede
  // ausfuehrbare Datei. Beides zusammen schliesst einen Pfadausbruch aus.
  assert.match(py, /basis = Path\(roh\)\.name/);
  assert.match(py, /if endung not in _BILD_ENDUNGEN:\s*\n\s*return None/);
  assert.match(py, /_BILD_NAME_RE = re\.compile/);
  assert.match(py, /_BILD_MAX_BYTES/);
});

pruefe("Inhaltsgleiche Bilder landen nicht doppelt auf der Platte", () => {
  assert.match(py, /def _bild_mit_inhalt/);
  assert.match(py, /schon_da = _bild_mit_inhalt\(ordner, summe\)/);
  // Und bei gleichem NAMEN wird nicht ueberschrieben, sondern durchgezaehlt.
  assert.match(py, /def _freier_bildpfad/);
});

pruefe("Die /local-Falle steht im Log, nicht im Verborgenen", () => {
  // Home Assistant registriert /local nur, wenn config/www beim Start schon da
  // war. Legt Glaswerk den Ordner gerade erst an, bleibt /local bis zum naechsten
  // Neustart tot - und dann sucht man den Fehler in der Theme.
  assert.match(py, /www_fehlte = not eltern\.is_dir\(\)/);
  assert.match(py, /_LOGGER\.warning\(/);
});

pruefe("Alle drei Bildbefehle sind angemeldet", () => {
  // Ohne die Anmeldung gibt es sie zwar, aber niemand kann sie rufen - und
  // der Fehler heisst dann nur "Unknown command".
  for (const b of ["ws_list_images", "ws_upload_image", "ws_delete_image"])
    assert.ok(py.includes(`async_register_command(hass, ${b})`), `${b} nicht angemeldet`);
});

pruefe("Die Texte der Galerie stehen IM en-Block", () => {
  const tab = panel.slice(panel.indexOf("const TEXTE = {"));
  const en = tab.slice(tab.indexOf("en: {"), tab.indexOf("\n  },"));
  for (const x of ["Bild waehlen", "Bild hochladen...", "Kein Bild", "Hochgeladen"])
    assert.ok(en.includes(JSON.stringify(x)), `${x} fehlt im en-Block`);
});

console.log(`\n${n} Pruefungen`);
if (n < 14) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }
