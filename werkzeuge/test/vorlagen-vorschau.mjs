// Vorher/Nachher-Bilder fuer die UIX-Vorlagen.
//
// Angelegt am 17.10.2026. Bis dahin: 3 Bildpaare von 20, von Hand gemacht am
// 13.10. - und kein Werkzeug, das weitere erzeugt. Deshalb blieb es bei drei.
//
// Das Panel zeigt die Paare uebereinander (vorlagenKarte in
// glaswerk-panel.js): oben das Nachher, darunter das Vorher, beim Ueberfahren
// blendet das obere weg. Der Mechanismus steht laengst - es fehlten die
// Bilder.
//
// WAS DIESES SKRIPT ANDERS MACHT ALS EIN SCREENSHOT-SKRIPT
//
// Es prueft, dass die Vorlage beim Nachher-Bild WIRKLICH WIRKT. Auf Ansage
// vom 17.10.2026: "achte darauf das bei aktiven theme alles an ist was man
// braucht oder du schaltest die effekte vor dem foto an."
//
// Das ist nicht selbstverstaendlich: Eine Vorlage wird ueber ein Theme-Feld
// geschaltet (uix-<ziel>), das CSS reist durch UIX in den Shadow Root des
// Bauteils. Dazwischen kann alles schiefgehen - der uix-theme-Schalter fehlt,
// UIX laeuft nicht, das Bauteil ist gar nicht auf der Seite. In jedem dieser
// Faelle entstuenden ZWEI GLEICHE BILDER, und im Panel saehe man beim
// Ueberfahren nichts. Genau das faellt niemandem auf.
//
// Geprueft wird deshalb je Aufnahme:
//   1. Steht das CSS der Vorlage im Shadow Root des Zielbauteils?
//   2. Unterscheiden sich Vorher und Nachher ueberhaupt - an den Pixeln?
//
// Schlaegt eines fehl, wird das Paar NICHT abgelegt und der Lauf meldet es.
//
// DIE THEME. Gebaut wird auf glaswerk.yaml - der Theme, die das Projekt
// selbst benutzt. Beide Aufnahmen zeigen DIESELBE Theme; der einzige
// Unterschied ist diese eine Vorlage. Eine andere Theme im Vorher-Bild waere
// ein Vergleich zweier Dinge auf einmal (so steht es im Kommentar von
// vorlagenKarte, und so ist es gemeint).

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { starteChrome, TIEF } from "./chrome.mjs";
import { VORLAGEN } from "../../custom_components/glaswerk/www/vorlagen.js";

const ZIEL = "custom_components/glaswerk/www/vorschau";
const BREITE = 440, HOEHE = 275;        // das Mass der drei vorhandenen Bilder
const NUR = process.argv.find((a) => a.startsWith("--nur="))?.slice(6);
const NEU = process.argv.includes("--neu");   // auch vorhandene neu machen
const THEME = "glaswerk";

const warte = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Zugang ---------------------------------------------------------------
const conf = readFileSync("/Users/enricofischer/Projekte/haos-test/zugang.conf", "utf8");
const TOKEN = conf.match(/^HA_TOKEN=(.+)$/m)[1].trim();
const URL_ = conf.match(/^HA_URL=(.+)$/m)?.[1]?.trim() ?? "http://localhost:8123";

async function ws(befehle) {
  const s = new WebSocket(URL_.replace(/^http/, "ws") + "/api/websocket");
  let nr = 0; const offen = new Map(); const raus = [];
  await new Promise((ok, f) => {
    s.onerror = () => f(new Error("Websocket gescheitert"));
    s.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.type === "auth_required") return s.send(JSON.stringify({ type: "auth", access_token: TOKEN }));
      if (d.type === "auth_ok") return ok();
      if (d.type === "auth_invalid") return f(new Error("Token abgelehnt"));
      if (d.id && offen.has(d.id)) {
        const { g, b } = offen.get(d.id); offen.delete(d.id);
        d.success ? g(d.result) : b(new Error(d.error?.message || "Fehler"));
      }
    };
  });
  const ruf = (o) => new Promise((g, b) => { const id = ++nr; offen.set(id, { g, b }); s.send(JSON.stringify({ ...o, id })); });
  for (const b of befehle) raus.push(await ruf(b));
  s.close();
  return raus;
}

