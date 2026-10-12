// Die Startroutine: Vorlage laden oder eine vorhandene Datei oeffnen.
//
// Ob eine Datei von HATS stammt, entscheidet eine Zeichenfolge, die an ZWEI
// Stellen steht: schreibeTheme setzt sie in den Kopf, der Server sucht danach.
// Stimmen beide nicht ueberein, ist die Liste der eigenen Dateien leer - ohne
// Fehlermeldung, weil nichts kaputt ist, nur nichts gefunden.

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const hier = path.dirname(fileURLToPath(import.meta.url));
const panel = readFileSync(path.join(hier, "../custom_components/hats/www/hats-panel.js"), "utf8");
const py = readFileSync(path.join(hier, "../custom_components/hats/__init__.py"), "utf8");

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

pruefe("Client und Server kennen dieselbe Marke", () => {
  const ausPy = /^HATS_MARKE = "([^"]+)"$/m.exec(py);
  assert.ok(ausPy, "HATS_MARKE steht nicht mehr in __init__.py");

  // Der Client schreibt die Zeile ohne "# " - das setzt schreibeTheme davor.
  const ausJs = /`(Erzeugt mit HATS )\$\{HATS_VERSION\}/.exec(panel);
  assert.ok(ausJs, "Die Kopfzeile steht nicht mehr in speichern()");
  assert.ok(/aus = modell\.kopf\.map\(\(z\) => "# " \+ z\)/.test(
    readFileSync(path.join(hier, "../custom_components/hats/www/theme.js"), "utf8")),
    "schreibeTheme setzt kein '# ' mehr davor");

  assert.strictEqual(ausPy[1], "# " + ausJs[1],
    `Server sucht ${JSON.stringify(ausPy[1])}, Client schreibt ${JSON.stringify("# " + ausJs[1])}`);
});

pruefe("Gegenprobe: eine abweichende Marke faellt auf", () => {
  // Ohne sie koennte die Pruefung oben zwei leere Zeichenfolgen vergleichen.
  const ausPy = /^HATS_MARKE = "([^"]+)"$/m.exec(py)[1];
  assert.ok(ausPy.length > 10, "Die Marke ist zu kurz, um etwas zu unterscheiden");
  assert.notStrictEqual(ausPy, "# Erzeugt mit HATG ");
  assert.match(ausPy, /^# /, "Die Marke muss den Kommentarstrich enthalten");
});

pruefe("Der Server liefert die Herkunft je Datei mit", () => {
  // Fremde Dateien gehoeren MITGELIEFERT, nicht weggelassen: Wer seine Datei
  // in der Liste nicht findet, sucht den Fehler bei sich.
  assert.match(py, /"hats":\s*marke is not None/, "Das Feld hats fehlt");
  assert.match(py, /"kopf":/, "Das Feld kopf fehlt");
  assert.match(py, /"dateien":/, "Der Schluessel dateien fehlt");
  assert.match(py, /"files":/, "Die alte Form files ist weggefallen - das bricht aeltere Panels");
});

pruefe("Nur HATS-Dateien sind anklickbar", () => {
  // Die Sperre haengt an der Klasse, und die Verdrahtung muss sie beachten.
  assert.match(panel, /\.zeile\.datei:not\(\.gesperrt\)/,
    "Die Verdrahtung schliesst gesperrte Zeilen nicht aus");
  assert.match(panel, /!x\.hats/, "Fremde Dateien werden nicht getrennt behandelt");
});

pruefe("Der Start laedt nicht von allein eine Grundlage", () => {
  // Vorher eine Vorlage zu laden waere bequem und falsch: Wer danach eine
  // Datei oeffnet, haette die Vorlage schon drunterliegen.
  assert.doesNotMatch(panel, /if \(!ZUSTAND\.modell\) this\.ladeGrundlage\(\)/,
    "Die Grundlage wird beim Oeffnen immer noch blind geladen");
  assert.match(panel, /if \(ZUSTAND\.start && ZUSTAND\.dateien === null\) this\.ladeListe\(\)/);
});

pruefe("Oeffnen setzt den Vergleichsstand neu", () => {
  // Sonst zaehlt "geaendert" gegen die Vorlage statt gegen die Datei, und der
  // Zaehler steht beim Oeffnen sofort auf mehreren hundert.
  const block = panel.slice(panel.indexOf("async oeffneDatei("), panel.indexOf("async neuBeginnen("));
  assert.match(block, /this\._grundlage = JSON\.parse\(JSON\.stringify\(m\)\)/);
  assert.match(block, /ZUSTAND\.geaendert\.clear\(\)/);
  assert.match(block, /ZUSTAND\.start = false/);
});

pruefe("Die Texte des Startbilds stehen IM en-Block", () => {
  // Die HATG-Falle: Ein Eintrag daneben ist stumm unerreichbar, weil
  // uebersetzt wird ueber TEXTE[sprache]. Geprueft wird deshalb der Block,
  // nicht die Datei.
  const tabelle = panel.slice(panel.indexOf("const TEXTE = {"));
  const enBlock = tabelle.slice(tabelle.indexOf("en: {"), tabelle.indexOf("\n  },"));
  const noetig = [
    "Womit faengst du an?", "Neue Theme", "Vorhandene oeffnen",
    "Diese Dateien hat HATS gebaut", "Mit HATS gebaut", "Lade...",
    "Kein HATS-Kopf in der Datei",
  ];
  for (const t of noetig)
    assert.ok(enBlock.includes(JSON.stringify(t)), `${t} fehlt im en-Block`);
  assert.ok(enBlock.length > 500, "Der en-Block wurde nicht gefunden - der Test prueft nichts");
});

pruefe("Gegenprobe: ein Text ausserhalb des Blocks zaehlt nicht", () => {
  const tabelle = panel.slice(panel.indexOf("const TEXTE = {"));
  const enBlock = tabelle.slice(tabelle.indexOf("en: {"), tabelle.indexOf("\n  },"));
  assert.ok(!enBlock.includes(JSON.stringify("gibt-es-nicht-xyz")));
});

console.log(`\n${n} Pruefungen`);
if (n < 8) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }

// ---------------------------------------------------------------------------
// Der Feld-Dialog zeigt das MODELL, nicht die laufende Theme.
// Gemeldet am 12.10.2026: "die theme hat gruen und die einstellung zeigt
// orange an". Dahinter lagen drei getrennte Fehler.

pruefe("Hell und Dunkel kommen aus dem Modell", () => {
  const auf2 = panel.indexOf("werteJeModus(f) {");
  const block = panel.slice(auf2, panel.indexOf("\n  }\n", auf2));
  assert.ok(block.includes("m.light[name]"), "werteJeModus nicht gefunden");
  assert.match(block, /ZUSTAND\.modell/, "werteJeModus liest nicht das Modell");
  assert.doesNotMatch(block, /hass\.themes\.themes/,
    "werteJeModus liest wieder die laufende Theme statt das Modell");
});

pruefe("Kein Rueckfall auf getComputedStyle im Feldwert", () => {
  // Der Rueckfall zeigte den Wert der gerade ANGEWENDETEN Theme und sah aus
  // wie der eigene. Ein Feld, das nicht im Modell steht, ist nicht gesetzt.
  // Genau bis zum Ende der Methode schneiden, nicht nach Zeichenzahl: ein zu
  // langer Ausschnitt lief in feldZeile() hinein, und das benutzt
  // getComputedStyle voellig zu Recht.
  const auf = panel.indexOf("  wert(f) {");
  const block = panel.slice(auf, panel.indexOf("\n  }\n", auf));
  assert.ok(block.length > 300 && block.includes("ausModell"), "wert() nicht gefunden");
  // Ohne Kommentare pruefen: in der Begruendung daneben steht der Name
  // zwangslaeufig auch, und daran ist der Test beim ersten Lauf gescheitert.
  const code = block.split("\n").filter((z) => !z.trim().startsWith("//")).join("\n");
  assert.doesNotMatch(code, /getComputedStyle/,
    "wert() faellt wieder auf die laufende Seite zurueck");
});

pruefe("Jetzt in Kraft ist raus", () => {
  assert.doesNotMatch(panel, /T\("Jetzt in Kraft"\)/,
    "Die Zeile zeigt wieder die laufende Theme ueber Hell und Dunkel");
});

pruefe("Der Modus wird VOR dem Zeichnen gesetzt, und nur bei einem anderen Feld", () => {
  // Der schwerste der drei: Der Umschalter setzte "dark", loeste ein
  // Neuzeichnen aus, und die Zuweisung danach machte daraus wieder "light".
  // Ueber die Oberflaeche liess sich kein Dunkel-Wert setzen.
  const auf = panel.indexOf("  oeffneFeld(st, schluessel) {");
  const block = panel.slice(auf, panel.indexOf("\n  }\n", panel.indexOf("binde(d, (id, wert)", auf)));
  // Seit dem Umschalter leitet sich der Modus aus dem Modell ab
  // (geteilt ? "light" : "beide"), nicht mehr aus f.ebene. Die Reihenfolge
  // bleibt das Entscheidende: vor dem Zeichnen.
  const zuweisung = block.indexOf("this._feldModus = geteilt");
  const zeichnen = block.indexOf("d.innerHTML = `");
  assert.ok(zuweisung > 0 && zeichnen > 0, "Die Stellen wurden nicht gefunden");
  assert.ok(zuweisung < zeichnen, "Der Modus wird immer noch nach dem Zeichnen gesetzt");
  // feldId, nicht schluessel: So heisst schon der Parameter der Methode, und
  // eine zweite Deklaration im selben Gueltigkeitsbereich ist ein
  // SyntaxError - die Datei laedt dann gar nicht mehr. Genau so passiert.
  assert.match(block, /this\._feldModusFuer !== feldId/,
    "Die Zuweisung ist wieder bedingungslos und setzt die Wahl zurueck");
});

pruefe("Der Infostreifen zeigt den tatsaechlichen Modus", () => {
  // Bis zum Methodenende schneiden, nicht nach Zeichenzahl - die Methode ist
  // mit dem Umschalter gewachsen, und 900 Zeichen reichten nicht mehr.
  const auf = panel.indexOf("  streifen(f, T) {");
  const block = panel.slice(auf, panel.indexOf("\n  }\n", auf));
  assert.ok(block.includes("infostreifen("), "streifen() nicht gefunden");
  assert.doesNotMatch(block, /modus: beide \? "beide" : "light"/,
    "Der Streifen steht wieder fest auf hell");
  assert.match(block, /this\._feldModus === "dark"/);
});
