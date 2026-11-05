// Grosser Testlauf: zehn Themes bauen und pruefen
//
// Angelegt am 17.10.2026 auf Ansage: "10 verschiede themes mit richtung
// glas,neuromorf glassmorph.ios,android und drei vier farblich frischere
// bauen und pruefen.mit HATS und der Menuebar"
//
// WARUM DIESES SKRIPT UEBERHAUPT. glaswerk-bauen.mjs baut genau EINE Theme,
// mit NAME und TEILE als Konstanten. Fuer zehn Themes haette man es zehnmal
// kopieren muessen - und damit zehnmal die Gegenproben, die dort am Ende
// stehen. Hier steht die Liste oben und die Pruefung einmal unten.
//
// WAS GEPRUEFT WIRD, je Theme:
//
//   1. Baukasten erkennt sich wieder   erkenneTeil() je Sorte gegen das Soll.
//                                      Trifft es nicht, saehe der Nutzer im
//                                      Panel eine Theme ohne Haken.
//   2. Idempotenz                      lesen -> schreiben -> lesen muss
//                                      byteweise dasselbe liefern.
//   3. PyYAML nimmt sie an             derselbe Parser, den HA beim Start
//                                      benutzt. Ein Fluchtzeichen zu wenig
//                                      und die Instanz startet in den
//                                      Wiederherstellungsmodus.
//   4. Nicht leer                      datei.py:22-31 - eine Theme ohne
//                                      Felder ist in YAML null, und HA lehnt
//                                      dann das Laden ALLER Themes ab, ohne
//                                      die schuldige Datei zu nennen.
//   5. Keine unbekannten Felder        berichtUeberTheme(). CLAUDE.md:712:
//                                      ein Feld, das Glaswerk nicht anbietet,
//                                      wirkt - laesst sich aber im Panel nie
//                                      wieder entfernen.
//
// Die Pruefungen 3 bis 5 fehlten im Buildweg bisher ganz.
//
// WAS ES NICHT PRUEFT: wie die Themes AUSSEHEN. Das geht nur am Browser und
// steht in testlauf-bilder.mjs. Hier faellt die Feldebene durch - und eine
// Theme, die falsch ist, sieht nicht falsch aus, sie sieht nur anders aus.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { leseTheme, schreibeTheme, setze, vorlageAn, berichtUeberTheme }
  from "../custom_components/glaswerk/www/theme.js";
import { VORLAGEN } from "../custom_components/glaswerk/www/vorlagen.js";
import { BAUKASTEN, teilAnwenden, erkenneTeil }
  from "../custom_components/glaswerk/www/baukasten.js";
import { UIX_ZIELE } from "../custom_components/glaswerk/www/uix.js";
import { ZUORDNUNG } from "../custom_components/glaswerk/www/zuordnung.js";
import { begleiter } from "../custom_components/glaswerk/www/palette.js";

const NUR = process.argv.find((a) => a.startsWith("--nur="))?.slice(6);
const OHNE_UIX = process.argv.includes("--ohne-uix");

