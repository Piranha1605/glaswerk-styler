// Sprachen der Oberflaeche. Deutsch und Englisch stehen in den Quellen selbst
// (Felder de/en, zweckDe/zweckEn, TEXTE.en im Panel). Franzoesisch,
// Niederlaendisch und Spanisch sind Woerterbuecher mit dem ENGLISCHEN Text als
// Schluessel: So braucht keine Datenquelle neue Felder, und was im
// Woerterbuch fehlt, erscheint englisch statt gar nicht.
//
// Eingefuehrt am 10.11.2026. Vorher gab es nur de/en, und jede andere Sprache
// bekam im Panel Deutsch (Meldung aus dem Forum).

import FR from "./sprache-fr.js";
import NL from "./sprache-nl.js";
import ES from "./sprache-es.js";

export const WOERTERBUECHER = { fr: FR, nl: NL, es: ES };
export const SPRACHEN = ["de", "en", "fr", "nl", "es"];

// Sprachcode aus Home Assistant ("fr", "fr-BE", "nl-NL" ...) auf eine der
// fuenf Sprachen abbilden. Alles Unbekannte bekommt Englisch.
export function sprachcode(code) {
  const s = String(code || "en").toLowerCase();
  for (const c of ["de", "fr", "nl", "es"]) if (s === c || s.startsWith(c + "-") || s.startsWith(c + "_")) return c;
  return "en";
}

// Einen englischen Text in die Zielsprache bringen.
export function lokal(en, spr) {
  if (typeof en !== "string" || spr === "en" || spr === "de") return en;
  const w = WOERTERBUECHER[spr];
  return (w && w[en]) || en;
}

// Fuer Quellen mit deutschem und englischem Text: Deutsch bei "de", sonst der
// englische Text in der Zielsprache.
export function wahl(de, en, spr) {
  return spr === "de" ? de : lokal(en ?? de, spr);
}

// Ein englisches Objekt ({ titel, text }) oder ein String, jedes Textfeld
// uebersetzt. Fuer ERKLAERUNGEN, MERKSAETZE und AUSLESEN der Hilfe.
export function lokalObjekt(en, spr) {
  if (typeof en === "string") return lokal(en, spr);
  if (!en || typeof en !== "object") return en;
  const out = {};
  for (const [k, v] of Object.entries(en)) out[k] = typeof v === "string" ? lokal(v, spr) : v;
  return out;
}

// Gebietsschema fuer Datum und Uhrzeit.
export const GEBIETSSCHEMA = { de: "de-DE", en: "en-GB", fr: "fr-FR", nl: "nl-NL", es: "es-ES" };
