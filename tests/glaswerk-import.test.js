// Die Ein- und Ausgaberoutine.
//
// Glaswerk wirft beim Lesen nichts weg - leseTheme legt jedes Feld ins Modell,
// schreibeTheme gibt es wieder aus. Was lange fehlte, war nicht die
// Faehigkeit, sondern die AUSKUNFT: Ohne Bericht glaubt man, ein Feld sei weg,
// nur weil keine Kachel dafuer da ist.

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { leseTheme, schreibeTheme, berichtUeberTheme, uixSchalterSetzen, UIX_SCHALTER }
  from "../custom_components/glaswerk/www/theme.js";
import { UIX_ZIELE } from "../custom_components/glaswerk/www/uix.js";
import { begleiter } from "../custom_components/glaswerk/www/palette.js";

const hier = path.dirname(fileURLToPath(import.meta.url));
const panel = readFileSync(path.join(hier, "../custom_components/glaswerk/www/glaswerk-panel.js"), "utf8");

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

pruefe("Was Glaswerk nicht kennt, kommt unveraendert wieder heraus", () => {
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

pruefe("Keine Leiste mehr - und keine Aktion dabei verloren", () => {
  // Drei Stellen fuer Navigation waren zwei zu viel: Seitenleiste,
  // Schalterreihe und Startkarten wurden am 13.10.2026 zu einer Pille oben.
  // Am 14.10. fielen die acht Stufen daraus (die Liste sagt mehr), am
  // 15.10. die Leiste selbst - auf Ansage: "die leiste oben ist eigendlich
  // ueberfluessig bis auf speichern".
  //
  // DIE GEFAHR BEIM UMRAEUMEN IST NICHT DAS AUSSEHEN, SONDERN DER VERLUST.
  // Neun Symbole an drei neue Orte zu verteilen heisst: Eines kann dabei
  // herausfallen, und dann gibt es eine Funktion, die niemand mehr aufrufen
  // kann - sichtbar an nichts. Dieser Test zaehlt deshalb beide Richtungen
  // gegeneinander, statt eine Liste von Namen zu pflegen.
  assert.doesNotMatch(panel, /class="menueleiste"/, "die Leiste ist zurueck");
  assert.doesNotMatch(panel, /class="ml-knopf"/, "die Leistenknoepfe sind zurueck");
  assert.doesNotMatch(panel, /data-rail=/, "die Stufen stehen wieder in einer Leiste");
  assert.doesNotMatch(panel, /class="rail"/, "die alte Seitenleiste ist zurueck");

  // Was es an Aktionen gibt: die Schluessel von `schalter`.
  const schalterBlock = panel.slice(panel.indexOf("    const schalter = {"),
                                    panel.indexOf("querySelectorAll(\"[data-schalter]\")"));
  assert.ok(schalterBlock.length > 200, "der Schalterblock wurde nicht gefunden");
  const aktionen = [...schalterBlock.matchAll(/^\s{6}([a-z0-9]+): \(\) =>/gm)].map((m) => m[1]);
  assert.ok(aktionen.length >= 9, `nur ${aktionen.length} Aktionen gefunden`);

  // Wo sie im Markup vorkommen - seit dem 15.10.2026 noch drei Orte, aber
  // auf EINER Seite: der Kopf (was zur Datei gehoert) und die zwei Reihen
  // "Datei" und "Werkzeuge".
  const teil = (von, bis) => panel.slice(panel.indexOf(von), panel.indexOf(bis, panel.indexOf(von)));
  const orte = {
    kopf: teil('<div class="sichern">', '<button class="speichern">'),
    anfangen: teil('{ id: "anfangen", titel: T("Anfangen"), wege: [', '{ id: "werkzeuge"'),
    werkzeuge: teil('{ id: "werkzeuge", titel: T("Werkzeuge"), wege: [', "    ];"),
  };
  for (const [name, t] of Object.entries(orte))
    assert.ok(t.length > 200, `${name}: der Block wurde nicht gefunden`);

  // Die Reihen tragen selbst eine id ("anfangen", "werkzeuge") - die ist
  // keine Aktion. Gezaehlt wird erst ab "wege: [".
  const idsVon = (t) => {
    const ab = t.indexOf("wege: [");   // der Kopf hat keine - dann alles
    return [...(ab > -1 ? t.slice(ab) : t).matchAll(/id: "([a-z0-9]+)"/g)].map((m) => m[1]);
  };
  const benutzt = new Set(Object.values(orte).flatMap(idsVon));

  for (const a of aktionen)
    assert.ok(benutzt.has(a), `die Aktion "${a}" hat keinen Knopf mehr - sie ist unerreichbar`);
  for (const b of benutzt)
    assert.ok(aktionen.includes(b), `der Knopf "${b}" ruft eine Aktion auf, die es nicht gibt`);

  // Und jeder Ort traegt das, was dorthin gehoert.
  assert.deepStrictEqual(idsVon(orte.kopf), ["verwerfen", "laden2", "kopie2"],
    "im Kopf steht nicht mehr das, was zur Datei gehoert");
  // Die Hilfe steht oben bei den Wegen zum Anfangen, nicht bei den
  // Werkzeugen: Sie fasst keine Theme an - und sie fuellt die vierte
  // Stelle, die sonst leer blieb.
  assert.deepStrictEqual(idsVon(orte.anfangen), ["neu", "oeffnen", "lesen", "hilfe"],
    "die Reihe Anfangen hat sich geaendert");
  assert.deepStrictEqual(idsVon(orte.werkzeuge), ["baukasten", "uix"],
    "die Reihe Werkzeuge hat sich geaendert");
  // Und es gibt keine zweite Seite mehr, auf der dasselbe noch einmal steht.
  assert.doesNotMatch(panel, /ZUSTAND\.start/, "der Startseiten-Merker ist zurueck");
  assert.doesNotMatch(panel, /this\.startbild\(/, "die Startseite ist zurueck");
});

pruefe("Die Hilfe gilt auch ohne offene Theme", () => {
  // Sie ist der einzige Weg, der keine Theme anfasst. Ein gesperrter
  // Hilfeknopf waere genau dann gesperrt, wenn man ihn braucht.
  const w = panel.slice(panel.indexOf('{ id: "anfangen"'), panel.indexOf('{ id: "werkzeuge"'));
  const eintrag = /\{ id: "hilfe",[\s\S]{0,260}?\},/.exec(w);
  assert.ok(eintrag, "der Hilfeweg fehlt");
  assert.doesNotMatch(eintrag[0], /aus:/, "die Hilfe wird gesperrt");
});

pruefe("Die Knoepfe im Kopf tragen Titel statt Beschriftung", () => {
  // Gilt weiter: Der Name steht im title und im aria-label, nicht als Text
  // daneben - vier Knoepfe neben Speichern muessen in jede Breite passen.
  const kopf = panel.slice(panel.indexOf('<div class="sichern">'), panel.indexOf('<button class="speichern">'));
  assert.match(kopf, /title="\$\{k\.t\}" aria-label="\$\{k\.t\}"/,
    "ohne Beschriftung braucht es wenigstens title und aria-label");
  assert.strictEqual((kopf.match(/class="kopfknopf"/g) || []).length, 1,
    "die Knoepfe werden nicht mehr aus EINER Vorlage erzeugt");
  // Die Wege dagegen tragen Namen - sie haben Platz und sind keine
  // Symbolreihe.
  const w = panel.slice(panel.indexOf("  wegeHtml(T, welche) {"), panel.indexOf("  // Worauf die Theme aufsetzt"));
  assert.match(w, /<b>\$\{w\.t\}<\/b>/, "die Wege haben keine Beschriftung");
});

pruefe("Verwerfen geht auf den Stand beim Oeffnen zurueck", () => {
  // _grundlage haelt die Datei, wie sie hereinkam - nicht die leere Vorlage.
  // Mit der falschen Quelle waere "verwerfen" ein Datenverlust.
  const b = panel.slice(panel.indexOf("  verwerfen() {"), panel.indexOf("  async neuBeginnen("));
  assert.match(b, /ZUSTAND\.modell = JSON\.parse\(JSON\.stringify\(this\._grundlage\)\)/);
  assert.match(b, /ZUSTAND\.geaendert\.clear\(\)/);
});

pruefe("Jeder Weg, der das Modell ersetzt, fragt bei Ungespeichertem nach", () => {
  // Die Rueckfrage stand bis zum 15.10.2026 in zumStart() - dem Weg zurueck
  // auf die Startseite. Die Startseite ist weg, die Gefahr nicht: "Neue
  // Theme", "Vorhandene oeffnen" und "Datei oder Text" ersetzen das Modell
  // genauso, und sie stehen jetzt gross auf derselben Seite wie die Arbeit.
  const h = panel.slice(panel.indexOf("  darfVerlassen() {"), panel.indexOf("  async neuBeginnen("));
  assert.ok(h.length > 200, "darfVerlassen() fehlt");
  assert.match(h, /if \(!ZUSTAND\.geaendert\.size\) return true/, "fragt auch ohne Aenderungen");
  assert.match(h, /this\._verlassenBestaetigt/, "fragt bei jedem Klick statt einmal");
  for (const weg of ["async neuBeginnen()", "async oeffneDatei(name)", "importiereText(text, quelle)"]) {
    const ab = panel.indexOf("  " + weg + " {");
    assert.ok(ab > -1, `${weg} gibt es nicht mehr`);
    assert.match(panel.slice(ab, ab + 400), /if \(!this\.darfVerlassen\(\)\) return/,
      `${weg} wirft Ungespeichertes ohne Rueckfrage weg`);
  }
});

pruefe("Eine Seite, von der alles weitergeht", () => {
  // Diese Pruefung hat ihre Erwartung dreimal gewechselt, und jedes Mal war
  // der Grund derselbe: Wo sonst kommt man an diese Wege?
  //
  //   bis 13.10.  gar keine Karten - "zwei Wege zur selben Sache"
  //   bis 15.10.  Karten, aber nur ohne offene Theme; sonst trug die
  //               Leiste oben dieselben Wege
  //   15.10.      Karten immer, auf einer eigenen Startseite
  //   seit 15.10. EINE Seite: "wir haben zu viele seiten wo wir starten
  //               koennen. lass die letzte zu unser einzigen seite machen
  //               von wo alles weiter geht."
  // Geprueft wird der AUFRUF, nicht das Wort: Im Kommentar steht noch,
  // dass hier einmal startbild() stand, und das soll es auch.
  assert.doesNotMatch(panel, /this\.startbild\(/, "die Startseite ist zurueck");
  assert.doesNotMatch(panel, /this\.zumStart\(/, "der Weg zur Startseite ist zurueck");
  const seite = panel.slice(panel.indexOf("            <!-- EINE SEITE,"), panel.indexOf("            </section>"));
  assert.ok(seite.length > 300, "der Rumpf der Seite wurde nicht gefunden");
  // Die Wege stehen IMMER da, die Felder und die Stufen nur mit Theme.
  assert.match(seite, /this\.wegeHtml\(T\)/, "die Wege fehlen, wenn keine Theme offen ist");
  assert.match(seite, /this\.wegeHtml\(T, "anfangen"\)/, "die Reihe Anfangen fehlt");
  assert.match(seite, /this\.wegeHtml\(T, "werkzeuge"\)/, "die Reihe Werkzeuge fehlt");
  // Und die Werkzeuge stehen UNTER den Startfeldern, direkt ueber der Liste.
  assert.ok(seite.indexOf('wegeHtml(T, "werkzeuge")') > seite.indexOf("startFelder(T)"),
    "die Werkzeuge stehen wieder ueber den Startfeldern");
  assert.ok(seite.indexOf('class="liste"') > seite.indexOf('wegeHtml(T, "werkzeuge")'),
    "die Liste steht nicht unter den Werkzeugen");
  // Ohne Theme stehen NUR die Wege da; alles andere - Startfelder,
  // Werkzeuge, Liste - haengt am Modell.
  assert.match(seite, /\$\{!ZUSTAND\.modell \? this\.wegeHtml\(T\) : `/,
    "die Seite unterscheidet nicht mehr, ob eine Theme offen ist");
  assert.match(seite, /class="liste"/, "die Stufenliste fehlt");
  // Und der Name steht genau EINMAL auf der Seite - im Kopf.
  const felder = panel.slice(panel.indexOf("  startFelder(T) {"), panel.indexOf("  // Die Dateiliste als Dialog"));
  assert.doesNotMatch(felder, /class="se-name"/,
    "das Namensfeld steht zweimal auf derselben Seite");
  assert.match(panel, /class="namensfeld"/, "das Namensfeld fehlt im Kopf");
  // Die beiden anderen der drei Felder sind da.
  assert.match(felder, /T\("Herkunft"\)/, "die Grundlage fehlt");
  assert.match(felder, /data-se-modus/, "der Modus fehlt");
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
// Die Starteinstellungen, seit dem 15.10.2026 auf der einen Seite.

pruefe("Herkunft, Modus und beide Hintergruende stehen dort", () => {
  // Sie entscheiden sich, BEVOR man an Farben geht - deshalb hierher und
  // nicht als Kachelgruppe in Stufe 1. Der NAME steht im Kopf, neben
  // Speichern: Seit alles auf einer Seite steht, waere er hier das zweite
  // Feld fuer denselben Wert.
  const b = panel.slice(panel.indexOf('<div class="starteinst">'), panel.indexOf('<p class="startnotiz">'));
  assert.ok(b.length > 400, "der Block wurde nicht gefunden");
  assert.doesNotMatch(b, /class="se-name"/, "der Name steht zweimal auf der Seite");
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
  // Der Block haengt jetzt eine Ebene hoeher am Modell: Die Seite ruft
  // startFelder(T) nur mit offener Theme auf. Geprueft wird genau das.
  const seite = panel.slice(panel.indexOf("            <!-- EINE SEITE,"), panel.indexOf("            </section>"));
  assert.ok(seite.length > 300, "der Rumpf der Seite wurde nicht gefunden");
  assert.match(seite, /\$\{!ZUSTAND\.modell \? this\.wegeHtml\(T\) : `/,
    "die Startfelder stehen auch ohne Theme da");
  assert.ok(seite.indexOf("startFelder(T)") > seite.indexOf("!ZUSTAND.modell ?"),
    "die Startfelder stehen vor der Abfrage");
  const b = panel.slice(panel.indexOf('<div class="starteinst">'), panel.indexOf('<p class="startnotiz">'));
  assert.doesNotMatch(b, /ZUSTAND\.modell \? "" : "disabled"/,
    "die Felder sind wieder nur gesperrt statt weg");
});

pruefe("Beide neuen Felder sind auch als Kachel erreichbar", () => {
  // Sonst zaehlt der Import-Bericht sie als "mitgenommen", obwohl Glaswerk sie
  // sehr wohl schreiben kann.
  const stufen = panel.slice(panel.indexOf("const STUFEN = ["), panel.indexOf("const STAND_TEXT"));
  assert.match(stufen, /v: "--lovelace-background"/);
  assert.match(stufen, /v: "--popup-custom-wallpaper"/);
});

pruefe("Der eigene Schalter uix-theme gilt nicht als fremd", () => {
  // Er wird von uixSchalterSetzen() geschrieben, nicht vom Nutzer. Bis zum
  // 14.10.2026 meldete der Bericht ihn ZWEIMAL als fremd: als "kennt Glaswerk
  // nicht" und als "Stilziel von HATG" - bei jeder Glaswerk-Theme mit Vorlagen.
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

pruefe("Was begleiter() mitschreibt, gilt dem Bericht nicht als fremd", () => {
  // Eine Palette MIT eigenen Farben (Warm, Kuehl, Monochrom, macOS) laesst
  // palette.js vier Begleiter und rgb-primary-color mitschreiben. Vier haben
  // eine Kachel, rgb-primary-color mit Absicht nicht - und ohne diese Zeile in
  // BEKANNT meldete der Bericht es als "kennt Glaswerk nicht".
  assert.match(panel, /\.\.\.Object\.keys\(begleiter\("#[0-9a-f]{6}"\) \|\| \{\}\),/,
    "BEKANNT kennt die Begleiter nicht");
  const geschrieben = Object.keys(begleiter("#808080") || {});
  assert.ok(geschrieben.includes("rgb-primary-color"), "begleiter schreibt es gar nicht mehr");
  // Gegenprobe: Die Begleiter stehen in BEKANNT, aber rgb-primary-color hat
  // KEINE Kachel - sonst waere die Regel "kein eigenes rgb-Feld" durchloechert.
  const kacheln = [...panel.matchAll(/\bv:\s*"--([a-z0-9-]+)"/g)].map((x) => x[1]);
  assert.ok(!kacheln.includes("rgb-primary-color"),
    "rgb-primary-color hat eine Kachel bekommen - die eine Ausnahme soll nicht einstellbar sein");
  for (const k of geschrieben) {
    if (k === "rgb-primary-color") continue;
    assert.ok(kacheln.includes(k), `${k} hat keine Kachel mehr`);
  }
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

pruefe("Stufe 8 und der Bericht zaehlen dieselben Felder", () => {
  // Dieselbe Sorte Fehler wie bei der Kennzahl darueber, eine Kachel weiter:
  // "Felder insgesamt" summierte die drei Ebenen. Ein Feld mit eigenem Wert
  // fuer hell und dunkel zaehlte damit zweimal. Bei macos: 434 auf der
  // Kachel, 398 im Bericht - ueber dieselbe Datei, im selben Panel.
  const ausdruck = /case "gesamt": return m\s*\?\s*(String\([\s\S]*?\))\s*\n?\s*: "-";/.exec(panel);
  assert.ok(ausdruck, "die Kachel 'Felder insgesamt' sieht anders aus als erwartet");
  const rechne = new Function("m", "return " + ausdruck[1]);

  const THEME = [
    "zwei:",
    '  primary-color: "#111111"',
    "  modes:",
    "    light:",
    '      card-background-color: "#ffffff"',
    '      primary-text-color: "#000000"',
    "    dark:",
    '      card-background-color: "#222222"',
    '      primary-text-color: "#eeeeee"',
  ].join("\n");
  const m = leseTheme(THEME);
  const b = berichtUeberTheme(m, new Set());
  // Drei Namen, aber fuenf Eintraege - genau der Fall, der auseinanderlief.
  assert.strictEqual(b.felder, 3);
  assert.strictEqual(b.flach + b.hell + b.dunkel, 5);
  assert.strictEqual(rechne(m), String(b.felder),
    `Stufe 8 sagt ${rechne(m)}, der Bericht ${b.felder}`);
  // Gegenprobe: Die alte Rechnung faellt hier wirklich durch - sonst waere
  // die Pruefung blind fuer genau den Fehler, den sie festhalten soll.
  const alt = (o) => Object.values(o || {}).filter((v) => v !== "" && v !== undefined).length;
  assert.strictEqual(alt(m.flach) + alt(m.light) + alt(m.dark), 5);
  assert.notStrictEqual(String(alt(m.flach) + alt(m.light) + alt(m.dark)), String(b.felder));
});

console.log(`\n${n} Pruefungen`);
if (n < 31) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }
