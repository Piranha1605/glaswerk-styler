// Eine Seite, die ALLE Bilder des Projekts zeigt - mit Einsatzort.
//
// Angelegt am 17.10.2026 auf Ansage: "Erstelle mir mal eine html mit
// deinen ganzen bildern und wo sie eingestzt werden."
//
// Der Zweck ist die Entscheidung vor der Veroeffentlichung: Welche Bilder
// gibt es, wo stehen sie, was fehlt, was ist veraltet. Dafuer taugt keine
// Liste von Dateinamen - man muss sie sehen.
//
// GERECHNET, NICHT GETIPPT. Die Seite liest beim Erzeugen den echten
// Bestand: die Dateien, ihre Masse, ihr Datum, und wo sie in README.md
// vorkommen (samt der Ueberschrift, unter der sie stehen). Eine von Hand
// gepflegte Uebersicht waere nach dem naechsten Lauf falsch.
//
// Aufruf:  node werkzeuge/bilduebersicht.mjs [ziel.html]
// Vorgabe: /tmp/glaswerk-bilder.html

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const WURZEL = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ZIEL = process.argv[2] || "/tmp/glaswerk-bilder.html";

const lies = (p) => { try { return readFileSync(path.join(WURZEL, p), "utf8"); } catch { return ""; } };
const readme = lies("README.md");
const readmeEn = lies("README.en.md");

// --- Masse und Datum ------------------------------------------------------
function mass(p) {
  try {
    const raus = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", p],
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    const b = raus.match(/pixelWidth: (\d+)/)?.[1];
    const h = raus.match(/pixelHeight: (\d+)/)?.[1];
    return b && h ? `${b}×${h}` : "?";
  } catch { return "?"; }
}

