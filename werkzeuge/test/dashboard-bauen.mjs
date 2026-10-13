// Baut das Test-Dashboard auf der Testmaschine: ein Dashboard "HATS-Test" mit
// zwei Ansichten.
//
//   Vergleich   dieselbe Entitaet in allen drei Familien nebeneinander,
//               in jedem Zustand, den man vergleichen will
//   Alles       eine Karte je Kartentyp, als Flaeche fuer Vorlagen
//
// Idempotent: Ein zweiter Lauf erzeugt kein zweites Dashboard und keine
// zweite Ansicht. Und er fasst NUR seine eigenen Ansichten an - die Ansicht
// "Eigene" und alles, was sonst noch dazukommt, bleibt woertlich stehen.
//
// Die Entitaeten kommen aus der Demo-Integration und sind auf der
// Testmaschine schaltbar - anders als im Haus, wo nur Zuchtbecken und
// Terrarium frei sind.

import { verbinde } from "/Users/enricofischer/Projekte/haos-test/ws.mjs";

const URL_PFAD = "hats-test";
const TITEL = "HATS-Test";

// Drei Familien, eine Entitaet, untereinander - so sieht man Unterschiede
// sofort, statt sie aus zwei Screenshots zusammenzusuchen.
const reihe = (ueberschrift, ent, art) => {
  const domain = ent.split(".")[0];
  const feat = { light: { type: "light-brightness" },
                 climate: { type: "target-temperature" },
                 cover: { type: "cover-position" },
                 fan: { type: "fan-speed" },
                 media_player: { type: "media-player-volume-slider" } }[domain];
  const mush = {
    light:        { type: "custom:mushroom-light-card", entity: ent, show_brightness_control: true, use_light_color: true, collapsible_controls: false },
    climate:      { type: "custom:mushroom-climate-card", entity: ent, show_temperature_control: true },
    cover:        { type: "custom:mushroom-cover-card", entity: ent, show_position_control: true },
    fan:          { type: "custom:mushroom-fan-card", entity: ent, show_percentage_control: true },
    media_player: { type: "custom:mushroom-media-player-card", entity: ent, show_volume_control: true },
    lock:         { type: "custom:mushroom-lock-card", entity: ent },
  }[domain] || { type: "custom:mushroom-entity-card", entity: ent };
  const bub = domain === "climate"      ? { type: "custom:bubble-card", card_type: "climate", entity: ent }
            : domain === "media_player" ? { type: "custom:bubble-card", card_type: "media-player", entity: ent }
            : domain === "cover"        ? { type: "custom:bubble-card", card_type: "cover", entity: ent }
            : { type: "custom:bubble-card", card_type: "button",
                button_type: art === "slider" ? "slider" : "switch", entity: ent };
  return { type: "grid", column_span: 1, cards: [
    { type: "heading", heading: ueberschrift, heading_style: "title" },
    { type: "heading", heading: "Home Assistant", heading_style: "subtitle" },
    { type: "tile", entity: ent, features_position: "bottom", ...(feat ? { features: [feat] } : {}) },
    { type: "heading", heading: "Mushroom", heading_style: "subtitle" }, mush,
    { type: "heading", heading: "Bubble Card", heading_style: "subtitle" }, bub,
  ] };
};

const vergleich = {
  title: "Vergleich", path: "vergleich", icon: "mdi:compare-horizontal",
  type: "sections", max_columns: 3,
  sections: [
    reihe("Licht AN (mit Farbe)", "light.ceiling_lights", "slider"),
    reihe("Licht AUS",            "light.bed_light",      "slider"),
    reihe("Heizung",              "climate.heatpump",     null),
    reihe("Luefter",              "fan.living_room_fan",  "slider"),
    reihe("Rollladen",            "cover.hall_window",    null),
    reihe("Media Player",         "media_player.bedroom", null),
  ],
};

