// Der Baukasten: fertige Teile zum Zusammenstecken.
//
// Die Pruefungen hier halten fest, was einen Baukasten unbrauchbar macht,
// ohne dass es auffaellt: ein Teil, das nur die Haelfte setzt, und ein Feld,
// das geschrieben wird, obwohl Home Assistant es selbst ableitet.

import assert from "node:assert";
import { rampe } from "../custom_components/hats/www/palette.js";
import { BAUKASTEN, PALETTEN, KARTENSTILE, SCHRIFTEN, HINTERGRUENDE, palettenVorschau, seiteHatInhalt,
         SORTEN_FELDER,
         KARTENSTIL_FELDER, teilAnwenden, erkenneTeil, SORTEN_VORLAGEN,
         RUNDUNGEN, DICHTEN } from "../custom_components/hats/www/baukasten.js";
import { VORLAGEN } from "../custom_components/hats/www/vorlagen.js";
import { leseTheme } from "../custom_components/hats/www/theme.js";

let n = 0;
function pruefe(was, fn) { fn(); n++; console.log("ok", was); }

// Ein Modell aus drei Ebenen, wie theme.js es fuehrt.
function leer() { return { beide: {}, light: {}, dark: {} }; }
function schreiberFuer(m) { return (name, wert, ebene) => { m[ebene === "beide" ? "beide" : ebene][name] = wert; }; }
function leserFuer(m) { return (name, ebene) => (ebene === "beide" ? m.beide[name] : m[ebene][name]); }

pruefe("Sieben Sorten, jede mit beiden Sprachen", () => {
  // "oberflaeche" traegt KEINE Teile, nur Vorlagen - Seitenleiste, Kopfleiste
  // und Dialoge haetten sonst nirgends hingehoert.
  //
  // "rundung" und "dichte" sind am 14.10.2026 dazugekommen, auf Ansage: Sie
  // stehen VOR den Karten, weil sie die ganze Oberflaeche betreffen und die
  // Karten nur einen Teil davon.
  assert.deepStrictEqual(Object.keys(BAUKASTEN),
    ["palette", "schrift", "rundung", "dichte", "karten", "hintergrund", "oberflaeche"]);
  for (const [sorte, s] of Object.entries(BAUKASTEN)) {
    assert.ok(s.de && s.en, `${sorte}: eine Sprache fehlt`);
    if (s.nurVorlagen) {
      assert.strictEqual(s.teile.length, 0, `${sorte}: traegt nurVorlagen und trotzdem Teile`);
      assert.ok(s.zweckDe && s.zweckEn, `${sorte}: ohne Teile braucht die Sorte selbst einen Zweck`);
      continue;
    }
    assert.ok(s.teile.length >= 3, `${sorte}: zu wenige Teile`);
    const ids = s.teile.map((t) => t.id);
    assert.strictEqual(new Set(ids).size, ids.length, `${sorte}: eine id kommt doppelt vor`);
    for (const t of s.teile) {
      assert.ok(t.de && t.en, `${sorte}/${t.id}: Name fehlt in einer Sprache`);
      assert.ok(t.zweckDe && t.zweckEn, `${sorte}/${t.id}: Zweck fehlt in einer Sprache`);
    }
  }
});

pruefe("JEDER Kartenstil setzt alle sechs Felder", () => {
  // Das ist die teuerste Falle des ganzen Baukastens: Ein fehlendes Feld
  // behaelt den Wert des VORIGEN Stils. Wer von Glas auf Flach wechselt und
  // die Weichzeichnung bliebe stehen, bekaeme eine deckende Flaeche mit
  // backdrop-filter - sichtbar wird das erst vor einem gemusterten
  // Hintergrund, also oft gar nicht.
  for (const s of KARTENSTILE) {
    const m = leer();
    teilAnwenden("karten", s, schreiberFuer(m));
    const gesetzt = new Set([...Object.keys(m.beide), ...Object.keys(m.light), ...Object.keys(m.dark)]);
    for (const f of KARTENSTIL_FELDER)
      assert.ok(gesetzt.has(f), `${s.id}: ${f} fehlt`);
  }
});

pruefe("Die Flaeche steht je Modus, die Form flach", () => {
  // Eine Kartenflaeche MUSS je Modus verschieden sein - dieselbe in Hell und
  // Dunkel ist in einem der beiden falsch. Rundung und Rahmenbreite dagegen
  // sind modusunabhaengig und gehoeren flach; stuenden sie je Modus, fehlten
  // sie im jeweils anderen.
  for (const s of KARTENSTILE) {
    assert.ok(s.light?.["--ha-card-background"], `${s.id}: keine helle Flaeche`);
    assert.ok(s.dark?.["--ha-card-background"], `${s.id}: keine dunkle Flaeche`);
    assert.notStrictEqual(s.light["--ha-card-background"], s.dark["--ha-card-background"],
      `${s.id}: gleiche Flaeche in beiden Modi - einer davon ist falsch`);
    assert.ok(s.flach?.["--ha-card-border-radius"], `${s.id}: Rundung nicht flach`);
  }
});

pruefe("Eine rechnende Palette setzt elf Stufen je Rolle, und zwar FLACH", () => {
  // Flach, weil Home Assistant nur dort in BEIDEN Modi die RGB-Tripel
  // ableitet, aus denen Mushroom seine Zustandsfarben baut.
  const m = leer();
  teilAnwenden("palette", PALETTEN.find((p) => p.id === "warm"), schreiberFuer(m));
  for (const rolle of ["primary", "neutral", "red", "green", "orange"]) {
    const stufen = Object.keys(m.beide).filter((k) => k.startsWith(`--ha-color-${rolle}-`));
    assert.strictEqual(stufen.length, 11, `${rolle}: ${stufen.length} Stufen statt 11`);
  }
  assert.strictEqual(Object.keys(m.light).filter((k) => k.startsWith("--ha-color-")).length, 0,
    "Palettenstufen stehen je Modus - dort leitet HA keine Tripel ab");
});

pruefe("Der Akzent ist das Einzige je Modus - und er unterscheidet sich", () => {
  for (const p of PALETTEN) {
    assert.ok(p.akzent?.light && p.akzent?.dark, `${p.id}: Akzent fehlt`);
    assert.notStrictEqual(p.akzent.light, p.akzent.dark,
      `${p.id}: gleicher Akzent in beiden Modi - im Dunkeln braucht es eine hellere Stufe`);
  }
});

pruefe("Home Assistant und Liquid Glass ruehren die Palette NICHT an", () => {
  // Die Grundlage ha_blanko bringt HAs 55 Stufen Wert fuer Wert aus einer
  // laufenden Instanz mit. Wer sie nachrechnen liesse, bekaeme eine
  // Annaeherung - am 13.10.2026 gemessen: 15 von 60 Stufen trafen, der Rest
  // lag um bis zu acht Einheiten daneben.
  //
  // Und die laufende liquid_glass aendert an ha_blanko KEIN einziges Feld:
  // 232 unveraendert, 0 geaendert. Violett ist dort allein der Akzent.
  for (const id of ["ha", "liquid"]) {
    const m = leer();
    teilAnwenden("palette", PALETTEN.find((p) => p.id === id), schreiberFuer(m));
    const stufen = Object.keys(m.beide).filter((k) => k.startsWith("--ha-color-"));
    assert.deepStrictEqual(stufen, [], `${id}: faerbt die Palette um (${stufen.length} Stufen)`);
    // Der Akzent muss trotzdem gesetzt werden - er ist der ganze Unterschied.
    assert.ok(m.light["--accent-color"] && m.dark["--accent-color"], `${id}: setzt keinen Akzent`);
  }
});

pruefe("primary-color wird NICHT geschrieben", () => {
  // Home Assistant deklariert es selbst als var(--ha-color-primary-40) und
  // folgt der Rampe von allein. Wer es schreibt, friert es ein - dieselbe
  // Falle, an der bei HATG gefuellte Knoepfe trotz grauem Akzent blau blieben.
  const m = leer();
  teilAnwenden("palette", PALETTEN.find((p) => p.id === "warm"), schreiberFuer(m));
  const alle = [...Object.keys(m.beide), ...Object.keys(m.light), ...Object.keys(m.dark)];
  assert.ok(!alle.includes("--primary-color"), "--primary-color darf nicht gesetzt werden");
  // rgb-primary-color dagegen MUSS dabei sein: HA rechnet Tripel nur aus
  // Feldern, die im Theme stehen - primary-color steht nach obigem gerade
  // nicht drin, also bliebe das Tripel auf HAs altem Cyan.
  assert.ok(alle.includes("--rgb-primary-color"), "--rgb-primary-color fehlt");
});

pruefe("Kein anderes rgb-Feld wird geschrieben", () => {
  // Ein eigenes rgb-Feld blockiert HAs Ableitung je Modus: HA ueberspringt
  // den Namen, sobald die Theme ihn mitbringt. Bei einer modusabhaengigen
  // Quelle nagelt das den Hell-Wert in den Dunkelmodus - gemessen an der
  // Seitenleiste, Kontrast 1.19:1.
  for (const sorte of Object.keys(BAUKASTEN)) {
    for (const teil of BAUKASTEN[sorte].teile) {
      const m = leer();
      teilAnwenden(sorte, teil, schreiberFuer(m));
      const rgb = [...Object.keys(m.beide), ...Object.keys(m.light), ...Object.keys(m.dark)]
        .filter((k) => k.startsWith("--rgb-") && k !== "--rgb-primary-color");
      assert.deepStrictEqual(rgb, [], `${sorte}/${teil.id}: schreibt ${rgb.join(", ")}`);
    }
  }
});