// --- Wo jede Vorlage zu sehen ist -----------------------------------------
//
// Ohne diese Liste wuesste das Skript nicht, wohin es schauen soll: Eine
// Vorlage auf "sidebar" wirkt an der Seitenleiste, eine auf "toast" an einer
// Meldung, die es erst zu erzeugen gilt.
//
// pfad     die Seite, die geladen wird
// finde    liefert im Browser das Element, das aufgenommen wird (oder null)
// vorher   optional: was getan werden muss, damit das Bauteil ueberhaupt da ist
const STELLEN = {
  // --- Karten auf der Musterseite ---
  //
  // zoom: Wieviel vom gefundenen Element ins Bild soll. Am 17.10.2026 nach
  // einem Pixelvergleich ergaenzt: Neun von siebzehn Paaren zeigten unter
  // 1 % Unterschied, weil der Effekt im 440x275-Ausschnitt einer ganzen
  // Karte untergeht. Ein Glimmen am Regler oder 42->28 px Reglerhoehe sind
  // bei dieser Verkleinerung nicht mehr zu sehen.
  //
  //   zoom: {h: 0.5}      nur die obere Haelfte
  //   zoom: {b: 0.6}      nur die linke 60 %
  //   zoom: {max: 220}    hoechstens 220 px Hoehe ab oben
  "glas-karten":        { pfad: "/glaswerk-muster/muster", finde: "erste-karte", zoom: { max: 150 } },
  "glas-lichtkante":    { pfad: "/glaswerk-muster/muster", finde: "erste-karte" },
  "glas-symbolkachel":  { pfad: "/glaswerk-muster/muster", finde: "erste-karte", zoom: { b: 0.55, max: 150 } },
  "glas-nur-weichzeichnung": { pfad: "/glaswerk-muster/muster", finde: "markdown-karte", zoom: { max: 160 } },
  // Die Regler: nur eine Zeile statt der ganzen Karte. Das Glimmen sitzt am
  // Balken, die schlankere Spur ebenso - beides geht ueber vier Zeilen unter.
  "regler-gluehen":     { pfad: "/glaswerk-muster/muster", finde: "regler-zeile" },
  "regler-schlank":     { pfad: "/glaswerk-muster/muster", finde: "regler-zeile" },
  "glas-knoepfe":       { pfad: "/glaswerk-muster/muster", finde: "kopfknoepfe" },
  "abschnitte-trennen": { pfad: "/glaswerk-muster/muster", finde: "abschnitt", zoom: { max: 130 } },
  // Ein einzelnes Badge statt der ganzen Reihe.
  "glas-badges":        { pfad: "/glaswerk-muster/muster", finde: "ein-badge" },
  "verlauf-kapsel":     { pfad: "/glaswerk-muster/leiste", finde: "bar" },

  // --- Ausserhalb der Karten ---
  "glas-seitenleiste":  { pfad: "/glaswerk-muster/muster", finde: "seitenleiste" },
  "glas-kopfleiste":    { pfad: "/glaswerk-muster/muster", finde: "kopfleiste" },
  "glas-leistenknoepfe": { pfad: "/glaswerk-muster/muster", finde: "kopfknoepfe" },
  "glas-kopfleiste-einstellungen": { pfad: "/config/dashboard", finde: "kopfleiste" },
  "grund-ueberall":     { pfad: "/config/dashboard", finde: "ganze-seite" },

  // --- Muss erst ausgeloest werden ---
  // Beim Dialog zaehlt die obere Kante (Rundung, Lichtkante) - der ganze
  // 580x629-Dialog verkleinert auf 275 px Hoehe zeigt davon nichts.
  "glas-more-info":     { pfad: "/glaswerk-muster/muster", finde: "dialog",
                          oeffne: "more-info", zoom: { max: 180 } },
  "glas-toast":         { pfad: "/glaswerk-muster/muster", finde: "toast", oeffne: "toast" },
};

// Vorlagen ohne Stelle - die kann dieses Skript nicht aufnehmen, und das
// soll dastehen statt stillschweigend zu fehlen.
const OHNE_STELLE = {
  "glas-bubble": "Bubble Card ist auf der Testmaschine nicht installiert",
  "sync-bedienelemente": "braucht Bubble Card und Mushroom zum Vergleich",
  // BEFUND vom 17.10.2026, nicht nur ein fehlendes Bild:
  //
  // uix-dialog kommt an KEINEM Bauteil an. Gemessen unter zwei Themes
  // (vorschau_arbeit und glaswerk_v1), beide tragen das Feld in der Datei,
  // uix-theme zeigt richtig - und UIX legt dafuer nirgends ein Stylesheet
  // ab. Zum Vergleich: unter derselben Theme kommen regler-schlank,
  // sync-bedienelemente und verlauf-kapsel an sechs Karten an.
  //
  // Das CSS zielt auf wa-drawer::part(dialog) - die ausfahrbare
  // Seitenleiste, die es nur bei schmalem Fenster gibt. Ob UIX dieses
  // Bauteil ueberhaupt patcht, ist die offene Frage; ein ::part() von
  // aussen erreicht man nur, wenn das Stylesheet im richtigen Baum liegt.
  //
  // Solange das nicht geklaert ist, gaebe es hier zwei gleiche Bilder -
  // und im Panel saehe man beim Ueberfahren nichts.
  "glas-dialoge": "uix-dialog kommt an keinem Bauteil an - siehe Kommentar",

  // UNTER DER SICHTBARKEITSSCHWELLE, am 17.10.2026 mit Zoom gemessen.
  //
  // Alle neun bleiben unter 2 % abweichenden Pixeln - auch nach engerem
  // Ausschnitt. Der Grund liegt nicht am Zuschnitt: Verglichen an den
  // aeusseren Huellen (glaswerk_v1 gegen ha_blanko) aendert sich bei
  // hui-markdown-card, ha-badge, hui-grid-section und ha-icon-button nur
  // die TEXTFARBE, und die kommt aus der Theme, nicht aus der Vorlage.
  // Substanziell aendert sich allein ha-card.
  //
  // Wer hier ein Bild erzwingt, zeigt dem Nutzer zwei Bilder, zwischen
  // denen er beim Ueberfahren nichts erkennt.
  //
  // Zum Wiederaufnehmen muesste je Vorlage das tatsaechlich bemalte
  // INNENBAUTEIL gesucht werden (etwa der Badge-Hintergrund statt des
  // ha-badge-Wirts). Das ist Einzelarbeit pro Vorlage.
  "glas-karten": "unter 2 % sichtbar - der Effekt steckt tiefer als ha-card",
  "glas-symbolkachel": "1,2 % sichtbar - Symbolflaeche liegt im Shadow Root der Kachel",
  "glas-nur-weichzeichnung": "0 % sichtbar - hui-markdown-card aendert sich nicht",
  "abschnitte-trennen": "0,6 % sichtbar - hui-grid-section aendert nur die Textfarbe",
  "glas-badges": "0 % sichtbar - ha-badge aendert nur die Textfarbe",
  "glas-more-info": "0 % sichtbar - der Radius kommt aus --wa-panel-border-radius, nicht aus der Vorlage",
  "glas-toast": "0 % sichtbar",
  "glas-knoepfe": "0 % sichtbar - ha-icon-button aendert nur die Textfarbe",
  "glas-kopfleiste-einstellungen": "0,1 % sichtbar",
};

// --- Das Suchen im Browser ------------------------------------------------
const SUCHER = `
${TIEF}
function stelle(was) {
  const inhalt = () => document.querySelector("home-assistant")?.shadowRoot
    ?.querySelector("home-assistant-main")?.shadowRoot;
  if (was === "erste-karte") {
    return tief(document, (e) => e.localName === "ha-card")
      .map((k) => ({ k, r: k.getBoundingClientRect() }))
      .filter((x) => x.r.width > 150 && x.r.height > 90)
      .sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left)[0]?.k ?? null;
  }
  if (was === "markdown-karte") {
    return tief(document, (e) => e.localName === "hui-markdown-card")[0] ?? null;
  }
  if (was === "regler-karte") {
    const k = tief(document, (e) => e.localName === "ha-card")
      .find((c) => tief(c.shadowRoot || c, (e) => /slider|ha-control-slider/.test(e.localName)).length
                || c.textContent.includes("Helligkeit"));
    return k ?? null;
  }
  if (was === "abschnitt") {
    return tief(document, (e) => /hui-grid-section|hui-section/.test(e.localName))[0] ?? null;
  }
  if (was === "badges") {
    const b = tief(document, (e) => e.localName === "ha-badge");
    if (!b.length) return null;
    return b[0].parentElement ?? b[0];
  }
  if (was === "ein-badge") {
    // Ein einzelnes Badge, nicht die ganze Reihe: Die Glasflaeche eines
    // 110 px breiten Badges ist in einem Bild der ganzen Reihe nicht zu
    // sehen.
    return tief(document, (e) => e.localName === "ha-badge")
      .find((e) => e.getBoundingClientRect().width > 40) ?? null;
  }
  if (was === "regler-zeile") {
    // Der ha-control-slider SELBST, nicht die Zeile drumherum.
    //
    // Am 17.10.2026 gemessen: Die Vorlagen wirken an ha-control-slider
    // (42 px unter ha_blanko, 28 px unter glaswerk_v1 - genau die 42->28
    // aus regler-schlank). Die hui-input-number-entity-row der
    // Entities-Karte traegt einen anderen Regler, an dem sich nichts
    // aendert; ein Bild davon zeigte 0,0 % Unterschied.
    //
    // Der Slider ist 176x28 klein - deshalb kommt er hier ohne weiteren
    // Zoom aus, der Ausschnitt ist schon eng genug.
    //
    // Es muss ein EINGESCHALTETER sein: Der erste Treffer war der Regler
    // einer ausgeschalteten Lampe - grau, ohne Farbe, und ein Glimmen in
    // der Farbe der Entitaet hat dort nichts zu umrahmen. Das Bild sah
    // nach nichts aus, obwohl die Messung 42 % meldete.
    //
    // Erkannt an --control-slider-color, am 17.10.2026 gemessen:
    //   aus:  color-mix(in srgb, #9e9e9e 92.5%, black)
    //   an:   color-mix(in srgb, #ffc107 92.5%, black)
    const kandidaten = tief(document, (e) => /ha-control-slider/.test(e.localName))
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 60 && r.height > 10; });
    const bunt = kandidaten.find((e) =>
      !/#9e9e9e|#aaa|#bbb|#ccc/i.test(getComputedStyle(e).getPropertyValue("--control-slider-color")));
    return bunt ?? kandidaten[0] ?? null;
  }
  if (was === "bar") {
    return tief(document, (e) => /glaswerk-bar/.test(e.localName))[0] ?? null;
  }
  if (was === "seitenleiste") {
    return inhalt()?.querySelector("ha-sidebar") ?? tief(document, (e) => e.localName === "ha-sidebar")[0] ?? null;
  }
  if (was === "kopfleiste") {
    // Am 17.10.2026 gemessen: Auf einem Dashboard gibt es KEIN app-header
    // und kein hui-top-bar - die Leiste besteht aus anonymen divs, das
    // einzige benannte Bauteil ist ha-tab-group. Auf den
    // Einstellungsseiten dagegen steht ha-top-app-bar-fixed. Deshalb beide
    // Wege, und der breiteste Treffer ganz oben gewinnt.
    const benannt = tief(document, (e) => /ha-top-app-bar-fixed|hui-top-bar/.test(e.localName))[0];
    if (benannt) return benannt;
    const g = tief(document, (e) => e.localName === "ha-tab-group")[0];
    if (g) return g.parentElement ?? g;
    return tief(document, (e) => {
      const r = e.getBoundingClientRect();
      return r.top < 8 && r.height > 40 && r.height < 90 && r.width > 900;
    })[0] ?? null;
  }
  if (was === "kopfknoepfe") {
    const k = tief(document, (e) => /ha-icon-button/.test(e.localName))
      .map((x) => ({ x, r: x.getBoundingClientRect() }))
      .filter((o) => o.r.top < 120 && o.r.width > 0)
      .sort((a, b) => a.r.left - b.r.left);
    return k.length ? k[k.length - 1].x : null;
  }
  if (was === "dialog") {
    // Am 17.10.2026 gemessen: Das sichtbare Bauteil heisst schlicht
    // "dialog" (580x629). wa-dialog darueber ist 1600x0 - der Wirt, nicht
    // der Dialog. Deshalb nach Groesse filtern statt nach Namen zu raten.
    return tief(document, (e) => /^dialog$|ha-md-dialog/.test(e.localName))
      .find((e) => { const r = e.getBoundingClientRect(); return r.width > 200 && r.height > 200; }) ?? null;
  }
  if (was === "toast") {
    // NICHT notification-manager: der ist 0x0 und nur der Wirt. Das
    // sichtbare Bauteil ist ha-toast (gemessen 350x48).
    return tief(document, (e) => /ha-toast|mwc-snackbar/.test(e.localName))
      .find((e) => e.getBoundingClientRect().width > 50) ?? null;
  }
  if (was === "drawer") {
    // Der wa-drawer selbst ist 0 hoch; sichtbar ist sein part(dialog) im
    // Shadow Root (gemessen 256x900, wenn offen).
    const dr = tief(document, (e) => /wa-drawer/.test(e.localName))[0];
    const teil = dr?.shadowRoot?.querySelector('[part~="dialog"]');
    if (!teil) return null;
    const r = teil.getBoundingClientRect();
    return r.width > 50 && r.height > 50 ? teil : null;
  }
  if (was === "ganze-seite") return document.body;
  return null;
}`;

// --- Sieht man den Unterschied? -------------------------------------------
//
// Wieviel Prozent der Pixel weichen ab. Gemessen am fertigen JPG, in der
// Groesse, in der es im Panel steht.
//
// Ueber sips nach TIFF, weil ein JPEG-Decoder in Node eine Abhaengigkeit
// waere und sips zu macOS gehoert. Verglichen wird jedes siebte Byte - das
// reicht fuer die Frage "sieht man ueberhaupt etwas" und ist schnell genug.
// Die Schwelle von 8 faengt JPEG-Rauschen ab.
// DIE SCHWELLE IST EIN URTEIL UEBER DEN EFFEKT, KEINE HUERDE FUER DAS
// WERKZEUG. Auf Ansage vom 17.10.2026: "wenn du sie nicht siehst sehe ich
// sie auch nicht."
//
// Bleibt ein Paar darunter, zeigt es dem Nutzer beim Ueberfahren ebenfalls
// nichts. Dann ist die Frage nicht, wie man den Ausschnitt noch enger
// zieht, sondern ob die Vorlage ueberhaupt etwas Sichtbares tut. Wer so
// lange am Zuschnitt dreht, bis irgendein Unterschied messbar wird,
// taeuscht sich und den Nutzer.
const MIN_UNTERSCHIED = 2.0;   // Prozent abweichende Pixel am fertigen JPG

function pixelUnterschied(a, b) {
  const nachTiff = (p) => {
    const t = `/tmp/vorschau-roh/vgl-${Math.random().toString(36).slice(2)}.tiff`;
    execFileSync("sips", ["-s", "format", "tiff", p, "--out", t], { stdio: ["pipe", "pipe", "pipe"] });
    const d = readFileSync(t);
    unlinkSync(t);
    return d;
  };
  try {
    const x = nachTiff(a), y = nachTiff(b);
    const ende = Math.min(x.length, y.length);
    const start = 1000;          // Kopfdaten ueberspringen
    let anders = 0, gezaehlt = 0;
    for (let i = start; i < ende; i += 7) {
      gezaehlt++;
      if (Math.abs(x[i] - y[i]) > 8) anders++;
    }
    return gezaehlt ? (anders / gezaehlt) * 100 : null;
  } catch {
    return null;                 // lieber nicht messen als falsch melden
  }
}

// --- Ablauf ---------------------------------------------------------------
const fertig = (id) => existsSync(`${ZIEL}/${id}-vorher.jpg`) && existsSync(`${ZIEL}/${id}-nachher.jpg`);

let liste = VORLAGEN.filter((v) => !OHNE_STELLE[v.id]);
if (NUR) liste = liste.filter((v) => v.id.includes(NUR));
if (!NEU) liste = liste.filter((v) => !fertig(v.id));

mkdirSync(ZIEL, { recursive: true });

console.log(`Vorschaubilder fuer ${liste.length} Vorlagen`);
if (!NUR) {
  const schon = VORLAGEN.filter((v) => fertig(v.id) && !NEU).length;
  if (schon) console.log(`  (${schon} haben schon Bilder - mit --neu auch die)`);
  for (const [id, grund] of Object.entries(OHNE_STELLE)) console.log(`  uebersprungen: ${id} - ${grund}`);
}
if (!liste.length) { console.log("\nNichts zu tun."); process.exit(0); }

// Die Theme merken, um sie am Ende zurueckzulegen.
const [vorherTheme] = await ws([{ type: "frontend/get_user_data", key: "theme" }]);
const VORHER_THEME = vorherTheme?.value ?? null;