// --- Die zehn Themes -------------------------------------------------------
//
// Jede ist eine Liste von Baukasten-Teilen, in der Reihenfolge des
// Baukastens. Die Reihenfolge ist Teil der Aussage: karten kommt NACH
// rundung, weil beide --ha-card-border-radius schreiben und der Kartenstil
// gewinnen soll.
//
// Alle IDs sind aus BAUKASTEN gelesen, nicht geraten. Faellt eine weg,
// bricht teil() mit Namen ab, statt stumm eine halbe Theme zu bauen.
const THEMES = [
  // --- Richtung Glas / Glassmorphismus ---
  {
    name: "pruef_glas_klar",
    was: "Klarglas auf Nordlicht - die duennste Scheibe im Baukasten",
    teile: [["palette", "blau"], ["schrift", "system"], ["rundung", "rund"],
            ["dichte", "eng"], ["karten", "klarglas"], ["hintergrund", "nordlicht"]],
  },
  {
    name: "pruef_glas_rauch",
    was: "Rauchglas auf Graphit - dunkel, kontrastarm, der Gegenpol zu Klarglas",
    teile: [["palette", "grau"], ["schrift", "system"], ["rundung", "weich"],
            ["dichte", "eng"], ["karten", "rauchglas"], ["hintergrund", "graphit"]],
  },
  {
    name: "pruef_glas_milch",
    was: "Milchglas auf Lavendel - deckend, Text liegt auf der Scheibe statt dahinter",
    teile: [["palette", "liquid"], ["schrift", "humanist"], ["rundung", "rund"],
            ["dichte", "ha"], ["karten", "milchglas"], ["hintergrund", "lavendel"]],
  },
  {
    name: "pruef_liquid",
    was: "Liquid Glass auf Ozean - die Kante, gegen die sich Glaswerk entschieden hat",
    teile: [["palette", "liquid"], ["schrift", "system"], ["rundung", "rund"],
            ["dichte", "eng"], ["karten", "liquid"], ["hintergrund", "ozean"]],
  },

  // --- Richtung Neumorphismus ---
  //
  // gepraegt und erhaben sind die beiden Neumorphismus-Stile im Baukasten:
  // kein Rahmen, kein Glas, die Form kommt aus Licht und Schatten auf
  // derselben Flaeche. Deshalb bewusst OHNE Bildhintergrund - Neumorphismus
  // braucht einen ruhigen, einfarbigen Grund, sonst verschwindet die
  // Praegung im Muster.
  {
    name: "pruef_neu_gepraegt",
    was: "Gepraegt auf Sand - Neumorphismus hell, Vertiefung statt Karte",
    teile: [["palette", "warm"], ["schrift", "humanist"], ["rundung", "rund"],
            ["dichte", "weit"], ["karten", "gepraegt"], ["hintergrund", "sand"]],
  },
  {
    name: "pruef_neu_erhaben",
    was: "Erhaben auf Verlauf - Neumorphismus erhoben, Licht von oben links",
    teile: [["palette", "kuehl"], ["schrift", "system"], ["rundung", "rund"],
            ["dichte", "weit"], ["karten", "erhaben"], ["hintergrund", "verlauf"]],
  },

  // --- Richtung Plattform ---
  {
    name: "pruef_ios",
    was: "macOS/iOS - Palette und Kartenstil aus den Systemfarben gemessen",
    teile: [["palette", "macos"], ["schrift", "system"], ["rundung", "rund"],
            ["dichte", "ha"], ["karten", "macos"], ["hintergrund", "macos"]],
  },
  {
    name: "pruef_android",
    was: "Android / Material - flache Karten, Kontur statt Schatten",
    teile: [["palette", "android"], ["schrift", "ha"], ["rundung", "weich"],
            ["dichte", "ha"], ["karten", "flach"], ["hintergrund", "inseln"]],
  },

  // --- Farblich frischer ---
  //
  // Die drei, die nicht nach Glas aussehen sollen, sondern nach Farbe.
  // Durchweg kraeftige Paletten auf kraeftigen Gruenden.
  {
    name: "pruef_frisch_gruen",
    was: "Gruen auf Wald - die saettigungsstaerkste Kombination im Baukasten",
    teile: [["palette", "gruen"], ["schrift", "gross"], ["rundung", "rund"],
            ["dichte", "eng"], ["karten", "glas"], ["hintergrund", "wald"]],
  },
  {
    name: "pruef_frisch_glut",
    was: "Orange auf Glut - warm bis an die Grenze, Kontrast ist hier die Frage",
    teile: [["palette", "orange"], ["schrift", "system"], ["rundung", "rund"],
            ["dichte", "eng"], ["karten", "glas"], ["hintergrund", "glut"]],
  },
  {
    name: "pruef_frisch_pastell",
    was: "Catppuccin auf Pastell - leise Farben, Papier statt Glas",
    teile: [["palette", "catppuccin"], ["schrift", "humanist"], ["rundung", "weich"],
            ["dichte", "weit"], ["karten", "papier"], ["hintergrund", "pastell"]],
  },
  {
    name: "pruef_frisch_nord",
    was: "Nord auf Abendrot - kuehle Palette auf warmem Grund, der Stresstest",
    teile: [["palette", "nord"], ["schrift", "system"], ["rundung", "eckig"],
            ["dichte", "ha"], ["karten", "kontur"], ["hintergrund", "abendrot"]],
  },
];

// --- Die Grundlage, einmal gelesen ----------------------------------------
const ROH = readFileSync("docs/beispiele/ha-blanko.yaml", "utf8");

const teil = (sorte, id) => {
  const t = (BAUKASTEN[sorte]?.teile || []).find((x) => x.id === id);
  if (!t) throw new Error(`${sorte}/${id} gibt es im Baukasten nicht`);
  return t;
};

// --- Welche Felder das PANEL bedienen kann --------------------------------
//
// Nicht selbst gerechnet. Der erste Anlauf nahm die Felder, die die
// Baukasten-Teile schreiben - und meldete bei jeder der zwoelf Themes
// dieselben 301 Felder als "nicht bedienbar". Die kamen aus ha-blanko.yaml
// und haben im Panel laengst eine Kachel; falsch war die Messlatte, nicht
// die Theme. Immer dieselbe Zahl bei allen Pruefobjekten heisst: der Pruefer
// irrt, nicht das Geprueefte.
//
// Die Menge fuehrt glaswerk-panel.js:1132 - STUFEN plus ZUORDNUNG plus
// begleiter(). Exportiert ist sie nicht (das Panel ist ein Browser-Modul mit
// customElements, es laedt hier nicht), also wird sie aus dem Quelltext
// gelesen. Dasselbe Verfahren benutzt tests/glaswerk-durchlauf.test.js,
// einschliesslich der Gegenprobe gegen die eigene Blindheit.
function bekannteFelder() {
  const panel = readFileSync("custom_components/glaswerk/www/glaswerk-panel.js", "utf8");
  const block = panel.slice(panel.indexOf("const STUFEN = ["), panel.indexOf("const STAND_TEXT"));
  const ausStufen = [...block.matchAll(/v: "--([a-z0-9-]+)"/g)].map((m) => m[1]);

  // Gegenprobe: Ohne Felder aus STUFEN waere die Menge leer, und dann gilt
  // JEDES Feld als bedienbar - die Pruefung waere stumm gruen.
  if (ausStufen.length < 350) {
    throw new Error(`nur ${ausStufen.length} Felder aus STUFEN gelesen - die Messlatte ist kaputt`);
  }

  return new Set([
    ...ausStufen,
    ...Object.keys(ZUORDNUNG),
    ...Object.keys(begleiter("#808080") || {}),
  ]);
}
const BEKANNT = bekannteFelder();
const EIGENE_ZIELE = new Set(UIX_ZIELE.map((z) => z.id));

mkdirSync("werkzeuge/themes/testlauf", { recursive: true });

// --- Bauen ----------------------------------------------------------------
function baue(def) {
  const gelesen = leseTheme(ROH);
  const m = gelesen.modell ?? gelesen;
  m.name = def.name;

  let gesetzt = 0;
  const schreibe = (name, wert, ebene) => {
    const k = name.replace(/^--/, "");
    if (wert === "" || wert === null || wert === undefined) {
      for (const e of ["flach", "light", "dark"]) delete m[e][k];
    } else {
      setze(m, k, wert, ebene);
    }
    gesetzt++;
  };

  for (const [sorte, id] of def.teile) teilAnwenden(sorte, teil(sorte, id), schreibe);

  // UIX-Vorlagen. Ohne den Schalter uix-theme kommt keine einzige an - und
  // zwar lautlos. setze() traegt ihn, vorlageAn() braucht ihn.
  let vorlagen = 0;
  if (!OHNE_UIX) {
    for (const v of VORLAGEN) { vorlageAn(m, v); vorlagen++; }
  }

  const text = schreibeTheme(m);
  const pfad = `werkzeuge/themes/testlauf/${def.name}.yaml`;

  return { def, m, text, pfad, gesetzt, vorlagen };
}

// --- Pruefen --------------------------------------------------------------
function pruefe(gebaut) {
  const { def, text, pfad } = gebaut;
  const maengel = [];

  // ALLES AB HIER LIEST DIE DATEI, NICHT DAS MODELL IM SPEICHER.
  //
  // Beim ersten Lauf lag eine abgeschnittene pruef_glas_klar.yaml auf der
  // Platte (1283 statt 80211 Bytes, nur "pruef_glas_klar:" und nichts
  // dahinter - der Fall aus datei.py:22-31, der HA ALLE Themes ablehnen
  // laesst). Der Pruefer meldete sie gruen mit "439 Felder, 1666 Zeilen",
  // weil er den String aus schreibeTheme() las statt die Datei. Erst
  // reload_themes an der Instanz brachte es heraus - "expected a mapping",
  // ohne die schuldige Datei zu nennen.
  //
  // Geprueft wird, was HA liest: die Datei.
  const aufPlatte = readFileSync(pfad, "utf8");
  if (aufPlatte !== text) {
    maengel.push(`Datei weicht vom Erzeugten ab (${aufPlatte.length} statt ${text.length} Bytes)`);
  }

  // 1. Baukasten erkennt sich wieder
  const zurueck = leseTheme(aufPlatte);
  const zm = zurueck.modell ?? zurueck;
  const lies = (name, ebene) => {
    const k = name.replace(/^--/, "");
    return ebene === "beide" ? zm.flach[k] : (zm[ebene]?.[k] ?? zm.flach[k]);
  };
  const soll = Object.fromEntries(def.teile);
  const treffer = {};
  for (const sorte of Object.keys(soll)) treffer[sorte] = erkenneTeil(sorte, lies);
  for (const [sorte, id] of Object.entries(soll)) {
    if (treffer[sorte] !== id) {
      maengel.push(`Baukasten: ${sorte} soll ${id} sein, erkannt wurde ${treffer[sorte] ?? "nichts"}`);
    }
  }

  // 2. Idempotenz
  const nochmal = schreibeTheme(zm);
  if (nochmal !== aufPlatte) {
    const d = nochmal.length - aufPlatte.length;
    maengel.push(`nicht idempotent (${d > 0 ? "+" : ""}${d} Zeichen beim zweiten Durchlauf)`);
  }

  // 3. + 4. PyYAML und nicht leer, in einem Aufruf.
  //
  // Der Parser, den HA beim Start benutzt - nicht unser eigener. Gegen das
  // eigene Orakel zu pruefen heisst nur festzustellen, dass wir uns selbst
  // verstehen.
  let felder = 0;
  try {
    const raus = execFileSync("python3", ["-c", `
import sys, yaml
d = yaml.safe_load(open(sys.argv[1]))
if not d: raise SystemExit("LEER: die Datei ist in YAML null")
name, inhalt = next(iter(d.items()))
if not inhalt: raise SystemExit(f"LEER: {name} hat keine Felder")
tief = sum(len(v) for k, v in inhalt.items() if k == "modes" for v in v.values()) \\
       if "modes" in inhalt else 0
print(len(inhalt) - (1 if "modes" in inhalt else 0) + tief)
`, pfad], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    felder = parseInt(raus.trim(), 10) || 0;
  } catch (e) {
    maengel.push(`PyYAML: ${(e.stderr || e.stdout || e.message).toString().trim().split("\n").pop()}`);
  }

  // 5. Keine Felder, die Glaswerk nicht bedienen kann
  //
  // mitgenommen = in der Datei, aber im Panel nicht erreichbar. Genau der
  // Fall aus CLAUDE.md:712 - wirkt, laesst sich aber nie wieder entfernen.
  // stilziele = Marken FREMDER Werkzeuge (card-mod-*, uix-*-yaml, unbekannte
  // uix-Ziele). EIGENE_ZIELE muss mit, sonst meldet der Bericht Glaswerks
  // eigene UIX-Vorlagen als fremd - und eine Warnung, die bei der eigenen
  // Arbeit anschlaegt, lernt man weg.
  const bericht = berichtUeberTheme(zm, BEKANNT, EIGENE_ZIELE);
  if (bericht.mitgenommen.length) {
    const l = bericht.mitgenommen;
    maengel.push(`${l.length} Felder nicht bedienbar: ${l.slice(0, 5).join(", ")}${l.length > 5 ? " ..." : ""}`);
  }
  if (bericht.stilziele.length) {
    const l = bericht.stilziele;
    maengel.push(`${l.length} fremde Stilziele: ${l.slice(0, 5).join(", ")}${l.length > 5 ? " ..." : ""}`);
  }
  if (bericht.unklar.length) {
    maengel.push(`${bericht.unklar.length} Zeilen nicht eingeordnet (gehen verloren)`);
  }

  return { maengel, felder, treffer, bericht };
}

// --- Lauf -----------------------------------------------------------------
const liste = NUR ? THEMES.filter((t) => t.name.includes(NUR)) : THEMES;
if (!liste.length) {
  console.error(`--nur=${NUR} trifft keine der ${THEMES.length} Themes`);
  process.exit(1);
}

console.log(`Testlauf: ${liste.length} Themes${OHNE_UIX ? " (ohne UIX)" : ""}\n`);

const ergebnisse = [];
for (const def of liste) {
  let gebaut;
  try {
    gebaut = baue(def);
  } catch (e) {
    console.log(`  ROT   ${def.name.padEnd(22)} baut nicht: ${e.message}`);
    ergebnisse.push({ name: def.name, maengel: [`baut nicht: ${e.message}`] });
    continue;
  }

  // Erst schreiben, dann pruefen - pruefe() braucht die Datei fuer PyYAML.
  writeFileSync(gebaut.pfad, gebaut.text);

  const { maengel, felder } = pruefe(gebaut);
  ergebnisse.push({ name: def.name, maengel, felder, was: def.was });

  const marke = maengel.length ? "ROT  " : "ok   ";
  const zahlen = `${String(felder).padStart(4)} Felder, ${String(gebaut.text.split("\n").length).padStart(4)} Zeilen`;
  console.log(`  ${marke} ${def.name.padEnd(22)} ${zahlen}   ${def.was}`);
  for (const m of maengel) console.log(`        -> ${m}`);
}

// --- Fazit ----------------------------------------------------------------
const rot = ergebnisse.filter((e) => e.maengel.length);
console.log(`\nGeschrieben nach werkzeuge/themes/testlauf/`);
console.log(`${ergebnisse.length - rot.length} von ${ergebnisse.length} gruen`);

if (rot.length) {
  console.log(`\nROT:`);
  for (const e of rot) {
    console.log(`  ${e.name}`);
    for (const m of e.maengel) console.log(`    ${m}`);
  }
  process.exit(1);
}
console.log("Alle Themes sind baubar, idempotent, gueltig und vollstaendig.");