// Eine Flaeche fuer alles, was eine Vorlage treffen koennte.
const alles = {
  title: "Alles", path: "alles", icon: "mdi:view-grid", type: "sections", max_columns: 3,
  sections: [
    { type: "grid", cards: [
      { type: "heading", heading: "Home Assistant", heading_style: "title", icon: "mdi:home-assistant" },
      { type: "tile", entity: "light.ceiling_lights", features_position: "bottom", features: [{ type: "light-brightness" }] },
      { type: "tile", entity: "lock.front_door" },
      { type: "entities", title: "Zeilen", entities: ["light.bed_light", "switch.decorative_lights", "fan.ceiling_fan"] },
      { type: "glance", title: "Glance", entities: ["light.ceiling_lights", "light.kitchen_lights", "switch.ac"] },
      { type: "gauge", entity: "sensor.carbon_dioxide", name: "CO2" },
      { type: "weather-forecast", entity: "weather.forecast_home", forecast_type: "daily" },
      { type: "markdown", content: "### Markdown\nText in einer Karte." },
    ] },
    { type: "grid", cards: [
      { type: "heading", heading: "Mushroom", heading_style: "title", icon: "mdi:mushroom" },
      { type: "custom:mushroom-chips-card", chips: [
        { type: "weather", entity: "weather.forecast_home", show_conditions: true, show_temperature: true },
        { type: "entity", entity: "light.ceiling_lights" },
        { type: "entity", entity: "lock.front_door" } ] },
      { type: "custom:mushroom-light-card", entity: "light.kitchen_lights", show_brightness_control: true, use_light_color: true },
      { type: "custom:mushroom-fan-card", entity: "fan.living_room_fan", show_percentage_control: true },
      { type: "custom:mushroom-cover-card", entity: "cover.living_room_window", show_position_control: true },
      { type: "custom:mushroom-climate-card", entity: "climate.hvac", show_temperature_control: true },
      { type: "custom:mushroom-lock-card", entity: "lock.kitchen_door" },
      { type: "custom:mushroom-media-player-card", entity: "media_player.living_room", show_volume_control: true },
    ] },
    { type: "grid", cards: [
      { type: "heading", heading: "Bubble Card", heading_style: "title", icon: "mdi:card-outline" },
      { type: "custom:bubble-card", card_type: "separator", name: "Licht", icon: "mdi:lightbulb" },
      { type: "custom:bubble-card", card_type: "button", button_type: "slider", entity: "light.ceiling_lights" },
      { type: "custom:bubble-card", card_type: "button", button_type: "switch", entity: "switch.decorative_lights" },
      { type: "custom:bubble-card", card_type: "button", button_type: "state", entity: "sensor.outside_temperature" },
      { type: "custom:bubble-card", card_type: "separator", name: "Geraete", icon: "mdi:devices" },
      { type: "custom:bubble-card", card_type: "climate", entity: "climate.heatpump" },
      { type: "custom:bubble-card", card_type: "cover", entity: "cover.hall_window" },
      { type: "custom:bubble-card", card_type: "media-player", entity: "media_player.lounge_room" },
    ] },
  ],
};

const ha = await verbinde();
try {
  const liste = await ha.ruf({ type: "lovelace/dashboards/list" });
  let da = liste.find((d) => d.url_path === URL_PFAD);
  if (!da) {
    da = await ha.ruf({ type: "lovelace/dashboards/create", url_path: URL_PFAD,
                        title: TITEL, icon: "mdi:palette", show_in_sidebar: true, require_admin: false });
    console.log("Dashboard angelegt:", URL_PFAD);
  } else {
    console.log("Dashboard gibt es schon:", URL_PFAD);
  }

  // DIESES SKRIPT ERSETZT NUR SEINE EIGENEN ANSICHTEN.
  //
  // Alles andere bleibt woertlich stehen - wer eine Karte auf einer eigenen
  // Ansicht ablegt, findet sie nach dem naechsten Lauf unveraendert wieder.
  // Ohne diese Trennung waere jeder Lauf ein stiller Datenverlust, und genau
  // das ist am 13.10.2026 an anderer Stelle schon einmal passiert.
  const MEINE = ["vergleich", "alles"];

  let alt = { views: [] };
  try { alt = await ha.ruf({ type: "lovelace/config", url_path: URL_PFAD, force: true }); } catch { /* noch leer */ }
  const fremd = (alt.views || []).filter((v) => !MEINE.includes(v.path));

  // Eine leere Ansicht zum Selberbauen, einmalig angelegt und nie wieder
  // angefasst. Sie steht hinten, damit die Vergleichsansicht vorn bleibt.
  const hatEigene = fremd.some((v) => v.path === "eigene");
  const eigene = hatEigene ? [] : [{
    title: "Eigene", path: "eigene", icon: "mdi:plus-box",
    type: "sections", max_columns: 3,
    sections: [{ type: "grid", cards: [
      { type: "heading", heading: "Zum Selberbauen", heading_style: "title", icon: "mdi:hammer-wrench" },
      { type: "markdown", content:
        "Diese Ansicht gehoert dir. `dashboard-bauen.mjs` fasst sie **nie** an " +
        "- Karten hier bleiben erhalten, auch wenn das Skript wieder laeuft.\n\n" +
        "Die Ansichten *Vergleich* und *Alles* werden dagegen bei jedem Lauf " +
        "neu geschrieben." },
    ] }],
  }];

  const config = { views: [...fremd, ...eigene, vergleich, alles] };

  await ha.ruf({ type: "lovelace/config/save", url_path: URL_PFAD, config });

  // Gegenprobe vom Server, nicht aus dem Speicher.
  const nach = await ha.ruf({ type: "lovelace/config", url_path: URL_PFAD, force: true });
  for (const v of nach.views) {
    const n = (v.sections || []).reduce((m, s) => m + (s.cards || []).length, 0);
    console.log(`  ${v.title.padEnd(12)} /${(v.path || "").padEnd(10)} ${String((v.sections || []).length).padStart(2)} Abschnitte  ${String(n).padStart(3)} Karten`);
  }
  console.log("\nhttp://localhost:8123/" + URL_PFAD + "/vergleich");
} finally { ha.zu(); }
