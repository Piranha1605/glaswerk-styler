# Was ich an der Instanz des Nutzers geaendert habe

Damit es einen Kontextverlust uebersteht und sich zurueckstellen laesst.

## 13.10.2026

**Theme-Wahl im Profil.** Vorher stand dort:

    { "theme": "hats_test", "dark": false }

Gesetzt auf `liquid_glass`, um die neuen Vorlagen an der laufenden Instanz zu
sehen. Zurueckstellen:

```js
const hass = document.querySelector('home-assistant').hass;
await hass.connection.sendMessagePromise({
  type: 'frontend/set_user_data', key: 'selectedTheme',
  value: { theme: 'hats_test', dark: false },
});
```

**Nachtrag vom Abend: Der Schluessel oben ist der falsche.** Home Assistant
liest die Wahl unter `theme`, nicht unter `selectedTheme` (an der Testinstanz
gemessen, siehe CLAUDE.md, Abschnitt Steuerkarte). Was hier geschrieben wurde -
das Setzen wie das Zurueckstellen -, hat an der Theme-Wahl also nie etwas
geaendert. Unter `selectedTheme` liegt seitdem ein Eintrag in den Nutzerdaten,
den niemand liest; er stoert nicht. Angefasst habe ich die Instanz dafuer
nicht noch einmal.

Aktiv war zu dem Zeitpunkt uebrigens `hats_studio`, nicht `hats_test` - die
Profilwahl und das, was wirkt, koennen auseinanderlaufen. Gemessen wird deshalb
immer mit `getComputedStyle`, nie am Theme-Objekt.

**Neue Datei** `/config/themes/liquid_glass.yaml` (30 590 Bytes), erzeugt mit
`werkzeuge/liquid-glass-bauen.mjs`. Sie ueberschreibt nichts.

**Laufende Schleife** `/config/sync-hats.sh` (Log: `/config/sync-hats.log`).
Holt alle drei Sekunden Aenderungen vom Entwicklungsrechner. Beenden mit
`touch /config/sync-hats.stop`. Sie endet ausserdem von allein - nach acht
Stunden oder wenn der Entwicklungsrechner zwanzigmal nicht antwortet.
