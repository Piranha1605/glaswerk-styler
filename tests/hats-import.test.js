// Die Ein- und Ausgaberoutine.
//
// HATS wirft beim Lesen nichts weg - leseTheme legt jedes Feld ins Modell,
// schreibeTheme gibt es wieder aus. Was lange fehlte, war nicht die
// Faehigkeit, sondern die AUSKUNFT: Ohne Bericht glaubt man, ein Feld sei weg,
// nur weil keine Kachel dafuer da ist.

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { leseTheme, schreibeTheme, berichtUeberTheme, uixSchalterSetzen, UIX_SCHALTER }
  from "../custom_components/hats/www/theme.js";
import { UIX_ZIELE } from "../custom_components/hats/www/uix.js";

const hier = path.dirname(fileURLToPath(import.meta.url));
const panel = readFileSync(path.join(hier, "../custom_components/hats/www/hats-panel.js"), "utf8");

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

const FREMD = `# Irgendein anderes Werkzeug
fremde_theme:
  primary-color: "#ff0000"
  voellig-unbekannt: "17px"
  uix-card: "ha-card { border: 0 }"

  modes:
    light:
      card-background-color: "#ffffff"
    dark:
      card-background-color: "#111111"
`;

pruefe("Eine fremde Theme wird vollstaendig gelesen", () => {
  const m = leseTheme(FREMD);
  assert.ok(!m.fehler, m.fehler);
  assert.strictEqual(m.name, "fremde_theme");
  assert.strictEqual(m.flach["voellig-unbekannt"], "17px");
  assert.strictEqual(m.dark["card-background-color"], "#111111");
});

pruefe("Was HATS nicht kennt, kommt unveraendert wieder heraus", () => {
  // Der Kern des Ganzen: Ein unbekanntes Feld zu BEHALTEN ist wichtiger, als
  // es zu verstehen. Wer eine fremde Theme hier oeffnet und speichert, darf
  // nichts verlieren.
  const m = leseTheme(FREMD);
  const zurueck = leseTheme(schreibeTheme(m));
  assert.strictEqual(zurueck.flach["voellig-unbekannt"], "17px");
  assert.strictEqual(zurueck.flach["uix-card"], "ha-card { border: 0 }");
  assert.strictEqual(zurueck.light["card-background-color"], "#ffffff");
  assert.strictEqual(zurueck.dark["card-background-color"], "#111111");
});

pruefe("Der Bericht trennt bedienbar von mitgenommen", () => {
  const m = leseTheme(FREMD);
  const b = berichtUeberTheme(m, new Set(["primary-color", "card-background-color"]));
  assert.strictEqual(b.felder, 4);
  assert.deepStrictEqual(b.bedienbar, ["card-background-color", "primary-color"]);
  assert.deepStrictEqual(b.mitgenommen, ["uix-card", "voellig-unbekannt"]);
});

pruefe("Stilziele fremder Werkzeuge werden benannt", () => {
  // Ein Theme mit uix- oder card-mod-Feldern gehoert HATG. Wer es hier
  // bearbeitet, verliert die Vorlagenpflege - das gehoert gesagt, nicht
  // stillschweigend hingenommen.
  const b = berichtUeberTheme(leseTheme(FREMD), new Set());
  assert.deepStrictEqual(b.stilziele, ["uix-card"]);
});

pruefe("Zeilen, die verloren gehen, werden gemeldet", () => {
  // Das Einzige, was beim Lesen wirklich wegfaellt. Deshalb steht es im
  // Bericht rot und mit Namen.
  const m = leseTheme("x:\n  a: 1\n  das hier ist kein feld\n");
  const b = berichtUeberTheme(m, new Set(["a"]));
  assert.strictEqual(b.unklar.length, 1);
  assert.match(b.unklar[0], /kein feld/);
});

pruefe("Gegenprobe: eine saubere Datei meldet nichts Unklares", () => {
  const b = berichtUeberTheme(leseTheme(FREMD), new Set());
  assert.deepStrictEqual(b.unklar, []);
});

pruefe("Die Zaehlung je Ebene stimmt", () => {
  const b = berichtUeberTheme(leseTheme(FREMD), new Set());
  assert.strictEqual(b.flach, 3);
  assert.strictEqual(b.hell, 1);
  assert.strictEqual(b.dunkel, 1);
  // 4, nicht 5: card-background-color steht in beiden Modi, ist aber EIN Feld.
  assert.strictEqual(b.felder, 4);
});