pruefe("Ein angewendetes Teil wird wiedererkannt", () => {
  for (const sorte of Object.keys(BAUKASTEN)) {
    if (BAUKASTEN[sorte].nurVorlagen) continue;
    for (const teil of BAUKASTEN[sorte].teile) {
      const m = leer();
      teilAnwenden(sorte, teil, schreiberFuer(m));
      assert.strictEqual(erkenneTeil(sorte, leserFuer(m)), teil.id,
        `${sorte}/${teil.id} wird nicht wiedererkannt`);
    }
  }
});

pruefe("Wer weichzeichnet, sagt dass er einen Hintergrund braucht", () => {
  // Eine durchscheinende Flaeche vor einer einfarbigen Wand sieht aus wie eine
  // etwas hellere Wand. Wer sie waehlt und keinen Hintergrund hat, sieht
  // nichts - und sucht den Fehler in der Theme.
  //
  // Geprueft wird nicht gegen eine Liste von ids, sondern gegen den GRUND:
  // Weichzeichnung heisst, dass etwas durchscheinen soll. Am 14.10.2026 kam
  // "macOS" dazu, und eine Liste haette hier nur gesagt, dass sie nicht
  // nachgefuehrt wurde.
  let weich = 0;
  for (const s of KARTENSTILE) {
    const f = s.flach?.["--ha-card-backdrop-filter"] || "none";
    const zeichnet = f !== "none" && f !== "";
    if (zeichnet) weich++;
    assert.strictEqual(!!s.braucht?.hintergrund, zeichnet,
      zeichnet ? `${s.id} zeichnet weich und sagt es nicht`
               : `${s.id} braucht keinen Hintergrund`);
  }
  assert.ok(weich >= 2, `nur ${weich} Stile zeichnen weich - die Pruefung laeuft ins Leere`);
  assert.ok(HINTERGRUENDE.some((h) => h.id !== "keiner"), "es gibt keinen Hintergrund zur Auswahl");
});

