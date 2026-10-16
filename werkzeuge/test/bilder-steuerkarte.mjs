// Die Steuerkarte in Bildern - fuer Video und Dokumentation.
//
//   node werkzeuge/test/bilder-steuerkarte.mjs [ziel-ordner]
//
// Gefragt am 15.10.2026: "die fotos von der steuer karte hast alle gemeacxht?"
// Nein - in der ersten Runde waren nur die Leiste in der Aufsicht und das
// Zahnrad als Ausschnitt dabei. Das Einstellungsfenster, das Badge und die
// eingeklappte Form fehlten, und genau die sind das Besondere an der Karte.
//
// Jedes Bild hier ist ein ZUSTAND, kein Ausschnitt: Die Karte wird in den
// Zustand gebracht und dann fotografiert. Was sich nicht herstellen laesst,
// wird gemeldet und nicht behauptet.

import path from "node:path";
import { starteChrome, warte, TIEF } from "./chrome.mjs";

const ZIEL = process.argv[2] || "videos/glaswerk-promo/bilder/steuerkarte";
const SEITE = "/dashboard-vorschau/start";

const c = await starteChrome({ port: 9335, ziel: ZIEL });
try {
  await c.geh(SEITE, 9000);
  console.log("angemeldet, Theme:", await c.pruefeAnmeldung());

  // Der Zugriff auf die Karte und ihr Fenster. Alles ueber die Elemente, nie
  // ueber Koordinaten: Ein Klick auf eine ausgerechnete Stelle trifft daneben,
  // sobald ein Symbol seine Groesse nachtraeglich bekommt.
  const werkzeug = `${TIEF}
    window.__s = {
      karte: () => tief(document.body, (e) => e.tagName === "HATS-CONTROL-CARD")[0],
      knopf: (f) => { const k = window.__s.karte(); if (!k) return null;
        return tief(k.shadowRoot, (e) => e.dataset && e.dataset.funktion === f)[0]
            || tief(k.shadowRoot, (e) => e.tagName === "BUTTON" && (e.getAttribute("title") || "").toLowerCase().includes(f))[0] || null; },
      knoepfe: () => { const k = window.__s.karte(); if (!k) return [];
        return tief(k.shadowRoot, (e) => e.tagName === "BUTTON").map((b) => ({
          titel: b.getAttribute("title") || b.textContent.trim().slice(0, 20),
          funktion: b.dataset ? b.dataset.funktion : null })); },
      fenster: () => { const k = window.__s.karte(); if (!k) return null;
        return k.shadowRoot.querySelector("dialog[open]"); },
      lage: (el) => { if (!el) return null; const q = el.getBoundingClientRect();
        return { x: Math.round(q.left), y: Math.round(q.top), width: Math.round(q.width), height: Math.round(q.height) }; },
    };`;
  await c.lies(werkzeug);

  const knoepfe = await c.lies(`window.__s.knoepfe()`);
  console.log("Knoepfe in der Leiste:", knoepfe.map((k) => k.funktion || k.titel).join(", "));

  // ---- 1. Die Leiste, scharf und allein -----------------------------------
  const leiste = await c.lies(`window.__s.lage(window.__s.karte())`);
  if (!leiste) throw new Error("keine Steuerkarte auf " + SEITE);
  const rand = 40;
  await c.schuss("01-leiste", { x: Math.max(0, leiste.x - rand), y: Math.max(0, leiste.y - rand),
    width: leiste.width + 2 * rand, height: leiste.height + 2 * rand, scale: 2 });

  // ---- 2. Das Einstellungsfenster -----------------------------------------
  const auf = await c.lies(`(() => {
    const b = window.__s.knopf("settings") || window.__s.knopf("einstell");
    if (!b) return "kein Knopf";
    b.click();
    return "geklickt";
  })()`);
  await warte(2500);
  const fenster = await c.lies(`window.__s.lage(window.__s.fenster())`);
  if (fenster) {
    console.log(`   Fenster ${fenster.width} x ${fenster.height}`);
    await c.schuss("02-fenster");                      // ganze Seite: der Schleier gehoert dazu
    await c.schuss("02-fenster-allein", { ...fenster, scale: 2 });
    // Die Bereiche einzeln - jeder ist ein eigenes Bild wert.
    const bereiche = await c.lies(`(() => {
      const d = window.__s.fenster(); if (!d) return [];
      return [...d.querySelectorAll("h3, .bereich-titel, [data-bereich]")].map((e) => e.textContent.trim()).filter(Boolean).slice(0, 12);
    })()`);
    console.log("   Bereiche:", bereiche.join(" | ") || "(keine gefunden)");
  } else {
    console.log("   FENSTER GING NICHT AUF (" + auf + ") - Bild 2 faellt aus");
  }

  // ---- 3. Dasselbe am Telefon ---------------------------------------------
  await c.breite(420, 900);
  await warte(1800);
  const amTelefon = await c.lies(`window.__s.lage(window.__s.fenster())`);
  await c.schuss("03-fenster-telefon");
  console.log("   am Telefon:", amTelefon ? `${amTelefon.width} x ${amTelefon.height}` : "(zu)");

  // ---- 4. Die eingeklappte Leiste -----------------------------------------
  await c.lies(`(() => { const d = window.__s.fenster(); if (d && d.close) d.close(); return true; })()`);
  await warte(1200);
  await c.schuss("04-leiste-telefon");
  const liste = await c.lies(`(() => {
    const k = window.__s.karte(); if (!k) return null;
    ${TIEF}
    const b = tief(k.shadowRoot, (e) => e.tagName === "BUTTON" && /menu|mehr|more/i.test(e.getAttribute("title") || ""))[0];
    if (!b) return null; b.click(); return true;
  })()`);
  await warte(1200);
  if (liste) await c.schuss("05-leiste-liste");
  else console.log("   kein Menueknopf sichtbar - Bild 5 faellt aus");

  // ---- 5. Das Badge --------------------------------------------------------
  await c.breite(1920, 1080);
  await warte(1200);
  const badge = await c.lies(`(() => {
    ${TIEF}
    const b = tief(document.body, (e) => e.tagName === "HATS-CONTROL-BADGE")[0];
    if (!b) return null; const q = b.getBoundingClientRect();
    return { x: Math.round(q.left), y: Math.round(q.top), width: Math.round(q.width), height: Math.round(q.height) };
  })()`);
  if (badge && badge.width) {
    await c.schuss("06-badge", { x: badge.x - 24, y: badge.y - 24, width: badge.width + 48, height: badge.height + 48, scale: 2 });
    console.log(`   Badge ${badge.width} x ${badge.height}`);
  } else {
    console.log("   KEIN BADGE auf dieser Seite - Bild 6 faellt aus (eines anlegen, wenn es ins Video soll)");
  }

  console.log("\nfertig -", ZIEL);
} catch (e) {
  console.error("Abgebrochen:", e.message);
  process.exitCode = 1;
} finally {
  await c.zu();
}