pruefe("Fremde Dateien sind nicht mehr gesperrt", () => {
  assert.doesNotMatch(panel, /zeile datei gesperrt/,
    "fremde Dateien lassen sich wieder nicht oeffnen");
});

pruefe("Es gibt einen Ausgang ausser Speichern", () => {
  assert.match(panel, /herunterladen\(\) \{/, "Herunterladen fehlt");
  assert.match(panel, /async kopieren\(\) \{/, "Kopieren fehlt");
  // Der Dateiname ist der Theme-Name: Beim Zurueckspielen ist er der
  // Schluessel, und ein falscher legt eine zweite Theme an.
  assert.match(panel, /a\.download = `\$\{name\}\.yaml`/);
});

pruefe("Die Texte des Berichts stehen IM en-Block", () => {
  const tab = panel.slice(panel.indexOf("const TEXTE = {"));
  const en = tab.slice(tab.indexOf("en: {"), tab.indexOf("\n  },"));
  for (const x of ["Datei oder Text", "Gelesen", "Einlesen", "Als Datei herunterladen", "lesen"])
    assert.ok(en.includes(JSON.stringify(x)), `${x} fehlt im en-Block`);
});


// ---------------------------------------------------------------------------
// Mehrzeilige Werte. Beim ersten Import einer HATG-Theme am 13.10.2026 meldete
// der Bericht 155 unlesbare Zeilen - es war der Rumpf von uix-Blöcken.

const CSS = ':host(ha-card) {\n  border: 0;\n  /* ein Kommentar */\n}\nha-card { color: red }';

pruefe("Ein mehrzeiliger Wert ueberlebt den Rundlauf", () => {
  const m = { name: "x", flach: { "uix-card": CSS }, light: {}, dark: {}, kopf: [], unklar: [] };
  const yaml = schreibeTheme(m);
  assert.match(yaml, /uix-card: \|-\n/, "kein Blockskalar geschrieben");
  const zurueck = leseTheme(yaml);
  assert.strictEqual(zurueck.flach["uix-card"], CSS);
  assert.deepStrictEqual(zurueck.unklar, [], "Zeilen gingen verloren");
});

pruefe("Auch je Modus, mit der tieferen Einrueckung", () => {
  const m = { name: "x", flach: {}, light: { "uix-root": CSS }, dark: { "uix-root": "a {\n  b: 1\n}" },
              kopf: [], unklar: [] };
  const zurueck = leseTheme(schreibeTheme(m));
  assert.strictEqual(zurueck.light["uix-root"], CSS);
  assert.strictEqual(zurueck.dark["uix-root"], "a {\n  b: 1\n}");
});

pruefe("Ein abschliessender Umbruch bleibt erhalten, oder eben nicht", () => {
  // "|" haengt beim Lesen einen Umbruch an, "|-" nicht. Wer das verwechselt,
  // bekommt bei jedem Durchlauf eine Leerzeile mehr.
  const mit = { name: "x", flach: { a: "eins\nzwei\n" }, light: {}, dark: {}, kopf: [], unklar: [] };
  const ohne = { name: "x", flach: { a: "eins\nzwei" }, light: {}, dark: {}, kopf: [], unklar: [] };
  assert.match(schreibeTheme(mit), /a: \|\n/);
  assert.match(schreibeTheme(ohne), /a: \|-\n/);
  assert.strictEqual(leseTheme(schreibeTheme(mit)).flach.a, "eins\nzwei\n");
  assert.strictEqual(leseTheme(schreibeTheme(ohne)).flach.a, "eins\nzwei");
});

pruefe("Leerzeilen im Block bleiben stehen", () => {
  const w = "eins\n\ndrei";
  const m = { name: "x", flach: { a: w }, light: {}, dark: {}, kopf: [], unklar: [] };
  assert.strictEqual(leseTheme(schreibeTheme(m)).flach.a, w);
});

pruefe("Ein Block beendet sich am naechsten Feld, nicht am Dateiende", () => {
  const m = { name: "x", flach: { a: "eins\nzwei", b: "#fff" }, light: {}, dark: {}, kopf: [], unklar: [] };
  const zurueck = leseTheme(schreibeTheme(m));
  assert.strictEqual(zurueck.flach.a, "eins\nzwei");
  assert.strictEqual(zurueck.flach.b, "#fff");
});

pruefe("Idempotent: der zweite Durchlauf aendert nichts", () => {
  const m = { name: "x", flach: { "uix-card": CSS, c: "#111" },
              light: { "uix-root": CSS }, dark: {}, kopf: ["Kopf"], unklar: [] };
  const eins = schreibeTheme(m);
  const zwei = schreibeTheme(leseTheme(eins));
  assert.strictEqual(eins, zwei);
});

pruefe("Gegenprobe: ohne Blockskalar waere es kaputt", () => {
  // Haelt fest, warum schreibeWert existiert. quote() legt die Umbrueche
  // mitten in einen gequoteten Skalar - YAML faltet die zu Leerzeichen.
  const falsch = `x:\n  a: ${JSON.stringify(CSS).replace(/\\n/g, "\n")}\n`;
  const gelesen = leseTheme(falsch);
  assert.notStrictEqual(gelesen.flach.a, CSS, "der naive Weg funktioniert doch - schreibeWert waere unnoetig");
});


// ---------------------------------------------------------------------------
// Die Schalterreihe oben links.

pruefe("Eine Leiste oben statt Seitenleiste und Schalterreihe", () => {
  // Drei Stellen fuer Navigation waren zwei zu viel. Seit dem 13.10.2026 eine
  // Pille oben: links die acht Stufen, rechts die Aktionen.
  const block = panel.slice(panel.indexOf('<nav class="menueleiste">'), panel.indexOf('<header class="kopf">'));
  assert.ok(block.length > 600, "die Leiste wurde nicht gefunden");
  const ids = [...block.matchAll(/id: "([a-z0-9]+)"/g)].map((m) => m[1]);
  // Speichern steht bewusst NICHT dabei - es bleibt im Kopf, und zweimal
  // derselbe Knopf nebeneinander ist einer zu viel.
  // UIX steht seit dem 13.10.2026 hier oben statt in einer Spalte rechts -
  // auf Ansage, damit rechts frei wird. Der Baukasten steht davor: Er kommt
  // in der Arbeit zuerst, UIX ist der Feinschliff danach.
  assert.deepStrictEqual(ids, ["baukasten", "uix", "neu", "lesen", "oeffnen", "verwerfen", "laden2", "kopie2"]);
  assert.match(block, /data-rail="\$\{st\.n\}"/, "die Stufen fehlen in der Leiste");
  assert.doesNotMatch(panel, /class="rail"/, "die alte Seitenleiste ist zurueck");
});

pruefe("Nur Symbole, keine Beschriftung", () => {
  // Die Uebersichtsseite darunter nennt jede Stufe beim Namen - ein zweites
  // Mal daneben braucht es nicht, und so passt die Leiste in jede Breite.
  const block = panel.slice(panel.indexOf('<nav class="menueleiste">'), panel.indexOf('<header class="kopf">'));
  assert.doesNotMatch(block, /<span>\$\{T\(st\.titel\)\}<\/span>/, "die Beschriftungen sind zurueck");
  assert.match(block, /aria-label="\$\{st\.n\}\. \$\{T\(st\.titel\)\}"/,
    "ohne Beschriftung braucht es wenigstens ein aria-label");
});

pruefe("Verwerfen geht auf den Stand beim Oeffnen zurueck", () => {
  // _grundlage haelt die Datei, wie sie hereinkam - nicht die leere Vorlage.
  // Mit der falschen Quelle waere "verwerfen" ein Datenverlust.
  const b = panel.slice(panel.indexOf("  verwerfen() {"), panel.indexOf("  async neuBeginnen("));
  assert.match(b, /ZUSTAND\.modell = JSON\.parse\(JSON\.stringify\(this\._grundlage\)\)/);
  assert.match(b, /ZUSTAND\.geaendert\.clear\(\)/);
});

pruefe("Oeffnen fragt bei Ungespeichertem nach", () => {
  const b = panel.slice(panel.indexOf("  zumStart() {"), panel.indexOf("  verwerfen() {"));
  assert.match(b, /ZUSTAND\.geaendert\.size && !this\._startBestaetigt/,
    "zumStart wirft Ungespeichertes ohne Rueckfrage weg");
});

pruefe("Die Startwege stehen NUR auf der leeren Startseite", () => {
  // Hier stand bis zum 13.10.2026 das Gegenteil: "Die Startkarten sind weg,
  // zwei Wege zur selben Sache nebeneinander sind einer zu viel." Das stimmte,
  // solange die Karten NEBEN der Symbolleiste lagen.
  //
  // Jetzt liegen sie dort, wo die Leiste nichts tun kann: Ohne offene Theme
  // sind ihre Knoepfe gesperrt (aus: ZUSTAND.start), unbeschriftet und damit
  // unlesbar. Auf Ansage: "warum machen wir auf der seite womit faengst du an
  // nicht grosse buttons mit laden neu aus vorlage und so weiter".
  //
  // Die Bedingung ist deshalb das Entscheidende an dieser Pruefung - sobald
  // eine Theme offen ist, verschwinden die Karten und die Leiste uebernimmt.
  const sb = panel.slice(panel.indexOf("startbild(T) {"), panel.indexOf("zeigeDateien("));
  assert.match(sb, /class="startwege/, "die Startwege fehlen");
  assert.match(sb, /\$\{ZUSTAND\.modell \? "" : `[\s\S]{0,900}class="startwege/,
    "die Startwege haengen nicht daran, dass KEINE Theme offen ist");
  // Sie fuehren zu denselben Aktionen wie die Leiste, ueber einen eigenen
  // Namen - sonst kaeme ein Klick zweimal an.
  assert.match(panel, /querySelectorAll\("\[data-start\]"\)/, "die Wege sind nicht verdrahtet");
  assert.match(panel, /neu: \(\) => this\.neuBeginnen\(\)/);
  assert.match(panel, /lesen: \(\) => this\.zeigeImport\(\)/);
});

pruefe("Die Texte der Schalter stehen IM en-Block", () => {
  const tab = panel.slice(panel.indexOf("const TEXTE = {"));
  const en = tab.slice(tab.indexOf("en: {"), tab.indexOf("\n  },"));
  for (const x of ["Oeffnen", "Aenderungen verwerfen", "Aenderungen verworfen"])
    assert.ok(en.includes(JSON.stringify(x)), `${x} fehlt im en-Block`);
});


pruefe("Deaktiviert heisst leiser, nicht unsichtbar", () => {
  // Erst stand hier opacity .35 - auf hellem Glas war davon nichts mehr zu
  // sehen, und gemeldet wurde "ich hab keine knoepfe". Der Kreis bleibt voll
  // da, nur das Symbol tritt zurueck.
  const css = panel.slice(panel.indexOf(".schalterknopf[disabled]"),
                          panel.indexOf(".schalterknopf[disabled]") + 400);
  assert.doesNotMatch(css, /opacity:\s*0?\.[0-4]/, "die Knoepfe sind wieder fast durchsichtig");
  assert.match(css, /background:/, "der Kreis selbst verschwindet");
});


// ---------------------------------------------------------------------------
// Die Starteinstellungen auf dem Startbild.

pruefe("Name, Herkunft, Modus und beide Hintergruende stehen dort", () => {
  // Sie entscheiden sich, BEVOR man an Farben geht - deshalb hierher und
  // nicht als Kachelgruppe in Stufe 1.
  const b = panel.slice(panel.indexOf('<div class="starteinst">'), panel.indexOf('<p class="startnotiz">'));
  assert.ok(b.length > 400, "der Block wurde nicht gefunden");
  assert.match(b, /class="se-name"/, "Name fehlt");
  assert.match(b, /T\("Herkunft"\)/, "Herkunft fehlt");
  assert.match(b, /data-se-modus/, "Modus fehlt");
  assert.match(b, /--lovelace-background/, "Hintergrundbild fehlt");
  assert.match(b, /--popup-custom-wallpaper/, "Pop-up-Hintergrund fehlt");
});

pruefe("Hintergrund und Pop-up gibt es je Modus, mit Galerie", () => {
  const b = panel.slice(panel.indexOf('<div class="starteinst">'), panel.indexOf('<p class="startnotiz">'));
  // Seit dem 13.10.2026 aus einer Schleife ueber beide Modi erzeugt, nicht
  // zweimal getippt - und jedes Feld hat einen Knopf zur Bildergalerie.
  assert.match(b, /\["light", "dark"\]\.map/);
  assert.match(b, /data-modus="\$\{mo\}"/);
  assert.match(b, /data-galerie="\$\{v\}"/, "der Knopf zur Galerie fehlt");
});

pruefe("Ohne offene Theme gar nicht erst zeigen", () => {
  // "Gesperrt statt versteckt" gilt fuer die Knopfleiste, wo die Position
  // etwas sagt. Ein ganzer Einstellungsblock, der nichts tun kann, ist
  // dagegen nur Laerm - am 13.10.2026 gemeldet als "das ist komplett tot".
  assert.match(panel, /\$\{!ZUSTAND\.modell \? "" : `\s*\n\s*<div class="starteinst">/);
  const b = panel.slice(panel.indexOf('<div class="starteinst">'), panel.indexOf('<p class="startnotiz">'));
  assert.doesNotMatch(b, /ZUSTAND\.modell \? "" : "disabled"/,
    "die Felder sind wieder nur gesperrt statt weg");
});

pruefe("Beide neuen Felder sind auch als Kachel erreichbar", () => {
  // Sonst zaehlt der Import-Bericht sie als "mitgenommen", obwohl HATS sie
  // sehr wohl schreiben kann.
  const stufen = panel.slice(panel.indexOf("const STUFEN = ["), panel.indexOf("const STAND_TEXT"));
  assert.match(stufen, /v: "--lovelace-background"/);
  assert.match(stufen, /v: "--popup-custom-wallpaper"/);
});

pruefe("Der eigene Schalter uix-theme gilt nicht als fremd", () => {
  // Er wird von uixSchalterSetzen() geschrieben, nicht vom Nutzer. Bis zum
  // 14.10.2026 meldete der Bericht ihn ZWEIMAL als fremd: als "kennt HATS
  // nicht" und als "Stilziel von HATG" - bei jeder HATS-Theme mit Vorlagen.
  const m = leseTheme(`liquid_glass:
  uix-card: "ha-card { border: 0 }"
  primary-color: "#ff0000"
`);
  m.name = "liquid_glass";
  uixSchalterSetzen(m);
  assert.strictEqual(m.flach[UIX_SCHALTER], "liquid_glass", "der Schalter wurde gar nicht gesetzt");

  const ziele = new Set(UIX_ZIELE.map((z) => z.id));
  const b = berichtUeberTheme(m, new Set(["primary-color"]), ziele);
  assert.ok(b.bedienbar.includes(UIX_SCHALTER), "der Schalter fehlt bei bedienbar");
  assert.deepStrictEqual(b.mitgenommen, [], `faelschlich mitgenommen: ${b.mitgenommen}`);
  assert.deepStrictEqual(b.stilziele, [], `faelschlich als fremdes Stilziel: ${b.stilziele}`);

  // Gegenprobe 1: Ohne die Stilziel-Liste bleibt uix-card fremd - der Bericht
  // macht also nicht pauschal alles zu eigenem.
  const ohne = berichtUeberTheme(m, new Set(["primary-color"]));
  assert.deepStrictEqual(ohne.stilziele, ["uix-card"]);
  assert.ok(!ohne.stilziele.includes(UIX_SCHALTER), "auch ohne Liste darf der Schalter nicht fremd sein");

  // Gegenprobe 2: Ein ERFUNDENES uix-Feld bleibt fremd, auch mit Liste.
  const falsch = leseTheme(`t:\n  uix-gibtesnicht: "x"\n`);
  assert.deepStrictEqual(berichtUeberTheme(falsch, new Set(), ziele).stilziele, ["uix-gibtesnicht"]);
});

pruefe("Die Kennzahl auf der Startseite zaehlt die Theme, nicht das Panel", () => {
  // Hier stand felderGesamt - die Summe ueber alle acht Stufen, also was das
  // Panel ANBIETEN kann. Unter "Dein Theme im Ueberblick", neben zwei Zahlen,
  // die sich auf die Theme beziehen. Der Bericht beim Oeffnen sagte etwas
  // anderes, und wer beide sah, hielt eine fuer falsch.
  assert.match(panel, /const felderImModell = ZUSTAND\.modell/,
    "die Kennzahl wird nicht aus dem Modell gerechnet");
  assert.match(panel, /<b>\$\{felderImModell\}<\/b><span>\$\{T\("Felder"\)\}/,
    "die Kachel zeigt nicht die Zahl aus dem Modell");
  // Gegenprobe: felderGesamt steht noch da - aber nur noch als Hinweis am
  // title, nicht mehr als die grosse Zahl.
  assert.match(panel, /title="\$\{felderGesamt\} \$\{T\("bietet das Panel an"\)\}"/);
  const kachel = /<div class="kennzahl"[^>]*><b>\$\{felderImModell\}/.exec(panel);
  assert.ok(kachel, "die Kachel sieht anders aus als erwartet");
  // Und der englische Text fehlt nicht - sonst stuende Deutsch im englischen Panel.
  assert.match(panel, /"bietet das Panel an": "[^"]+"/);
});

console.log(`\n${n} Pruefungen`);
if (n < 30) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }
