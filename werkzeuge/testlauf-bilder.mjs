// Grosser Testlauf, zweiter Teil: die Themes ANSEHEN
//
// testlauf-themes.mjs prueft die Feldebene - baubar, idempotent, gueltiges
// YAML, keine unbedienbaren Felder. Das sagt nichts darueber, wie eine Theme
// aussieht. Eine Theme, die falsch ist, sieht nicht falsch aus; sie sieht nur
// anders aus (werkzeuge/README.md:78-93).
//
// Dieses Skript schaltet an der Testmaschine durch die Themes, laesst jede
// wirklich ankommen und nimmt von jeder zwei Bilder auf: hell und dunkel.
// Im Bild liegt das Dashboard glaswerk-ha/start - dort stehen die Glaswerk Bar,
// die Widgets und UIX Forge zusammen auf einer Flaeche.
//
// GEMESSEN WIRD, je Theme und Modus:
//
//   - Kommt die Theme ueberhaupt an?   hass.themes.theme gegen das Soll.
//   - Steht die Bar im Bild?            ein Knoten custom:glaswerk-bar, durch
//                                       die Shadow-Grenzen gesucht.
//   - Ist die Flaeche gemalt?           CLAUDE.md: in einem Hintergrund-Tab
//                                       baut ein Sections-Dashboard nicht auf,
//                                       und dann ist jede Messung wertlos -
//                                       erkennbar daran, dass alles leer
//                                       aussieht, auch das Funktionierende.
//   - Ruht die Darstellung?             Die Animationsfalle (CLAUDE.md:195):
//                                       ha-card traegt transition: all .3s,
//                                       und beim Laden reihen sich mehrere
//                                       Theme-Durchlaeufe ueber ~2,5 s. Also
//                                       auf den ENDWERT warten, nicht auf
//                                       einen Zeitpunkt - zweimal messen und
//                                       vergleichen, bis sich nichts aendert.
//
// WAS ES NICHT KANN: beurteilen, ob eine Theme SCHOEN ist. Es stellt fest,
// dass sie ankommt, dass die Bar steht und dass die Flaeche ruhig ist. Das
// Hinsehen bleibt am Menschen - dafuer liegen die Bilder nebeneinander.

import { readFileSync, mkdirSync } from "node:fs";
import { starteChrome, TIEF } from "./test/chrome.mjs";

const ZIEL = process.argv.find((a) => !a.startsWith("--") && a.endsWith("bilder")) ??
  "/tmp/glaswerk-testlauf";
const NUR = process.argv.find((a) => a.startsWith("--nur="))?.slice(6);
const ANSICHT = "/glaswerk-ha/start";

// Dieselben zwoelf wie in testlauf-themes.mjs, mit dem Namen, unter dem Home
// Assistant sie fuehrt (dem Wurzelschluessel, nicht dem Dateinamen).
const THEMES = [
  ["pruef_glas_klar",      "Klarglas auf Nordlicht"],
  ["pruef_glas_rauch",     "Rauchglas auf Graphit"],
  ["pruef_glas_milch",     "Milchglas auf Lavendel"],
  ["pruef_liquid",         "Liquid Glass auf Ozean"],
  ["pruef_neu_gepraegt",   "Gepraegt auf Sand (Neumorphismus hell)"],
  ["pruef_neu_erhaben",    "Erhaben auf Verlauf (Neumorphismus)"],
  ["pruef_ios",            "macOS/iOS"],
  ["pruef_android",        "Android / Material"],
  ["pruef_frisch_gruen",   "Gruen auf Wald"],
  ["pruef_frisch_glut",    "Orange auf Glut"],
  ["pruef_frisch_pastell", "Catppuccin auf Pastell"],
  ["pruef_frisch_nord",    "Nord auf Abendrot"],
];

const warte = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Zugang ---------------------------------------------------------------
const conf = readFileSync("/Users/enricofischer/Projekte/haos-test/zugang.conf", "utf8");
const TOKEN = conf.match(/^HA_TOKEN=(.+)$/m)?.[1]?.trim();
const URL_ = conf.match(/^HA_URL=(.+)$/m)?.[1]?.trim() ?? "http://localhost:8123";
if (!TOKEN) throw new Error("HA_TOKEN steht nicht in zugang.conf");

// Die Theme-Wahl laeuft ueber frontend/set_user_data, Schluessel "theme" -
// NICHT "selectedTheme", den HA nie liest (werkzeuge/README.md:343-366).
// Reihenfolge: erst reload_themes, dann die Auswahl. Andersherum kennt HA die
// Datei noch nicht und faellt auf eine andere zurueck.
async function ws(befehle) {
  const s = new WebSocket(URL_.replace(/^http/, "ws") + "/api/websocket");
  const raus = [];
  let nr = 0;
  const offen = new Map();
  await new Promise((ok, fehl) => {
    s.onerror = () => fehl(new Error("Websocket zur Testmaschine gescheitert"));
    s.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.type === "auth_required") return s.send(JSON.stringify({ type: "auth", access_token: TOKEN }));
      if (d.type === "auth_ok") return ok();
      if (d.type === "auth_invalid") return fehl(new Error("Token abgelehnt"));
      if (d.id && offen.has(d.id)) {
        const { gut, schlecht } = offen.get(d.id);
        offen.delete(d.id);
        d.success ? gut(d.result) : schlecht(new Error(d.error?.message || "Fehler"));
      }
    };
  });
  const ruf = (b) => new Promise((gut, schlecht) => {
    const id = ++nr;
    offen.set(id, { gut, schlecht });
    s.send(JSON.stringify({ ...b, id }));
  });
  for (const b of befehle) raus.push(await ruf(b));
  s.close();
  return raus;
}

// --- Was im Browser gemessen wird ----------------------------------------
//
// Ein Ausdruck, der alles auf einmal holt: aktive Theme, Zahl der Karten,
// ob eine Bar steht, und die Flaeche der groessten Karte. Die Flaeche ist
// der Ruhe-Anzeiger - sie aendert sich, solange die Uebergaenge laufen.
const MESSEN = `(() => {
  ${TIEF}
  const ha = document.querySelector("home-assistant");
  const karten = tief(document, (e) => e.localName === "ha-card");
  const bars = tief(document, (e) => e.localName === "glaswerk-bar" || e.localName === "glaswerk-bar-badge");
  const gross = karten.map((k) => { const r = k.getBoundingClientRect(); return Math.round(r.width * r.height); })
    .sort((a, b) => b - a)[0] ?? 0;
  const cs = getComputedStyle(document.documentElement);
  return {
    theme: ha?.hass?.themes?.theme ?? null,
    dunkel: !!ha?.hass?.themes?.darkMode,
    karten: karten.length,
    bars: bars.length,
    flaeche: gross,
    // Aus getComputedStyle, nicht aus dem Theme-Objekt: das sagt, was
    // gespeichert ist, nicht was wirkt (werkzeuge/README.md:336-342).
    grund: cs.getPropertyValue("--lovelace-background").trim()
        || cs.getPropertyValue("--primary-background-color").trim(),
    karte: cs.getPropertyValue("--ha-card-background").trim(),
    radius: cs.getPropertyValue("--ha-card-border-radius").trim(),
    sichtbar: document.visibilityState,
  };
})()`;

// Auf Stillstand warten: zweimal messen und vergleichen, bis sich die Flaeche
// und der Kartenhintergrund nicht mehr aendern. Nicht auf eine Zeit warten.
async function bisRuhe(c, versuche = 12) {
  let vor = null;
  for (let i = 0; i < versuche; i++) {
    const jetzt = await c.lies(MESSEN);
    if (vor && jetzt.flaeche === vor.flaeche && jetzt.karte === vor.karte && jetzt.karten === vor.karten) {
      return jetzt;
    }
    vor = jetzt;
    await warte(500);
  }
  return { ...vor, unruhig: true };
}

// --- Lauf -----------------------------------------------------------------
const liste = NUR ? THEMES.filter(([n]) => n.includes(NUR)) : THEMES;
if (!liste.length) { console.error(`--nur=${NUR} trifft keine Theme`); process.exit(1); }

mkdirSync(ZIEL, { recursive: true });
console.log(`Bilder nach ${ZIEL}`);
console.log(`Ansicht ${ANSICHT}, ${liste.length} Themes, hell und dunkel\n`);

// Die aktive Theme des Nutzers merken und am Ende zuruecksetzen.
// set_user_data gilt fuer JEDES Geraet des Nutzers (werkzeuge/README.md:360) -
// wer sie nicht zuruecklegt, hat Enrico die Theme umgestellt.
const [vorher] = await ws([{ type: "frontend/get_user_data", key: "theme" }]);
const VORHER = vorher?.value ?? null;
console.log(`vorher aktiv: ${JSON.stringify(VORHER)}\n`);

const c = await starteChrome({ ziel: ZIEL, breite: 1600, hoehe: 1000, dichte: 2 });
const ergebnisse = [];

try {
  // chrome.mjs legt den Token ab, NACHDEM die Seite geladen hat - direkt
  // danach ist hass.user noch nicht da und pruefeAnmeldung() wirft, obwohl
  // der Token gut ist. Am 17.10.2026 gemessen: ein geh() danach, und alles
  // steht. Deshalb hier neu laden statt pruefeAnmeldung() zu glauben.
  await c.geh(ANSICHT, 7000);
  const start = await c.lies(MESSEN);
  if (!start.theme && start.karten === 0) {
    throw new Error("Nicht angemeldet oder Dashboard leer - nichts zu messen");
  }
  if (start.sichtbar !== "visible") {
    throw new Error(`Seite ist ${start.sichtbar} - in einem Hintergrund-Tab ist jede Messung wertlos`);
  }
  console.log(`angemeldet, Dashboard steht (${start.karten} Karten, ${start.bars} Bar)\n`);

  for (const [name, was] of liste) {
    for (const dunkel of [false, true]) {
      const modus = dunkel ? "dunkel" : "hell";

      // Reihenfolge: reload_themes, dann die Auswahl.
      await ws([
        { type: "call_service", domain: "frontend", service: "reload_themes" },
        { type: "frontend/set_user_data", key: "theme", value: { theme: name, dark: dunkel } },
      ]);

      // Der Modus kommt aus prefers-color-scheme, wenn die Theme auf
      // "automatisch" steht - emuliert, nicht per settheme gesetzt.
      await c.ruf("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-color-scheme", value: dunkel ? "dark" : "light" }],
      });

      await c.geh(ANSICHT, 3000);
      const m = await bisRuhe(c);

      const maengel = [];
      if (m.theme !== name) maengel.push(`Theme kam nicht an (aktiv: ${m.theme})`);
      if (m.dunkel !== dunkel) maengel.push(`Modus falsch (dunkel=${m.dunkel})`);
      if (!m.bars) maengel.push("keine Bar im Bild");
      if (!m.karten) maengel.push("keine Karte im Bild - Flaeche nicht gemalt");
      if (!m.flaeche) maengel.push("groesste Karte hat Flaeche 0");
      if (m.unruhig) maengel.push("Darstellung kam nicht zur Ruhe");

      const datei = `${name}-${modus}`;
      await c.schuss(datei);

      ergebnisse.push({ name, was, modus, m, maengel });
      const marke = maengel.length ? "ROT  " : "ok   ";
      console.log(`  ${marke} ${(name + " " + modus).padEnd(30)} ${String(m.karten).padStart(2)} Karten, ${m.bars} Bar, Radius ${m.radius || "-"}`);
      for (const x of maengel) console.log(`        -> ${x}`);
    }
  }
} finally {
  await c.zu();
  // Zuruecklegen, immer - auch wenn oben etwas geworfen hat.
  if (VORHER) {
    await ws([{ type: "frontend/set_user_data", key: "theme", value: VORHER }]);
    console.log(`\nTheme zurueckgestellt auf ${JSON.stringify(VORHER)}`);
  }
}

// --- Fazit ----------------------------------------------------------------
const rot = ergebnisse.filter((e) => e.maengel.length);
console.log(`\n${ergebnisse.length - rot.length} von ${ergebnisse.length} Aufnahmen ohne Mangel`);
console.log(`Bilder liegen in ${ZIEL}`);

// Die Werte nebeneinander - daran sieht man, ob sich die Themes ueberhaupt
// unterscheiden. Zwoelf Themes mit demselben Kartenhintergrund waeren ein
// Befund, und zwar ein schlechter.
console.log(`\nWas wirklich wirkt (aus getComputedStyle):`);
for (const e of ergebnisse.filter((x) => x.modus === "dunkel")) {
  console.log(`  ${e.name.padEnd(22)} Karte ${(e.m.karte || "-").slice(0, 34).padEnd(34)} Radius ${e.m.radius || "-"}`);
}
const verschieden = new Set(ergebnisse.map((e) => e.m.karte)).size;
console.log(`\n${verschieden} verschiedene Kartenhintergruende bei ${liste.length} Themes`);

if (rot.length) {
  console.log(`\nROT:`);
  for (const e of rot) console.log(`  ${e.name} ${e.modus}: ${e.maengel.join("; ")}`);
  process.exit(1);
}