// Wo steht das Bild im README, und unter welcher Ueberschrift?
function stelle(name) {
  const zeilen = readme.split("\n");
  const i = zeilen.findIndex((z) => z.includes(name));
  if (i < 0) return null;
  for (let j = i; j >= 0; j--) {
    const m = zeilen[j].match(/^(#{1,4}) (.+)$/);
    if (m) return { ueber: m[2], ebene: m[1].length, zeile: i + 1 };
  }
  return { ueber: "(ganz oben)", ebene: 1, zeile: i + 1 };
}

// --- Die Bestände ---------------------------------------------------------
const gruppen = [];

// 1. docs/bilder - die Bilder der READMEs
{
  const ordner = path.join(WURZEL, "docs/bilder");
  const dateien = existsSync(ordner) ? readdirSync(ordner).filter((f) => /\.(jpg|png)$/i.test(f)).sort() : [];
  gruppen.push({
    id: "readme",
    titel: "README-Bilder",
    ordner: "docs/bilder/",
    zweck: "Was im README steht - die Bilder, die ein Besucher auf GitHub sieht.",
    bilder: dateien.map((f) => {
      const p = path.join(ordner, f);
      const s = statSync(p);
      const st = stelle(f);
      return {
        datei: f, pfad: `docs/bilder/${f}`,
        kb: Math.round(s.size / 1024), mass: mass(p),
        datum: s.mtime.toISOString().slice(0, 10),
        wo: st ? st.ueber : null, zeile: st ? st.zeile : null,
        auchEn: readmeEn.includes(f),
      };
    }),
  });
}

// 2. www/vorschau - die Vorher/Nachher-Paare im Panel
{
  const ordner = path.join(WURZEL, "custom_components/glaswerk/www/vorschau");
  const dateien = existsSync(ordner) ? readdirSync(ordner).filter((f) => f.endsWith("-vorher.jpg")) : [];
  gruppen.push({
    id: "vorschau",
    titel: "UIX-Vorschaubilder",
    ordner: "custom_components/glaswerk/www/vorschau/",
    zweck: "Im Panel unter UIX. Beim Überfahren blendet das Nachher-Bild weg und gibt das Vorher frei.",
    paare: dateien.map((f) => {
      const id = f.replace("-vorher.jpg", "");
      const pv = path.join(ordner, f), pn = path.join(ordner, `${id}-nachher.jpg`);
      return {
        id,
        vorher: `custom_components/glaswerk/www/vorschau/${id}-vorher.jpg`,
        nachher: `custom_components/glaswerk/www/vorschau/${id}-nachher.jpg`,
        kb: Math.round((statSync(pv).size + statSync(pn).size) / 2048),
        mass: mass(pv),
        datum: statSync(pv).mtime.toISOString().slice(0, 10),
      };
    }).sort((a, b) => a.id.localeCompare(b.id)),
  });
}

// 3. Vorlagen OHNE Bild - mit dem gemessenen Grund
let ohneBild = [];
try {
  const quelle = lies("werkzeuge/test/vorlagen-vorschau.mjs");
  const block = quelle.slice(quelle.indexOf("const OHNE_STELLE = {"),
                             quelle.indexOf("};", quelle.indexOf("const OHNE_STELLE = {")));
  ohneBild = [...block.matchAll(/"([a-z-]+)":\s*"([^"]+)"/g)].map((m) => ({ id: m[1], grund: m[2] }));
} catch { /* dann eben leer */ }

// 4. Videos
let videos = [];
{
  const ordner = path.join(WURZEL, "videos/glaswerk-promo/renders");
  if (existsSync(ordner)) {
    videos = readdirSync(ordner).filter((f) => f.endsWith(".mp4"))
      .map((f) => {
        const s = statSync(path.join(ordner, f));
        return { datei: f, mb: Math.round(s.size / 1048576), datum: s.mtime.toISOString().slice(0, 16).replace("T", " ") };
      })
      .sort((a, b) => b.datum.localeCompare(a.datum));
  }
}

// --- Die Seite ------------------------------------------------------------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const REBRAND = "2026-10-16";   // Tag des Rebrandings - aeltere Bilder koennen "HATS" zeigen

// Am 17.10.2026 durchgesehen: Zeigt das Bild den ALTEN Namen?
//
// Das Datum allein genuegt nicht - alle 25 Bilder sind aelter als das
// Rebranding, aber nur ein Teil zeigt "HATS" wirklich im Bild. Was hier
// nicht steht, ist noch nicht angesehen worden.
const GEPRUEFT = {
  "vergleich-3-mit-uix.jpg": { alt: true, wo: "Seitenleiste, Dashboard-Titel, zwei Eintraege" },
  "glaswerk-dunkel.jpg": { alt: true, wo: "Seitenleiste" },
  "glaswerk-hell.jpg": { alt: true, wo: "Seitenleiste" },
  "steuerleiste-hell.jpg": { alt: false },
  "steuerkarte-einstellungsfenster.jpg": { alt: false, wo: "zeigt bereits glaswerk.yaml" },
};

const readmeBilder = gruppen[0].bilder;
const benutzt = readmeBilder.filter((b) => b.wo);
const unbenutzt = readmeBilder.filter((b) => !b.wo);
const altBilder = readmeBilder.filter((b) => b.datum < REBRAND);
const zeigtAlt = readmeBilder.filter((b) => GEPRUEFT[b.datei]?.alt === true);
const ungeprueft = readmeBilder.filter((b) => GEPRUEFT[b.datei] === undefined);

const html = `<!doctype html>
<html lang="de">
<meta charset="utf-8">
<title>Glaswerk — alle Bilder und ihr Einsatzort</title>
<style>
  :root {
    --grund: #0f1319; --flaeche: #171c25; --rand: #2a3240;
    --tinte: #e8edf7; --leise: #97a3b8; --akzent: #ffb34d; --warn: #ff7a6b;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--grund); color: var(--tinte);
         font: 15px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; }
  header { padding: 40px 32px 24px; border-bottom: 1px solid var(--rand); }
  h1 { margin: 0 0 6px; font-size: 26px; font-weight: 650; letter-spacing: -0.01em; }
  .unter { color: var(--leise); font-size: 14px; }
  main { padding: 0 32px 64px; max-width: 1500px; }
  h2 { margin: 44px 0 4px; font-size: 19px; font-weight: 620; }
  h2 .zahl { color: var(--leise); font-weight: 400; font-size: 15px; margin-left: 8px; }
  .zweck { color: var(--leise); margin: 0 0 4px; font-size: 14px; }
  .pfad { color: var(--leise); font-size: 12.5px; font-family: ui-monospace, Menlo, monospace; margin-bottom: 18px; }

  .bilanz { display: flex; gap: 10px; flex-wrap: wrap; margin: 18px 0 0; }
  .kachel { background: var(--flaeche); border: 1px solid var(--rand); border-radius: 12px;
            padding: 12px 16px; min-width: 128px; }
  .kachel b { display: block; font-size: 22px; font-weight: 650; }
  .kachel span { color: var(--leise); font-size: 12.5px; }
  .kachel.warn b { color: var(--warn); }

  .raster { display: grid; gap: 18px; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); }
  .karte { background: var(--flaeche); border: 1px solid var(--rand); border-radius: 14px;
           overflow: hidden; display: flex; flex-direction: column; }
  .karte img { width: 100%; display: block; background: #0a0d12; }
  .text { padding: 12px 14px; flex: 1; display: flex; flex-direction: column; gap: 5px; }
  .name { font-family: ui-monospace, Menlo, monospace; font-size: 12.5px; word-break: break-all; }
  .wo { font-size: 13px; }
  .wo b { color: var(--akzent); font-weight: 600; }
  .meta { color: var(--leise); font-size: 12px; margin-top: auto; padding-top: 4px; }
  .marke { display: inline-block; font-size: 11px; padding: 1px 7px; border-radius: 99px;
           border: 1px solid var(--rand); color: var(--leise); margin-right: 5px; }
  .marke.frei { border-color: #7a5a1e; color: var(--akzent); }
  .marke.alt { border-color: #6b3028; color: var(--warn); }
  .marke.ok { border-color: #2d5a34; color: #6ec77f; }

  /* Die Vorher/Nachher-Paare genau so wie im Panel: uebereinander,
     beim Ueberfahren blendet das obere weg. */
  .paar { position: relative; aspect-ratio: 440 / 275; background: #0a0d12; }
  .paar img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .paar .nachher { transition: opacity .22s ease; }
  .paar:hover .nachher { opacity: 0; }
  .paar .hinweis { position: absolute; left: 8px; bottom: 8px; font-size: 11px;
                   background: rgba(0,0,0,.6); padding: 2px 8px; border-radius: 99px;
                   color: #fff; pointer-events: none; }
  .paar:hover .hinweis::after { content: " — vorher"; }

  table { border-collapse: collapse; width: 100%; margin-top: 10px; font-size: 13.5px; }
  th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--rand); }
  th { color: var(--leise); font-weight: 600; font-size: 12.5px; }
  td code { font-family: ui-monospace, Menlo, monospace; font-size: 12.5px; }
  .hinw { background: var(--flaeche); border: 1px solid var(--rand); border-left: 3px solid var(--akzent);
          border-radius: 0 10px 10px 0; padding: 14px 18px; margin: 20px 0; font-size: 14px; }
  .hinw.warn { border-left-color: var(--warn); }
  .hinw p { margin: 0 0 6px; } .hinw p:last-child { margin: 0; }
</style>

<header>
  <h1>Glaswerk — alle Bilder und ihr Einsatzort</h1>
  <div class="unter">Erzeugt am ${new Date().toLocaleString("de-DE")} aus dem echten Bestand.
    Die Seite liest Dateien, Maße, Datum und die Fundstellen in README.md selbst ein.</div>
  <div class="bilanz">
    <div class="kachel"><b>${readmeBilder.length}</b><span>README-Bilder</span></div>
    <div class="kachel"><b>${benutzt.length}</b><span>davon eingebunden</span></div>
    <div class="kachel${unbenutzt.length ? " warn" : ""}"><b>${unbenutzt.length}</b><span>ohne Fundstelle</span></div>
    <div class="kachel"><b>${gruppen[1].paare.length}</b><span>UIX-Paare</span></div>
    <div class="kachel${ohneBild.length ? " warn" : ""}"><b>${ohneBild.length}</b><span>Vorlagen ohne Bild</span></div>
    <div class="kachel${zeigtAlt.length ? " warn" : ""}"><b>${zeigtAlt.length}</b><span>zeigen „HATS“</span></div>
    <div class="kachel"><b>${ungeprueft.length}</b><span>noch nicht angesehen</span></div>
  </div>
</header>

<main>

${altBilder.length ? `<div class="hinw warn">
  <p><b>Alle ${altBilder.length} Bilder stammen von vor dem ${REBRAND}</b> — dem Tag, an dem HATS zu Glaswerk wurde (Commit <code>bb09026</code>). Das Datum allein sagt aber nichts: Nur ein Teil zeigt den alten Namen wirklich <i>im Bild</i>.</p>
  <p><b>Durchgesehen:</b> ${zeigtAlt.length} zeigen „HATS“ und müssen neu —
     ${zeigtAlt.map((b) => `<code>${esc(b.datei)}</code>`).join(", ") || "keines"}.
     ${readmeBilder.length - ungeprueft.length - zeigtAlt.length} sind geprüft und sauber.
     <b>${ungeprueft.length} sind noch nicht angesehen.</b></p>
  <p>Die Durchsicht steht in <code>werkzeuge/bilduebersicht.mjs</code> unter <code>GEPRUEFT</code> —
     wer ein Bild ansieht, trägt das Ergebnis dort ein, damit es nicht zweimal geöffnet wird.</p>
</div>` : ""}

<h2>1 · README-Bilder <span class="zahl">${readmeBilder.length} Stück</span></h2>
<p class="zweck">${esc(gruppen[0].zweck)}</p>
<p class="pfad">${gruppen[0].ordner}</p>

<div class="raster">
${readmeBilder.map((b) => `  <div class="karte">
    <img src="${b.pfad}" alt="" loading="lazy">
    <div class="text">
      <div class="name">${esc(b.datei)}</div>
      <div class="wo">${b.wo ? `steht unter <b>${esc(b.wo)}</b>` : `<span class="marke frei">ohne Fundstelle</span>`}</div>
      <div class="meta">
        ${GEPRUEFT[b.datei]?.alt === true
          ? `<span class="marke alt">zeigt HATS${GEPRUEFT[b.datei].wo ? " — " + esc(GEPRUEFT[b.datei].wo) : ""}</span>`
          : GEPRUEFT[b.datei]?.alt === false
            ? `<span class="marke ok">geprüft, sauber</span>`
            : '<span class="marke">noch nicht angesehen</span>'}
        ${b.mass} · ${b.kb} kB · ${b.datum}${b.auchEn ? " · auch EN" : ""}
      </div>
    </div>
  </div>`).join("\n")}
</div>

<h2>2 · UIX-Vorschaubilder <span class="zahl">${gruppen[1].paare.length} Paare</span></h2>
<p class="zweck">${esc(gruppen[1].zweck)} <b>Fahr mit der Maus darüber</b> — genau wie im Panel.</p>
<p class="pfad">${gruppen[1].ordner}</p>

<div class="raster">
${gruppen[1].paare.map((p) => `  <div class="karte">
    <div class="paar">
      <img class="vorher" src="${p.vorher}" alt="" loading="lazy">
      <img class="nachher" src="${p.nachher}" alt="" loading="lazy">
      <span class="hinweis">nachher</span>
    </div>
    <div class="text">
      <div class="name">${esc(p.id)}</div>
      <div class="wo">Panel → UIX → Vorlagen</div>
      <div class="meta">${p.mass} · ~${p.kb} kB je Bild · ${p.datum}</div>
    </div>
  </div>`).join("\n")}
</div>

${ohneBild.length ? `
<h2>3 · Vorlagen ohne Bild <span class="zahl">${ohneBild.length} Stück</span></h2>
<p class="zweck">Im Panel steht dort „noch kein Bild“. Jede Zeile trägt den <b>gemessenen</b> Grund —
  kein Bild ist besser als eines, auf dem man nichts erkennt.</p>
<table>
  <tr><th>Vorlage</th><th>warum kein Bild</th></tr>
${ohneBild.map((o) => `  <tr><td><code>${esc(o.id)}</code></td><td>${esc(o.grund)}</td></tr>`).join("\n")}
</table>` : ""}

${videos.length ? `
<h2>4 · Videos <span class="zahl">${videos.length} Renders</span></h2>
<p class="zweck">Aus <code>videos/glaswerk-promo/</code>. Der jüngste Render ist der aktuelle Stand.</p>
<table>
  <tr><th>Datei</th><th>Größe</th><th>erzeugt</th></tr>
${videos.slice(0, 8).map((v, i) => `  <tr><td><code>${esc(v.datei)}</code>${i === 0 ? ' <span class="marke frei">aktuell</span>' : ""}</td><td>${v.mb} MB</td><td>${v.datum}</td></tr>`).join("\n")}
</table>` : ""}

<h2>5 · Was für die Veröffentlichung fehlt</h2>
<div class="hinw">
  <p><b>Schau-Dashboard.</b> Die vorhandene Musterseite (<code>/glaswerk-muster</code>) ist auf den
     Nachweis der Vorlagen gebaut, nicht aufs Vorzeigen — sie zeigt vier Lampen, vier Regler und
     eine Markdown-Karte nebeneinander. Für das README braucht es eine Ansicht, die aussieht wie
     bei einem echten Nutzer.</p>
  <p><b>Bar und Styler zusammen.</b> Beide gehören in ein Repository: Die Bar liegt ohnehin in
     <code>custom_components/glaswerk/www/</code> und wird von <code>karte.py</code> selbst in
     Home Assistants Ressourcenliste eingetragen.</p>
  <p><b>Die Karten bleiben unerwähnt.</b> Sie dürfen im Video zu sehen sein, stehen aber in keinem
     Text, keinem Repository-Namen und keinem HACS-Eintrag.</p>
  <p><b>Hell/Dunkel im README</b> geht über <code>&lt;picture&gt;</code> mit
     <code>prefers-color-scheme</code> — am 17.10.2026 an GitHubs Markdown-API geprüft. Ein
     Hover-Wechsel geht dort <i>nicht</i>: <code>onmouseover</code> wird entfernt, eigenes CSS
     escaped. Im Panel dagegen funktioniert der Hover (siehe Abschnitt 2).</p>
</div>

</main>
</html>
`;

// Die Pfade sind relativ zur PROJEKTWURZEL geschrieben. Die Seite landet
// aber in docs/ - von dort aus zeigt "docs/bilder/..." eine Ebene zu tief.
// Beim ersten Versuch luden deshalb alle 41 Bilder nicht.
//
// Statt die Pfade oben zu aendern (dann waere die Seite nur noch aus docs/
// nutzbar) wird hier je Ablageort umgeschrieben.
const fuerOrdner = (text, tiefe) => text.replace(
  /(src=")((?:docs|custom_components)\/)/g,
  (_, a, b) => a + "../".repeat(tiefe) + b);

writeFileSync(ZIEL, fuerOrdner(html, 0).replace(/src="/g, `src="${WURZEL}/`));

const imProjekt = path.join(WURZEL, "docs/bilduebersicht.html");
writeFileSync(imProjekt, fuerOrdner(html, 1));

console.log(`Geschrieben:
  ${ZIEL}            (Bilder relativ - nur im Projektordner nutzbar)
  docs/bilduebersicht.html   <- diese hier oeffnen

${readmeBilder.length} README-Bilder (${benutzt.length} eingebunden, ${unbenutzt.length} ohne Fundstelle)
${gruppen[1].paare.length} UIX-Paare, ${ohneBild.length} Vorlagen ohne Bild
${altBilder.length} Bilder stammen von vor dem Rebranding am ${REBRAND}`);