// Die Arbeitstheme laden - eine Kopie von glaswerk, damit die echte nicht
// angefasst wird, waehrend wir Vorlagen an- und ausschalten.
// Die Theme suchen statt den Namen zu raten: Auf der Testmaschine heisst sie
// glaswerk_v1.yaml (die gezaehlte Fassung), nicht glaswerk.yaml. Der erste
// Lauf brach deshalb mit "nicht lesbar" ab.
const [vorhanden] = await ws([{ type: "glaswerk/list_themes" }]);
// Die Rueckgabe ist { dateien: [{ name, glaswerk, kopf, bytes }] }, kein Array.
const namen = (vorhanden?.dateien || []).map((d) => d.name);
const gewaehlt = [`${THEME}.yaml`, ...namen.filter((n) => n.startsWith(THEME))].find((n) => namen.includes(n));
if (!gewaehlt) {
  console.error(`Keine Theme, die mit "${THEME}" anfaengt. Da ist: ${namen.join(", ")}`);
  process.exit(1);
}
const [datei] = await ws([{ type: "glaswerk/load_theme_file", filename: gewaehlt }]);
if (!datei?.content) { console.error(`${gewaehlt} nicht lesbar`); process.exit(1); }
console.log(`Grundlage: ${gewaehlt}\n`);

const { leseTheme, schreibeTheme, vorlageAn, vorlageAus, vorlageIstAn }
  = await import("../../custom_components/glaswerk/www/theme.js");

const ARBEIT = "vorschau_arbeit";

async function themeMit(vorlage, an) {
  const g = leseTheme(datei.content);
  const m = g.modell ?? g;
  m.name = ARBEIT;
  // Erst alle Vorlagen AUS - sonst zeigt das Vorher-Bild die uebrigen
  // Vorlagen mit, und der Unterschied waere nicht mehr diese eine.
  for (const v of VORLAGEN) vorlageAus(m, v);
  if (an) vorlageAn(m, vorlage);
  // overwrite: save_theme schuetzt sonst vor dem Ueberschreiben ("gibt es
  // schon"). Die Arbeitstheme wird je Aufnahme neu geschrieben - zweimal je
  // Vorlage -, da ist der Schutz nur im Weg.
  await ws([
    { type: "glaswerk/save_theme", name: ARBEIT, yaml: schreibeTheme(m), overwrite: true },
    { type: "call_service", domain: "frontend", service: "reload_themes" },
  ]);
  await warte(600);
  await ws([{ type: "frontend/set_user_data", key: "theme", value: { theme: ARBEIT, dark: true } }]);
  await warte(400);
}

// --- Den Zustand einfrieren ----------------------------------------------
//
// Die Entitaeten der Testmaschine aendern sich von selbst: Zwischen zwei
// Laeufen stand light.wohnzimmer einmal auf "on" und einmal auf "off".
// Faellt so ein Wechsel ZWISCHEN Vorher und Nachher, vergleicht man zwei
// Lampenzustaende statt der Vorlage - und das Bild zeigt einen Unterschied,
// den die Vorlage nie gemacht hat.
//
// Deshalb vor dem Lauf alles auf einen festen Stand bringen.
await ws([
  { type: "call_service", domain: "light", service: "turn_on",
    target: { entity_id: ["light.wohnzimmer", "light.kuche", "light.schlafzimmer"] },
    service_data: { brightness_pct: 80 } },
  { type: "call_service", domain: "light", service: "turn_off",
    target: { entity_id: "light.bad" } },
  { type: "call_service", domain: "switch", service: "turn_on",
    target: { entity_id: "switch.waschmaschine" } },
]);
await warte(1200);

const c = await starteChrome({ ziel: "/tmp/vorschau-roh", breite: 1600, hoehe: 1000, dichte: 2 });
mkdirSync("/tmp/vorschau-roh", { recursive: true });

const ergebnisse = [];

try {
  await c.geh("/glaswerk-muster/muster", 7000);

  for (const v of liste) {
    const stelle = STELLEN[v.id];
    if (!stelle) { ergebnisse.push({ id: v.id, maengel: ["keine Stelle hinterlegt"] }); continue; }

    const maengel = [];
    const bilder = {};

    for (const an of [false, true]) {
      await themeMit(v, an);
      // Manche Bauteile gibt es nur bei schmalem Fenster - der wa-drawer
      // etwa ist die ausfahrbare Seitenleiste und existiert breit gar nicht.
      if (stelle.schmal) await c.breite(stelle.schmal[0], stelle.schmal[1]);
      else await c.breite(1600, 1000);
      await c.geh(stelle.pfad, 3500);

      // Auslösen, was erst erscheinen muss.
      if (stelle.oeffne === "more-info") {
        // Das Ereignis, nicht ein Klick. Am 17.10.2026 beides gemessen:
        // hass-more-info oeffnet den Dialog zuverlaessig (580x629), ein
        // Klick auf die Kachel oeffnet gar nichts - und ein Klick auf
        // geratene Koordinaten trifft die Seitenleiste.
        await c.lies(`(() => {
          const ha = document.querySelector("home-assistant");
          ha.dispatchEvent(new CustomEvent("hass-more-info",
            { detail: { entityId: "light.wohnzimmer" }, bubbles: true, composed: true }));
          return true;
        })()`);
        await warte(1800);
      }
      if (stelle.oeffne === "drawer") {
        // Das Attribut setzen, nicht hass-toggle-menu schicken: Letzteres
        // liess den Drawer am 17.10.2026 auf open=false stehen.
        await c.lies(`(() => { ${TIEF}
          const dr = tief(document, (e) => /wa-drawer/.test(e.localName))[0];
          if (!dr) return false;
          dr.setAttribute("open", "");
          dr.open = true;
          return true;
        })()`);
        await warte(1600);
      }
      if (stelle.oeffne === "toast") {
        await c.lies(`(() => {
          const ha = document.querySelector("home-assistant");
          ha.dispatchEvent(new CustomEvent("hass-notification",
            { detail: { message: "Glaswerk" }, bubbles: true, composed: true }));
          return true;
        })()`);
        await warte(900);
      }

      // Auf Ruhe warten: ha-card traegt transition: all .3s, und beim Laden
      // reihen sich mehrere Theme-Durchlaeufe. Zweimal messen, bis gleich.
      let vor = null;
      for (let i = 0; i < 10; i++) {
        const jetzt = await c.lies(`(() => { ${SUCHER}
          const el = stelle(${JSON.stringify(stelle.finde)});
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return { x: r.left, y: r.top, w: r.width, h: r.height,
                   bg: cs.backgroundColor, bf: cs.backdropFilter, sh: cs.boxShadow.slice(0, 30) };
        })()`);
        if (!jetzt) break;
        if (vor && JSON.stringify(vor) === JSON.stringify(jetzt)) { vor = jetzt; break; }
        vor = jetzt;
        await warte(400);
      }

      if (!vor) { maengel.push(`${an ? "nachher" : "vorher"}: ${stelle.finde} nicht auf der Seite`); break; }
      if (vor.w < 20 || vor.h < 20) { maengel.push(`${an ? "nachher" : "vorher"}: Element ist ${Math.round(vor.w)}x${Math.round(vor.h)}`); break; }

      // PRUEFUNG 1: Wirkt die Vorlage ueberhaupt?
      //
      // Nicht "ist der Schalter an", sondern: steht das CSS im Shadow Root
      // des Zielbauteils? Dazwischen koennen uix-theme, UIX selbst oder ein
      // fehlendes Bauteil liegen - und dann entstuenden zwei gleiche Bilder.
      if (an) {
        const marke = `Glaswerk:${v.id}:START`;
        const drin = await c.lies(`(() => { ${TIEF}
          const alle = tief(document, () => true);
          for (const e of alle) {
            if (!e.shadowRoot) continue;
            for (const s of e.shadowRoot.querySelectorAll("style")) {
              if (s.textContent.includes(${JSON.stringify(marke)})) return true;
            }
          }
          // Auch adoptedStyleSheets pruefen - UIX legt dort ab.
          for (const e of alle) {
            const bl = e.shadowRoot?.adoptedStyleSheets || [];
            for (const b of bl) {
              try { for (const r of b.cssRules) if (r.cssText.includes(${JSON.stringify(v.id)})) return true; }
              catch { /* fremdes Blatt */ }
            }
          }
          return false;
        })()`);
        if (!drin) maengel.push(`die Vorlage wirkt nicht - ihr CSS steht in keinem Shadow Root`);
      }

      // Aufnehmen. Etwas Rand mit, damit die Kante im Bild liegt.
      //
      // Der Zoom schneidet VOR der Aufnahme, nicht danach: Ein kleinerer
      // Ausschnitt in derselben Zielgroesse von 440x275 heisst mehr Pixel
      // je Bildschirmpixel - und nur so wird ein Glimmen am Regler oder
      // eine 1 px starke Lichtkante ueberhaupt sichtbar.
      const rand = 12;
      const z = stelle.zoom || {};
      const breiteRoh = z.b ? vor.w * z.b : vor.w;
      let hoeheRoh = z.h ? vor.h * z.h : vor.h;
      if (z.max) hoeheRoh = Math.min(hoeheRoh, z.max);
      const clip = {
        x: Math.max(0, vor.x - rand), y: Math.max(0, vor.y - rand),
        width: Math.min(breiteRoh + rand * 2, 1600),
        height: Math.min(hoeheRoh + rand * 2, 1000),
        scale: 2,
      };
      const r = await c.ruf("Page.captureScreenshot", { format: "png", clip, captureBeyondViewport: true });
      bilder[an ? "nachher" : "vorher"] = Buffer.from(r.data, "base64");
    }

    if (maengel.length || !bilder.vorher || !bilder.nachher) {
      if (!bilder.vorher || !bilder.nachher) maengel.push("nicht beide Aufnahmen entstanden");
      ergebnisse.push({ id: v.id, maengel });
      console.log(`  ROT   ${v.id.padEnd(30)} ${maengel.join("; ")}`);
      continue;
    }

    // PRUEFUNG 2: Unterscheiden sich die Bilder SICHTBAR?
    //
    // Hier stand bis zum 17.10.2026 ein Byte-Vergleich, und der war zu
    // schwach: JPEG aendert schon bei winzigen Abweichungen fast alle
    // Bytes, deshalb liess er neun von siebzehn Paaren durch, die beim
    // Hinsehen identisch aussahen. Gemessen wird jetzt an den PIXELN.
    //
    // Zwei gleiche Bilder sind das eigentliche Risiko: Im Panel saehe man
    // beim Ueberfahren nichts, und niemandem fiele auf, warum.
    if (bilder.vorher.equals(bilder.nachher)) {
      ergebnisse.push({ id: v.id, maengel: ["vorher und nachher sind byteweise gleich"] });
      console.log(`  ROT   ${v.id.padEnd(30)} vorher und nachher sind identisch`);
      continue;
    }

    // Ablegen: PNG -> JPG auf 440x275, mit sips (gehoert zu macOS).
    for (const welche of ["vorher", "nachher"]) {
      const roh = `/tmp/vorschau-roh/${v.id}-${welche}.png`;
      writeFileSync(roh, bilder[welche]);
      execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "82",
        "-z", String(HOEHE), String(BREITE), roh,
        "--out", `${ZIEL}/${v.id}-${welche}.jpg`], { stdio: ["pipe", "pipe", "pipe"] });
    }

    // Jetzt am FERTIGEN Bild messen, in der Groesse, in der es im Panel
    // steht. Ein Unterschied, der erst in der Rohaufnahme sichtbar waere,
    // nuetzt dort nichts.
    const anteil = pixelUnterschied(`${ZIEL}/${v.id}-vorher.jpg`, `${ZIEL}/${v.id}-nachher.jpg`);
    if (anteil !== null && anteil < MIN_UNTERSCHIED) {
      ergebnisse.push({ id: v.id, maengel: [`nur ${anteil.toFixed(1)} % der Pixel unterscheiden sich - im Panel waere nichts zu sehen`] });
      console.log(`  ROT   ${v.id.padEnd(30)} ${anteil.toFixed(1)} % Pixelunterschied - zu wenig`);
      continue;
    }

    const kb = (f) => Math.round(readFileSync(`${ZIEL}/${v.id}-${f}.jpg`).length / 1024);
    ergebnisse.push({ id: v.id, maengel: [], anteil });
    console.log(`  ok    ${v.id.padEnd(30)} ${kb("vorher")} / ${kb("nachher")} kB   ${anteil === null ? "" : anteil.toFixed(0) + " % sichtbar"}`);
  }
} finally {
  await c.zu();
  // Aufraeumen: Arbeitstheme weg, die Theme des Nutzers zurueck.
  try {
    await ws([{ type: "call_service", domain: "frontend", service: "reload_themes" }]);
    if (VORHER_THEME) await ws([{ type: "frontend/set_user_data", key: "theme", value: VORHER_THEME }]);
    console.log(`\nTheme zurueckgestellt auf ${JSON.stringify(VORHER_THEME)}`);
  } catch (e) { console.log("Zuruecklegen gescheitert:", e.message); }
}

// --- Fazit ----------------------------------------------------------------
const rot = ergebnisse.filter((e) => e.maengel.length);
console.log(`\n${ergebnisse.length - rot.length} von ${ergebnisse.length} Paaren entstanden`);
const gesamt = VORLAGEN.filter((v) => fertig(v.id)).length;
console.log(`Insgesamt haben jetzt ${gesamt} von ${VORLAGEN.length} Vorlagen ein Bildpaar`);
if (rot.length) {
  console.log(`\nOhne Bild:`);
  for (const e of rot) console.log(`  ${e.id}: ${e.maengel.join("; ")}`);
}
