// Forge-Vorlagen: fertige Konfigurationen fuer UIX Forge.
//
// Der Unterschied zu vorlagen.js: Die Theme-Vorlagen dort schreiben CSS in
// ein Stilziel der THEME und gelten fuer alles. Eine Forge-Vorlage erzeugt
// die Konfiguration EINER KARTE - der Nutzer kopiert sie in den YAML-Editor
// seiner Karte oder laesst sie vom Panel einsetzen.
//
// Forge umhuellt eine vorhandene Karte und kann drei Dinge, die die Karte
// selbst nicht kann:
//
//   1. CSS darauflegen            - das kann card-mod auch
//   2. KONFIGURATION per Template - das kann card-mod nicht
//   3. VERHALTEN ueber Sparks     - das kann card-mod nicht
//
// Vier Regeln, damit eine Vorlage traegt:
//
// 1. Was der Karte gehoert, steht in `element_base`. Forge reicht es
//    unveraendert durch - samt ihrer eigenen Templates. Ohne das muesste
//    jedes {{ }} der Karte als << >> escaped werden. `element_base` gibt es
//    erst ab UIX 9.0.0-beta.0; aeltere Fassungen koennen diese Vorlagen nicht.
//
// 2. Was Forge gehoert, steht in `element`. Dort werden Templates
//    ausgewertet. `type` gehoert NICHT dorthin - der steht in element_base
//    und laesst sich nicht ueberschreiben.
//
// 3. Eine Vorlage LIEST die Theme-Felder, sie setzt keine festen Werte.
//    `var(--ha-card-backdrop-filter)` statt `blur(26px)`. Sonst waere die
//    Vorlage ein zweiter Ort fuer denselben Wert, und wer das Feld aendert,
//    sieht nichts passieren. Dieselbe Regel wie in vorlagen.js.
//
// 4. Jede Vorlage traegt einen Platzhalter `<entity>` oder `<karte>`, wo der
//    Nutzer etwas einsetzen muss. Das Panel ersetzt ihn; wer den Block von
//    Hand kopiert, sieht, wo er hinlangen muss.

export const FORGE_GRUPPEN = [
  { id: "aussehen", de: "Aussehen", en: "Appearance" },
  { id: "inhalt", de: "Inhalt", en: "Content" },
  { id: "verhalten", de: "Verhalten", en: "Behaviour" },
];