pruefe("Schriften kommen ohne Download aus", () => {
  // Eine Webschrift braucht uix-fonts und damit eine Datei auf der Instanz.
  // Das ist ein eigener Schritt, keine Auswahl - ein Teil, das eine fehlende
  // Datei voraussetzt, waere im Baukasten eine Falle.
  for (const s of SCHRIFTEN) {
    const f = s.felder?.["--ha-font-family-body"] || "";
    assert.doesNotMatch(f, /url\(|@import|https?:/, `${s.id}: verweist auf eine externe Schrift`);
    assert.ok(f.length > 3, `${s.id}: keine Schriftfamilie`);
  }
});

pruefe("Gegenprobe: ein unvollstaendiger Kartenstil faellt auf", () => {
  const kaputt = { id: "test", de: "x", en: "x", zweckDe: "x", zweckEn: "x",
                   flach: { "--ha-card-border-radius": "8px" }, light: {}, dark: {} };
  const m = leer();
  teilAnwenden("karten", kaputt, schreiberFuer(m));
  const gesetzt = new Set(Object.keys(m.beide));
  const fehlend = KARTENSTIL_FELDER.filter((f) => !gesetzt.has(f));
  assert.ok(fehlend.length >= 5, "die Vollstaendigkeitspruefung wuerde nichts finden");
});

pruefe("Gegenprobe: eine fremde Theme wird NICHT erkannt", () => {
  const m = leer();
  m.light["--ha-card-background"] = "#abcdef";
  assert.strictEqual(erkenneTeil("karten", leserFuer(m)), null,
    "erkenneTeil meldet einen Treffer, wo keiner ist");
});

// ---------------------------------------------------------------------------
// Der Baukasten im Panel.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const hier = path.dirname(fileURLToPath(import.meta.url));
const panel = readFileSync(path.join(hier, "../custom_components/hats/www/hats-panel.js"), "utf8");

pruefe("Der Knopf steht in der Leiste, vor UIX", () => {
  // Zuerst zusammenstecken, dann feinjustieren - die Reihenfolge der Knoepfe
  // ist die Reihenfolge der Arbeit.
  const leiste = panel.slice(panel.indexOf('<nav class="menueleiste">'), panel.indexOf('<header class="kopf">'));
  const ids = [...leiste.matchAll(/id: "([a-z0-9]+)"/g)].map((m) => m[1]);
  assert.strictEqual(ids[0], "baukasten", "der Baukasten steht nicht an erster Stelle");
  assert.ok(ids.indexOf("baukasten") < ids.indexOf("uix"), "der Baukasten gehoert vor UIX");
  assert.match(panel, /baukasten: \(\) => this\.oeffneBaukasten\(\)/, "der Knopf ist nicht verdrahtet");
});

pruefe("Ein leerer Wert entfernt das Feld, statt es leer zu schreiben", () => {
  // Ein geschriebenes leeres Feld steht in der Datei und ueberschreibt HAs
  // eigene Vorgabe mit nichts - der Hintergrund "keiner" wuerde damit nicht
  // zu HAs Hintergrund zurueckkehren, sondern zu gar keinem.
  const b = panel.slice(panel.indexOf("bindeBaukasten(wurzel) {"), panel.indexOf("oeffneUix() {"));
  assert.ok(b.length > 400, "bindeBaukasten nicht gefunden");
  assert.match(b, /if \(wert === "" \|\| wert === null \|\| wert === undefined\) entferne\(/,
    "ein leerer Wert wird geschrieben statt entfernt");
});

pruefe("Die Texte stehen IM en-Block", () => {
  // Ein Eintrag NEBEN dem en-Block ist stumm unerreichbar - in HATG standen so
  // einmal 21 Stueck, und der Test war gruen, weil er im Quelltext suchte
  // statt im Objekt.
  const tab = panel.slice(panel.indexOf("const TEXTE = {"));
  const en = tab.slice(tab.indexOf("en: {"), tab.indexOf("\n  },"));
  for (const x of ["Baukasten", "Fertige Teile zusammenstecken", "Felder gesetzt",
                   "Glas braucht einen Hintergrund, der etwas hergibt"])
    assert.ok(en.includes(JSON.stringify(x)), `${x} fehlt im en-Block`);
});

pruefe("Der Hintergrund-Hinweis haengt an der Bedingung", () => {
  const b = panel.slice(panel.indexOf("zeichneBaukasten() {"), panel.indexOf("bindeBaukasten(wurzel) {"));
  assert.match(b, /glasOhneGrund = sitzt\.karten === "glas" && sitzt\.hintergrund === "keiner"/,
    "der Hinweis haengt nicht an beiden Bedingungen");
  assert.match(b, /\$\{glasOhneGrund \? `/, "der Hinweis steht immer da");
});

pruefe("Jede Vorlage gehoert genau EINER Sorte", () => {
  // Eine nicht zugeordnete Vorlage waere im Baukasten unsichtbar und nur noch
  // ueber den UIX-Dialog erreichbar - genau die Zweigleisigkeit, die der
  // Baukasten abschaffen soll. Eine doppelt zugeordnete staende an zwei
  // Stellen und liesse sich an der einen ein- und an der anderen ausschalten.
  const zugeordnet = Object.values(SORTEN_VORLAGEN).flat();
  const alle = VORLAGEN.map((v) => v.id);
  assert.strictEqual(new Set(zugeordnet).size, zugeordnet.length, "eine Vorlage ist doppelt zugeordnet");
  for (const id of alle)
    assert.ok(zugeordnet.includes(id), `${id} ist keiner Sorte zugeordnet`);
  for (const id of zugeordnet)
    assert.ok(alle.includes(id), `${id} ist zugeordnet, aber es gibt die Vorlage nicht`);
});

pruefe("Die Seite liegt im SELBEN Dialog, nicht darueber", () => {
  // Ein Dialog im Dialog waere ein Kind eines Elements mit backdrop-filter -
  // und das wird zum Bezugsrahmen fuer position: fixed. Genau daran sind
  // Bubble-Pop-ups auf Hoehe 0 geschrumpft.
  const b = panel.slice(panel.indexOf("zeichneBaukasten() {"), panel.indexOf("bkSeiteHtml("));
  assert.match(b, /this\._bkSeite && BAUKASTEN\[this\._bkSeite\]/, "die Seite wird nicht umgeschaltet");
  assert.doesNotMatch(b, /overlay zwei|schliesseFeld/, "die Seite oeffnet einen zweiten Dialog");
  // Und beim Oeffnen wird zurueckgesetzt - eine Seite von letztem Mal waere
  // eine Ueberraschung.
  const o = panel.slice(panel.indexOf("oeffneBaukasten() {"), panel.indexOf("zeichneBaukasten() {"));
  assert.match(o, /this\._bkSeite = null/, "die Seite wird beim Oeffnen nicht zurueckgesetzt");
});

pruefe("Ein Klick wendet an UND oeffnet die Seite", () => {
  const b = panel.slice(panel.indexOf("bindeBaukasten(wurzel) {"), panel.indexOf("zeichneDialog()"));
  assert.match(b, /this\._bkSeite = sorte/, "der Klick oeffnet die Seite nicht");
  assert.match(b, /teilAnwenden\(sorte, teil/, "der Klick wendet nichts an");
});

pruefe("Die Regler schreiben erst beim Loslassen", () => {
  // Ein input-Ereignis je Mauszucken wuerde den Aenderungszaehler fluten und
  // bei jedem Schritt neu zeichnen.
  const b = panel.slice(panel.indexOf("bindeBkSeite(wurzel) {"), panel.indexOf("bindeBaukasten(wurzel) {"));
  assert.ok(b.length > 300, "bindeBkSeite nicht gefunden");
  assert.match(b, /addEventListener\("change", \(\) => \{[\s\S]{0,200}setze\(/,
    "es wird nicht beim change geschrieben");
  const inputTeil = b.slice(b.indexOf('addEventListener("input"'), b.indexOf('addEventListener("change"'));
  assert.doesNotMatch(inputTeil, /setze\(|geaendert\.add/, "das input-Ereignis schreibt ins Modell");
});

pruefe("Ein Klick auf das gewaehlte Teil wendet NICHT neu an", () => {
  // Sonst verliert man jede Feinjustierung: Wer Glas waehlt, die Rundung auf
  // 28px zieht und nochmal auf Glas klickt, steht wieder bei 20px. Das sieht
  // nicht nach einem Fehler aus, sondern nach einem Wert, der nicht haelt.
  const b = panel.slice(panel.indexOf("bindeBaukasten(wurzel) {"), panel.indexOf("zeichneDialog()"));
  const i = b.indexOf('b.classList.contains("an")');
  assert.ok(i > 0, "der Fall wird nicht abgefangen");
  // Und der Ausstieg muss VOR dem Anwenden kommen.
  assert.ok(i < b.indexOf("teilAnwenden("), "die Pruefung steht nach dem Anwenden");
});

pruefe("Jede Palette zeigt Farben, und zwar die gerechneten", () => {
  // Gemeldet am 14.10.2026: "ich habe keine farben zum auswaehlen."
  for (const p of PALETTEN) {
    for (const dunkel of [false, true]) {
      const f = palettenVorschau(p, dunkel);
      assert.strictEqual(f.length, 5, `${p.id}: ${f.length} Tupfer statt 5`);
      assert.deepStrictEqual(f.map((x) => x.rolle),
        ["akzent", "primary", "red", "green", "orange"], p.id);
      for (const x of f) assert.match(x.hex, /^#[0-9a-f]{3,6}$/i, `${p.id}/${x.rolle}: ${x.hex}`);
    }
    // Der Akzent ist die einzige Groesse je Modus - er MUSS sich unterscheiden,
    // sonst steht in den Daten eine Fassung, die niemand sieht.
    assert.notStrictEqual(palettenVorschau(p, false)[0].hex, palettenVorschau(p, true)[0].hex,
      `${p.id}: hell und dunkel tragen denselben Akzent`);
  }
});

pruefe("Der Tupfer zeigt die gerechnete Stufe, nicht den Basiston", () => {
  // rampe() nimmt vom Basiston nur Farbton und Saettigung - die Helligkeit
  // kommt aus HAs Profil. Ein Schwatz des Basiswerts waere gelogen.
  const nord = PALETTEN.find((p) => p.id === "nord");
  const primaer = palettenVorschau(nord, false).find((f) => f.rolle === "primary").hex;
  assert.notStrictEqual(primaer.toLowerCase(), nord.farben.primary.toLowerCase(),
    "der Tupfer ist der Basiston - dann stimmt die Rechnung nicht");
  assert.strictEqual(primaer.toLowerCase(), rampe(nord.farben.primary, "primary")["ha-color-primary-60"].toLowerCase());
  // Gegenprobe: Die beiden Teile OHNE eigene Farben zeigen HAs Toene, nicht
  // eine Rampe aus nichts.
  for (const id of ["ha", "liquid"]) {
    const f = palettenVorschau(PALETTEN.find((p) => p.id === id), false);
    assert.strictEqual(f.find((x) => x.rolle === "primary").hex, "#37c8fd", id);
  }
  // Und: neutral steht NICHT dabei. rampe() setzt dort die Saettigung auf 0,
  // also saehe der Tupfer bei allen fuenfzehn gleich aus.
  assert.ok(!palettenVorschau(PALETTEN[0], false).some((f) => f.rolle === "neutral"));
});

pruefe("Eine Sorte ohne Inhalt bekommt keine Unterseite", () => {
  // Gemeldet am 14.10.2026: "die farbauswahl muss in das popup von
  // Farben/Richtung der rest ist doppelt." Ein Klick auf eine Palette oeffnete
  // eine Seite, auf der nur dieselbe Kachel noch einmal stand.
  assert.strictEqual(seiteHatInhalt("palette"), false, "die Farben haben eine leere Unterseite");
  for (const k of ["schrift", "karten", "hintergrund", "oberflaeche"])
    assert.strictEqual(seiteHatInhalt(k), true, `${k} hat nichts zu zeigen`);

  // Gegenprobe gegen eine haendisch gepflegte Liste: Die Antwort kommt aus den
  // Daten, nicht aus einer zweiten Aufzaehlung.
  for (const k of Object.keys(BAUKASTEN)) {
    const hat = (SORTEN_VORLAGEN[k] || []).length > 0 || (SORTEN_FELDER[k] || []).length > 0;
    assert.strictEqual(seiteHatInhalt(k), hat, k);
  }

  // Und das Panel fragt wirklich, statt immer zu oeffnen.
  const panel = readFileSync(path.join(hier, "../custom_components/hats/www/hats-panel.js"), "utf8");
  const klick = panel.slice(panel.indexOf('wurzel.querySelectorAll("[data-bk-teil]")'), panel.indexOf("oeffneUix() {"));
  assert.match(klick, /if \(!seiteHatInhalt\(sorte\)\) return;/, "ein Klick auf das gesetzte Teil oeffnet weiter");
  assert.match(klick, /if \(seiteHatInhalt\(sorte\)\) this\._bkSeite = sorte;/, "nach dem Anwenden wird weiter immer geoeffnet");
  assert.doesNotMatch(klick, /\n\s*this\._bkSeite = sorte;\n\s*this\.zeichneBaukasten\(\);\n\s*this\.zeichneZaehler/,
    "irgendwo wird _bkSeite noch ungeprueft gesetzt");
});

// --- Rundung und Dichte, 14.10.2026 ------------------------------------

pruefe("Jede Rundung setzt die ganze Leiter und die Karte dazu", () => {
  // Eine halbe Leiter ergaebe eckige Knoepfe an runden Dialogen. Und die
  // Karte braucht ihren eigenen Wert: ha-card liest
  // var(--ha-card-border-radius, var(--ha-border-radius-lg)) - der
  // Ausweichwert greift nur, solange niemand das Feld setzt, und jeder
  // Kartenstil setzt es.
  const STUFEN = ["sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl"];
  for (const t of RUNDUNGEN) {
    const k = Object.keys(t.felder || {});
    for (const s of STUFEN)
      assert.ok(k.includes(`--ha-border-radius-${s}`), `${t.id}: Stufe ${s} fehlt`);
    assert.ok(k.includes("--ha-card-border-radius"), `${t.id}: die Karte fehlt`);
    assert.strictEqual(k.length, STUFEN.length + 1, `${t.id}: setzt mehr als die Leiter`);
    // Die Karte nimmt lg, wie Home Assistant selbst.
    assert.strictEqual(t.felder["--ha-card-border-radius"], t.felder["--ha-border-radius-lg"],
      `${t.id}: die Karte folgt nicht der Stufe lg`);
    // Die Leiter steigt. Eine, die faellt, waere ein Tippfehler.
    const w = STUFEN.map((s) => parseInt(t.felder[`--ha-border-radius-${s}`], 10));
    assert.deepStrictEqual(w, [...w].sort((a, b) => a - b), `${t.id}: die Leiter faellt`);
  }
  // pill, circle und square sind Formen, keine Stufen - sie bleiben stehen.
  for (const t of RUNDUNGEN)
    for (const s of ["pill", "circle", "square"])
      assert.ok(!(`--ha-border-radius-${s}` in t.felder), `${t.id}: fasst ${s} an`);
});

pruefe("Jede Dichte setzt alle zwanzig Stufen, linear", () => {
  // Home Assistant haelt die Leiter linear: vier Pixel mal n. Ein Teil
  // multipliziert also nur den Schritt - eine Stufe, die aus der Reihe
  // faellt, waere in jedem Polster sichtbar.
  for (const t of DICHTEN) {
    const k = Object.keys(t.felder || {});
    assert.strictEqual(k.length, 20, `${t.id}: nicht zwanzig Stufen`);
    const schritt = parseInt(t.felder["--ha-space-1"], 10);
    assert.ok(schritt > 0, `${t.id}: Schritt null`);
    for (let i = 1; i <= 20; i++)
      assert.strictEqual(t.felder[`--ha-space-${i}`], `${schritt * i}px`, `${t.id}: Stufe ${i}`);
  }
  // Und einer davon ist Home Assistants eigener - sonst kaeme man nicht
  // zurueck.
  const ha = DICHTEN.find((t) => t.id === "ha");
  assert.ok(ha && ha.felder["--ha-space-4"] === "16px", "die ausgelieferte Dichte fehlt");
});

pruefe("Rundung, Dichte und Kartenstil stehen nebeneinander", () => {
  // Beide schreiben --ha-card-border-radius. Vor dem 14.10.2026 haette das
  // einem von beiden den Haken genommen - erkenneTeil verglich jedes Feld,
  // auch die, die die Sorte selbst als Regler anbietet.
  const m = leer();
  const schreibe = schreiberFuer(m);
  const lies = leserFuer(m);
  teilAnwenden("karten", KARTENSTILE.find((t) => t.id === "glas"), schreibe);
  assert.strictEqual(erkenneTeil("karten", lies), "glas");

  // Der Regler auf der Seite der Sorte - genau der Fall, der den Haken nahm.
  m.beide["--ha-card-border-radius"] = "18px";
  assert.strictEqual(erkenneTeil("karten", lies), "glas", "der Regler nimmt den Haken");

  teilAnwenden("rundung", RUNDUNGEN.find((t) => t.id === "eckig"), schreibe);
  teilAnwenden("dichte", DICHTEN.find((t) => t.id === "weit"), schreibe);
  assert.strictEqual(erkenneTeil("karten", lies), "glas");
  assert.strictEqual(erkenneTeil("rundung", lies), "eckig");
  assert.strictEqual(erkenneTeil("dichte", lies), "weit");
  // Die Rundung hat die Karte wirklich mitgenommen - sonst waere der Haken
  // oben nur deshalb geblieben, weil gar nichts passiert ist.
  assert.strictEqual(lies("--ha-card-border-radius", "beide"), "2px");
  assert.strictEqual(lies("--ha-space-4", "beide"), "20px");
});

pruefe("Ohne den Regler bleibt der Haken nur, wenn er EINDEUTIG ist", () => {
  // Die Gegenprobe zur Lockerung oben. Bei der Schrift unterscheiden sich
  // "Home Assistant" und "Groesser" allein in --ha-font-size-scale, und genau
  // das ist der Regler der Sorte. Faellt er weg, passen beide - dann darf
  // nicht der erste gewinnen.
  const unterschied = ["ha", "gross"].map((id) => SCHRIFTEN.find((t) => t.id === id));
  const felder = new Set(unterschied.flatMap((t) => Object.keys(t.felder)));
  const trennend = [...felder].filter((k) => unterschied[0].felder[k] !== unterschied[1].felder[k]);
  assert.deepStrictEqual(trennend, ["--ha-font-size-scale"], "die beiden trennen sich woanders");
  assert.ok(SORTEN_FELDER.schrift.some((f) => f.v === "--ha-font-size-scale"),
    "die Groesse ist gar kein Regler mehr");

  const m = leer();
  const schreibe = schreiberFuer(m);
  const lies = leserFuer(m);
  teilAnwenden("schrift", unterschied[1], schreibe);
  assert.strictEqual(erkenneTeil("schrift", lies), "gross");
  // Auf einen Wert gedreht, den kein Teil hat: zwei passen, also keiner.
  m.beide["--ha-font-size-scale"] = "1.2";
  assert.strictEqual(erkenneTeil("schrift", lies), null,
    "ein Haken, den der Baukasten gar nicht wissen kann");
});

pruefe("Der Baukasten schreibt nur Felder, die das Panel auch anbietet", () => {
  // Die Regel aus CLAUDE.md, als Pruefung: Ein Feld, das in der Datei landet
  // und im Panel nicht vorkommt, kann der Nutzer nie wieder aendern oder
  // entfernen. Beim Bau der Liquid-Glass-Theme am 13.10.2026 war
  // --primary-color so ein Fall.
  //
  // Mit Rundung und Dichte schreibt der Baukasten 29 beziehungsweise 20
  // Felder auf einen Klick - da faellt ein Tippfehler im Namen sonst
  // niemandem auf.
  const angeboten = new Set([...panel.matchAll(/v: "(--[a-z0-9-]+)"/g)].map((m) => m[1]));
  assert.ok(angeboten.size > 300, `nur ${angeboten.size} Felder aus dem Panel gelesen`);

  // Die eine dokumentierte Ausnahme. --rgb-primary-color schreibt der
  // Baukasten mit, und es hat mit Absicht KEINE Kachel: Home Assistant
  // leitet die Tripel sonst selbst ab, je Modus, und ueberspringt dabei jeden
  // Namen, den die Theme mitbringt. Bei primary-color gibt es nichts
  // abzuleiten - das Feld muss also stehen -, aber es ist ein GERECHNETER
  // Wert. Von Hand gedreht liefe er der Primaerfarbe davon, und genau das war
  // am 12.10.2026 der Fehler bei rgb-accent-color: 255,152,0 neben einem
  // --accent-color von #e8833a. tests/hats-import.test.js haelt fest, dass
  // die Kachel nicht zurueckkommt.
  const AUSNAHMEN = new Set(["--rgb-primary-color"]);

  const fehlt = [];
  let geprueft = 0;
  for (const [sorte, s] of Object.entries(BAUKASTEN)) {
    for (const teil of s.teile) {
      const m = leer();
      teilAnwenden(sorte, teil, schreiberFuer(m));
      for (const ebene of ["beide", "light", "dark"])
        for (const k of Object.keys(m[ebene])) {
          geprueft++;
          if (!angeboten.has(k) && !AUSNAHMEN.has(k)) fehlt.push(`${sorte}/${teil.id}: ${k}`);
        }
    }
  }
  assert.ok(geprueft > 500, `nur ${geprueft} geschriebene Felder gesehen`);
  assert.deepStrictEqual([...new Set(fehlt)], [], "kennt das Panel nicht");

  // Gegenprobe: Ein erfundener Name wuerde wirklich auffallen - sonst waere
  // die Pruefung nur eine Liste, die mit sich selbst uebereinstimmt.
  assert.ok(!angeboten.has("--hats-gibt-es-nicht"));
  // Und die Ausnahme ist keine leere Geste: Das Feld wird wirklich
  // geschrieben und hat wirklich keine Kachel.
  for (const a of AUSNAHMEN) assert.ok(!angeboten.has(a), `${a} hat doch eine Kachel`);
  const mitPalette = leer();
  teilAnwenden("palette", PALETTEN.find((t) => t.farben?.primary), schreiberFuer(mitPalette));
  assert.ok("--rgb-primary-color" in mitPalette.beide, "die Ausnahme wird gar nicht mehr geschrieben");
});

pruefe("Der Baukasten beschreibt die macos-Theme vollstaendig", () => {
  // Die schaerfste Pruefung, die der Baukasten haben kann: eine Theme, die
  // OHNE ihn gebaut wurde - werkzeuge/macos-bauen.mjs schreibt ihre Felder
  // selbst - muss sich in seinen Teilen wiederfinden. Trifft jede Sorte, dann
  // sind die Werte wirklich dieselben und nicht nur aehnlich.
  //
  // Am 14.10.2026 war genau das der Grund, "macOS" als Kartenstil
  // aufzunehmen: Die Theme hatte Apples Glas, der Baukasten kannte nur das
  // der Projektwerkbank, und die Karten-Kachel blieb ohne Haken.
  const datei = readFileSync(path.join(hier, "../werkzeuge/themes/macos.yaml"), "utf8");
  const m = leseTheme(datei);
  assert.deepStrictEqual(m.unklar || [], [], "die Datei laesst sich nicht sauber lesen");
  const lies = (name, ebene) => {
    const k = name.replace(/^--/, "");
    return ebene === "beide" ? m.flach[k] : (m[ebene]?.[k] ?? m.flach[k]);
  };
  const soll = { palette: "macos", schrift: "ha", rundung: "weich", dichte: "ha",
                 karten: "macos", hintergrund: "macos" };
  for (const [sorte, id] of Object.entries(soll))
    assert.strictEqual(erkenneTeil(sorte, lies), id, `${sorte}: nicht wiedererkannt`);

  // Gegenprobe: Ein einziger geaenderter Wert nimmt den Haken wieder - sonst
  // sagte die Pruefung oben nur, dass erkenneTeil irgendetwas zurueckgibt.
  const kaputt = { ...m, flach: { ...m.flach, "ha-card-backdrop-filter": "blur(31px) saturate(180%)" } };
  const liesKaputt = (name, ebene) => {
    const k = name.replace(/^--/, "");
    return ebene === "beide" ? kaputt.flach[k] : (kaputt[ebene]?.[k] ?? kaputt.flach[k]);
  };
  assert.strictEqual(erkenneTeil("karten", liesKaputt), null,
    "ein Pixel mehr Weichzeichnung faellt nicht auf");
});

console.log(`\n${n} Pruefungen`);
if (n < 20) { console.error("Zu wenige Pruefungen gelaufen."); process.exit(1); }
