// Die Startroutine: Vorlage laden oder eine vorhandene Datei oeffnen.
//
// Ob eine Datei von Glaswerk stammt, entscheidet eine Zeichenfolge, die an ZWEI
// Stellen steht: schreibeTheme setzt sie in den Kopf, der Server sucht danach.
// Stimmen beide nicht ueberein, ist die Liste der eigenen Dateien leer - ohne
// Fehlermeldung, weil nichts kaputt ist, nur nichts gefunden.

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const hier = path.dirname(fileURLToPath(import.meta.url));
const panel = readFileSync(path.join(hier, "../custom_components/glaswerk/www/glaswerk-panel.js"), "utf8");
const py = readFileSync(path.join(hier, "../custom_components/glaswerk/__init__.py"), "utf8");

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

pruefe("Client und Server kennen dieselbe Marke", () => {
  const ausPy = /^GLASWERK_MARKE = "([^"]+)"$/m.exec(py);
  assert.ok(ausPy, "GLASWERK_MARKE steht nicht mehr in __init__.py");

  // Der Client schreibt die Zeile ohne "# " - das setzt schreibeTheme davor.
  const ausJs = /`(Erzeugt mit Glaswerk )\$\{GLASWERK_VERSION\}/.exec(panel);
  assert.ok(ausJs, "Die Kopfzeile steht nicht mehr in speichern()");
  assert.ok(/aus = modell\.kopf\.map\(\(z\) => "# " \+ z\)/.test(
    readFileSync(path.join(hier, "../custom_components/glaswerk/www/theme.js"), "utf8")),
    "schreibeTheme setzt kein '# ' mehr davor");

  assert.strictEqual(ausPy[1], "# " + ausJs[1],
    `Server sucht ${JSON.stringify(ausPy[1])}, Client schreibt ${JSON.stringify("# " + ausJs[1])}`);
});

pruefe("Gegenprobe: eine abweichende Marke faellt auf", () => {
  // Ohne sie koennte die Pruefung oben zwei leere Zeichenfolgen vergleichen.
  const ausPy = /^GLASWERK_MARKE = "([^"]+)"$/m.exec(py)[1];
  assert.ok(ausPy.length > 10, "Die Marke ist zu kurz, um etwas zu unterscheiden");
  assert.notStrictEqual(ausPy, "# Erzeugt mit HATG ");
  assert.match(ausPy, /^# /, "Die Marke muss den Kommentarstrich enthalten");
});

pruefe("Der Server liefert die Herkunft je Datei mit", () => {
  // Fremde Dateien gehoeren MITGELIEFERT, nicht weggelassen: Wer seine Datei
  // in der Liste nicht findet, sucht den Fehler bei sich.
  assert.match(py, /"glaswerk":\s*marke is not None/, "Das Feld glaswerk fehlt");
  assert.match(py, /"kopf":/, "Das Feld kopf fehlt");
  assert.match(py, /"dateien":/, "Der Schluessel dateien fehlt");
  assert.match(py, /"files":/, "Die alte Form files ist weggefallen - das bricht aeltere Panels");
});

pruefe("Eigene und fremde Dateien werden getrennt gezeigt", () => {
  // Gesperrt ist seit dem 13.10.2026 keine mehr - lesen geht bei allen, und
  // der Bericht sagt, was dabei herauskommt. Getrennt bleiben sie trotzdem:
  // bei einer fremden steht "lesen" statt "oeffnen", und darueber der Hinweis.
  assert.match(panel, /!x\.glaswerk/, "Fremde Dateien werden nicht getrennt behandelt");
  assert.match(panel, /T\("lesen"\)/, "der Unterschied ist nicht mehr sichtbar");
});

pruefe("Die Dateiliste steht im Dialog, nicht auf der Startseite", () => {
  // "wir oeffnen die dateien nur ueber die icons" - dann gehoert die Liste
  // auch dorthin und nicht als staendiger Block in die Seite.
  assert.match(panel, /async zeigeDateien\(\) \{/, "der Dialog fehlt");
  assert.match(panel, /oeffnen: \(\) => this\.zeigeDateien\(\)/,
    "das Ordner-Symbol fuehrt nicht zur Liste");
  const wege = panel.slice(panel.indexOf("  wegeHtml(T, welche) {"), panel.indexOf("  // Die Dateiliste als Dialog"));
  assert.ok(wege.length > 400, "die Wege wurden nicht gefunden");
  assert.doesNotMatch(wege, /liste schmal/, "die Liste steht wieder auf der Seite");
});

pruefe("Der Start laedt den letzten Arbeitsstand, nicht blind die Grundlage", () => {
  // Bis zum 16.10.2026 lud der Start GAR NICHTS, und das Panel fragte "Womit
  // faengst du an?". Der Grund war richtig: Wer eine Vorlage unterlegt und
  // danach eine Datei oeffnet, haette die Vorlage drunterliegen.
  //
  // Die Sorge bleibt, die Loesung ist eine andere. ladeStart geht der Reihe
  // nach: zuletzt geoeffnete Datei, sonst die einzige eigene Theme, und erst
  // wenn nichts davon zutrifft, die Grundlage. In jedem Fall setzt
  // oeffneDatei _grundlage auf die Datei selbst - es liegt also nie eine
  // Vorlage unter einer geoeffneten Theme.
  //
  // Ansage: "die guten tag. und als basis wird der letzte arbeitsstand
  // geladen. bei neuinstalation die blanko."
  assert.doesNotMatch(panel, /if \(!ZUSTAND\.modell\) this\.ladeGrundlage\(\)/,
    "Die Grundlage wird beim Oeffnen wieder blind geladen");
  assert.match(panel, /if \(ZUSTAND\.dateien === null\) this\.ladeStart\(\)/,
    "der Start ruft ladeStart nicht");
  assert.match(panel, /async ladeStart\(\) \{/, "ladeStart fehlt");

  // Die Reihenfolge steht im Code, nicht nur im Kommentar.
  const start = panel.slice(panel.indexOf("  async ladeStart() {"),
                            panel.indexOf("  // Die Grundlage ist ha_blanko"));
  assert.ok(start.length > 200, "ladeStart wurde nicht gefunden");
  let zuletzt = -1;
  for (const teil of ["letzteLesen()", "eigene.length === 1", "this.ladeGrundlage()"]) {
    const i = start.indexOf(teil);
    assert.ok(i > zuletzt, `${teil} steht an der falschen Stelle`);
    zuletzt = i;
  }

  assert.doesNotMatch(panel, /ZUSTAND\.start/, "der Startseiten-Merker ist zurueck");
});

pruefe("Im Kopf steht die Marke, keine wechselnde Ueberschrift", () => {
  // Zwei Schritte an einem Tag:
  //   "die seite moechte ich nicht mehr. nur noch die von bild 2."
  //     -> die zweite Ueberschrift faellt weg
  //   "guten tag auch weg. da kommt das glaswerk logo."
  //     -> auch die erste faellt weg, es bleibt die Marke
  //
  // Die zweite Seite war nie eine zweite Datei, sondern derselbe Kopf mit
  // anderem Text, solange ZUSTAND.modell leer war.
  assert.doesNotMatch(panel, /Womit faengst du an\?/,
    "die zweite Ueberschrift steht wieder da");
  assert.doesNotMatch(panel, /<h1>\$\{T\("Guten Tag"\)\}<\/h1>/,
    "die Begruessung steht wieder im Kopf");
  assert.match(panel, /<div class="marke">/, "die Marke fehlt im Kopf");
  assert.match(panel, /src="\/glaswerk_static\/glaswerk\.svg"/,
    "das Logo wird nicht geladen");

  // Ohne Datei bleibt der Schriftzug - ein leerer Rahmen waere schlechter
  // als ein Wort. Seit dem 16.10.2026 traegt das Logo den Schriftzug aber
  // selbst (ein Glas-GLASWERK, 1000x220), deshalb steht das Wort daneben
  // normalerweise auf display:none. Erst onerror macht es sichtbar.
  assert.match(panel, /onerror="this\.remove\(\);\s*this\.parentNode\.classList\.add\('ohne-logo'\)"/,
    "ein fehlendes Logo haengt als kaputtes Bild im Kopf");
  assert.match(panel, /class="wortmarke">Glaswerk</, "der Schriftzug fehlt");
  assert.match(panel, /\.marke \.wortmarke \{ display: none;/,
    "der Schriftzug steht neben dem Logo, das ihn schon traegt");
  assert.match(panel, /\.marke\.ohne-logo \.wortmarke \{ display: block; \}/,
    "ohne Logo bleibt der Kopf leer");
});

pruefe("Die zuletzt geoeffnete Theme wird gemerkt - an jeder Stelle, die sie aendert", () => {
  // Drei Stellen, und alle drei muessen es tun. Fehlt eine, oeffnet das Panel
  // beim naechsten Mal etwas anderes als das, woran gearbeitet wurde.
  assert.match(panel, /const LETZTE_SPEICHER = "glaswerk-letzte-theme"/);
  assert.match(panel, /function letzteLesen\(\)/);
  assert.match(panel, /function letzteSchreiben\(name\)/);

  const stelle = (von, bis) => panel.slice(panel.indexOf(von), panel.indexOf(bis));
  assert.match(stelle("  async oeffneDatei(name) {", "  // Dieselbe Strecke fuer eingefuegten Text"),
    /letzteSchreiben\(name\)/, "oeffneDatei merkt sich die Datei nicht");
  assert.match(stelle("  async neuBeginnen() {", "  get spr() {"),
    /letzteSchreiben\(null\)/, "neuBeginnen vergisst die alte Datei nicht");
  assert.match(panel, /letzteSchreiben\(`\$\{ZUSTAND\.name\}\.yaml`\)/,
    "Speichern traegt den Namen nicht nach");

  // Gegenprobe: Nur der NAME liegt im localStorage, nicht der Inhalt. Eine
  // Kopie im Browser waere ein zweiter Stand, der still veraltet.
  assert.doesNotMatch(panel, /setItem\(LETZTE_SPEICHER, JSON\.stringify/,
    "da liegt mehr als der Name im localStorage");
});

pruefe("Die Baukasten-Kachel wirft keine geladene Theme weg", () => {
  // Am 17.10.2026 passiert: Theme laden, Baukasten oeffnen, speichern - und
  // die Datei war blanko. Die Kachel rief neuBeginnen() IMMER, also auch ueber
  // einer geladenen Theme: Name leer, Grundlage zurueck auf ha_blanko, alle
  // Felder verworfen. Gewarnt hat nichts, weil eine frisch geladene Theme
  // nichts Geaendertes hat und darfVerlassen() deshalb durchlaesst.
  const block = panel.slice(panel.indexOf('const was = b.dataset.start;'),
                            panel.indexOf('schalter[was]?.();'));
  assert.match(block, /if \(was === "baukasten"\)/, "die Kachel fuehrt nicht mehr zum Baukasten");
  // Der Kern: neuBeginnen steht hinter einer Bedingung, nicht davor.
  assert.match(block, /const leer = !ZUSTAND\.name && ZUSTAND\.meta\.Grundlage === "ha_blanko"/,
    "die Kachel prueft nicht mehr, ob ueberhaupt etwas geladen ist");
  assert.match(block, /if \(leer\) await this\.neuBeginnen\(\)/,
    "neuBeginnen haengt nicht an der Bedingung");
  assert.doesNotMatch(block, /\{ await this\.neuBeginnen\(\); this\.oeffneBaukasten\(\)/,
    "die Kachel wirft wieder bedingungslos weg");
});

pruefe("Oeffnen setzt den Vergleichsstand neu", () => {
  // Sonst zaehlt "geaendert" gegen die Vorlage statt gegen die Datei, und der
  // Zaehler steht beim Oeffnen sofort auf mehreren hundert.
  const block = panel.slice(panel.indexOf("async oeffneDatei("), panel.indexOf("async neuBeginnen("));
  assert.match(block, /this\._grundlage = JSON\.parse\(JSON\.stringify\(m\)\)/);
  assert.match(block, /ZUSTAND\.geaendert\.clear\(\)/);
  // ZUSTAND.start gibt es nicht mehr - eine Seite, kein Merker.
  assert.match(block, /ZUSTAND\.bericht = berichtUeberTheme/);
});

pruefe("Die Texte des Startbilds stehen IM en-Block", () => {
  // Die HATG-Falle: Ein Eintrag daneben ist stumm unerreichbar, weil
  // uebersetzt wird ueber TEXTE[sprache]. Geprueft wird deshalb der Block,
  // nicht die Datei.
  const tabelle = panel.slice(panel.indexOf("const TEXTE = {"));
  const enBlock = tabelle.slice(tabelle.indexOf("en: {"), tabelle.indexOf("\n  },"));
  // "Womit faengst du an?" stand hier bis zum 16.10.2026. Die zweite
  // Ueberschrift ist weg, dafuer steht die eine jetzt immer da.
  const noetig = [
    "Guten Tag", "Neue Theme", "Vorhandene oeffnen",
    "Diese Dateien hat Glaswerk gebaut", "Mit Glaswerk gebaut", "Lade...",
    "Kein Glaswerk-Kopf in der Datei",
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
if (n < 9) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }

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

pruefe("Eine leere Theme wird nicht geschrieben", () => {
  // Am 17.10.2026 in Enricos Haus: NewHome.yaml mit 116 Bytes, nur "NewHome:"
  // ohne Inhalt. Gueltiges YAML, wird zu None - und Home Assistant verweigert
  // daraufhin den GANZEN frontend->themes-Block. Nicht nur diese Theme: alle.
  //
  // Geprueft wird die Logik selbst, nicht ihre Schreibweise: Der Ausdruck aus
  // __init__.py laeuft hier durch Python, mit echten Faellen.
  const faelle = [
    ['{"NewHome": None}', true, "leere Theme"],
    ['{}', true, "gar nichts"],
    ['None', true, "None statt Zuordnung"],
    ['{"A": {}}', true, "Theme mit leerer Zuordnung"],
    ['{"A": {"x": "1"}}', false, "echte Theme"],
    ['{"A": {"x": "1"}, "B": None}', true, "eine von zweien leer"],
  ];
  const code = faelle.map(([wert, erwartet]) =>
    `g = ${wert}\n`
    + `leer = (not isinstance(g, dict) or not g) or bool([k for k, v in g.items() if not isinstance(v, dict) or not v])\n`
    + `print("ja" if leer else "nein")`
  ).join("\n");
  const aus = execFileSync("python3", ["-c", code], { encoding: "utf8" }).trim().split("\n");
  faelle.forEach(([, erwartet, was], i) => {
    assert.strictEqual(aus[i], erwartet ? "ja" : "nein", `${was}: erwartet ${erwartet ? "abgelehnt" : "angenommen"}`);
  });

  // Und die Pruefung steht auch wirklich im Server, vor dem Schreiben.
  const block = py.slice(py.indexOf("async def ws_save_theme"), py.indexOf("def _schreibe()"));
  assert.match(block, /empty_theme/, "der Server lehnt leere Themes nicht ab");
  assert.match(block, /isinstance\(geparst, dict\)/, "der Server prueft die geparste Theme nicht");
});