export const FORGE_VORLAGEN = [

  // ---------------------------------------------------------------- Aussehen
  {
    id: "glas-auf-fremde-karte",
    gruppe: "aussehen",
    de: "Fremde Karte in Glas",
    en: "Foreign card in glass",
    zweckDe: "Legt Glaswerks Flaeche auf eine beliebige Karte, ohne sie nachzubauen. Fuer Karten anderer Entwickler und fuer HAs eigene.",
    zweckEn: "Puts Glaswerk's surface on any card without rebuilding it. For other developers' cards and Home Assistant's own.",
    braucht: "karte",
    yaml: `type: custom:uix-forge
forge:
  mold: card
element_base:
  # Hier die Karte einsetzen, die eingekleidet werden soll.
  type: <karte>
element:
  uix:
    style: |-
      /* Liest die Theme-Felder, setzt keine festen Werte: Wer die
         Weichzeichnung in der Theme aendert, sieht es hier sofort. */
      ha-card {
        backdrop-filter: var(--ha-card-backdrop-filter, blur(26px) saturate(180%));
        -webkit-backdrop-filter: var(--ha-card-backdrop-filter, blur(26px) saturate(180%));
        background: var(--ha-card-background, var(--card-background-color));
        border-radius: var(--ha-card-border-radius, 18px);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, .35);
      }`,
  },

  {
    id: "rand-nach-zustand",
    gruppe: "aussehen",
    de: "Rand nach Zustand",
    en: "Edge by state",
    zweckDe: "Ein farbiger Streifen links, dessen Farbe dem Zustand folgt. Zeigt auf einen Blick, was an ist.",
    zweckEn: "A coloured stripe on the left whose colour follows the state. Shows at a glance what is on.",
    braucht: "entity",
    yaml: `type: custom:uix-forge
forge:
  mold: card
element_base:
  type: tile
  entity: <entity>
element:
  uix:
    style: |-
      ha-card {
        border-left: 4px solid {{
          'var(--state-active-color)' if is_state('<entity>', 'on')
          else 'var(--divider-color)'
        }};
      }`,
  },

  // ------------------------------------------------------------------ Inhalt
  {
    id: "liste-fuellt-sich-selbst",
    gruppe: "inhalt",
    de: "Liste fuellt sich selbst",
    en: "Self-filling list",
    zweckDe: "Eine Liste, die alle Entitaeten einer Integration zeigt. Ein neues Geraet steht beim naechsten Laden von selbst darin - niemand pflegt das Dashboard nach.",
    zweckEn: "A list showing every entity of an integration. A new device appears on the next load by itself - nobody maintains the dashboard.",
    braucht: "integration",
    yaml: `type: custom:uix-forge
forge:
  mold: card
element_base:
  type: entities
  title: Alle Lichter
element:
  # Ein Template, das ein Array liefert, ERSETZT das ganze Feld.
  # Deshalb tojson - ohne das kaeme eine Zeichenkette an.
  entities: "{{ integration_entities('<integration>') | list | tojson }}"`,
  },

  {
    id: "text-nach-zustand",
    gruppe: "inhalt",
    de: "Beschriftung nach Zustand",
    en: "Label by state",
    zweckDe: "Name, Symbol und Farbe folgen dem Zustand. Eine Karte statt zweier mit Sichtbarkeitsbedingung.",
    zweckEn: "Name, icon and colour follow the state. One card instead of two with visibility conditions.",
    braucht: "entity",
    yaml: `type: custom:uix-forge
forge:
  mold: card
element_base:
  type: tile
  entity: <entity>
element:
  name: "{{ 'Laeuft' if is_state('<entity>', 'on') else 'Aus' }}"
  icon: "{{ 'mdi:play-circle' if is_state('<entity>', 'on') else 'mdi:stop-circle' }}"
  color: "{{ 'green' if is_state('<entity>', 'on') else 'grey' }}"`,
  },

  // --------------------------------------------------------------- Verhalten
  {
    id: "sperre-davor",
    gruppe: "verhalten",
    de: "Sperre davor",
    en: "Lock in front",
    zweckDe: "Die Karte laesst sich erst bedienen, wenn der Nutzer bestaetigt. Statt confirm geht auch pin oder passphrase.",
    zweckEn: "The card can only be operated after the user confirms. Instead of confirm, pin or passphrase also work.",
    braucht: "entity",
    yaml: `type: custom:uix-forge
forge:
  mold: card
  sparks:
    - type: lock
      target: ha-card
      challenge: confirm
      message: Wirklich schalten?
element_base:
  type: tile
  entity: <entity>`,
  },

  {
    id: "hinweis-am-symbol",
    gruppe: "verhalten",
    de: "Hinweis am Symbol",
    en: "Tooltip on the icon",
    zweckDe: "Ein Tooltip, der zeigt, wann sich der Zustand zuletzt geaendert hat. Die Karte selbst bleibt unberuehrt.",
    zweckEn: "A tooltip showing when the state last changed. The card itself stays untouched.",
    braucht: "entity",
    yaml: `type: custom:uix-forge
forge:
  mold: card
  sparks:
    - type: tooltip
      target: ha-tile-icon
      content: "Zuletzt geaendert: {{ relative_time(states['<entity>'].last_changed) }}"
element_base:
  type: tile
  entity: <entity>`,
  },

  {
    id: "abzeichen-dazu",
    gruppe: "verhalten",
    de: "Abzeichen dazu",
    en: "Badge added",
    zweckDe: "Ein kleines Abzeichen neben dem Inhalt, dessen Text und Farbe dem Zustand folgen.",
    zweckEn: "A small badge beside the content whose text and colour follow the state.",
    braucht: "entity",
    yaml: `type: custom:uix-forge
forge:
  mold: card
  sparks:
    - type: badge
      target: ha-tile-info
      position: after
      content: "{{ 'an' if is_state('<entity>', 'on') else 'aus' }}"
      variant: "{{ 'success' if is_state('<entity>', 'on') else 'neutral' }}"
element_base:
  type: tile
  entity: <entity>`,
  },
];

/* Setzt die Platzhalter einer Vorlage. Fehlt ein Wert, bleibt der
   Platzhalter stehen - sichtbar statt stillschweigend leer. */
export function forgeVorlageFuellen(vorlage, werte = {}) {
  let text = vorlage.yaml;
  for (const [schluessel, wert] of Object.entries(werte)) {
    if (!wert) continue;
    text = text.split(`<${schluessel}>`).join(wert);
  }
  return text;
}

/* Die Vorlagen einer Gruppe, in der Reihenfolge, in der sie oben stehen. */
export function forgeVorlagenDerGruppe(gruppe) {
  return FORGE_VORLAGEN.filter((v) => v.gruppe === gruppe);
}
