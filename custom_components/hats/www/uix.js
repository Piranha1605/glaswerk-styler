// Die Stilziele von UI eXtension.
//
// Zeichengenau aus HATG uebernommen (13.10.2026) - die Namen sind die Typnamen
// von UIX und muessen stimmen, sonst entsteht ein Feld, das nie gelesen wird.
// HATG hat das teuer gelernt: uix-states-history-charts hiess dort eine Weile
// faelschlich im Plural und war schlicht tot.
//
// HATS pflegt KEINE Vorlagen - das bleibt bei HATG. Hier geht es nur darum,
// ein Stilziel im Theme anzulegen oder wegzunehmen, damit eigenes CSS einen
// Platz hat.
//
// Ein "-yaml"-Feld verdeckt sein einfaches Feld vollstaendig: Liegt
// uix-<typ>-yaml im Theme, wird uix-<typ> nie mehr gelesen. Deshalb bietet
// HATS hier bewusst nur die einfache Form an.
export const UIX_ZIELE = [
  { id: "card", de: "Karten (ha-card)", en: "Cards (ha-card)" },
  { id: "root", de: "Grundger\u00fcst (Dashboard-Wurzel)", en: "Dashboard root" },
  { id: "view", de: "Ansicht", en: "View" },
  { id: "view-background", de: "Ansichts-Hintergrund", en: "View background" },
  { id: "row", de: "Zeilen in Entities-Karten", en: "Rows in entities cards" },
  { id: "badge", de: "Badges", en: "Badges" },
  { id: "sidebar", de: "Seitenleiste", en: "Sidebar" },
  { id: "more-info", de: "Info-Dialog", en: "More-info dialog" },
  { id: "dialog", de: "Dialoge", en: "Dialogs" },
  { id: "drawer", de: "App Drawer", en: "App drawer" },
  { id: "glance", de: "Glance-Karten", en: "Glance cards" },
  { id: "heading-badge", de: "\u00dcberschriften-Badges", en: "Heading badges" },
  { id: "assist-chip", de: "Assist-Chips", en: "Assist chips" },
  { id: "element", de: "Picture-Elements", en: "Picture elements" },
  { id: "entity-marker", de: "Entity-Marker auf Karten", en: "Entity markers on maps" },
  { id: "config", de: "Einstellungsseiten", en: "Settings pages" },
  { id: "panel-custom", de: "Eigene Panels", en: "Custom panels" },
  { id: "top-app-bar-fixed", de: "Kopfleiste", en: "Top app bar" },
  { id: "toast", de: "Toast-Meldungen", en: "Toast messages" },
  { id: "grid-section", de: "Grid-Abschnitte", en: "Grid sections" },
  { id: "calendar", de: "Kalender", en: "Calendar" },
  { id: "todo", de: "To-do-Listen", en: "To-do lists" },
  { id: "history", de: "Verlauf", en: "History" },
  { id: "state-history-charts", de: "Verlaufs-Diagramme", en: "History charts" },
  { id: "persistent-notification-item", de: "Benachrichtigungen", en: "Notifications" },
  { id: "app", de: "App-Seite", en: "App page" },
  { id: "profile", de: "Profilseite", en: "Profile page" },
  { id: "section-background", de: "Abschnitts-Hintergrund (nur per Abschnitt)", en: "Section background (per section only)" },
];

export const UIX_ANZAHL = UIX_ZIELE.length;
