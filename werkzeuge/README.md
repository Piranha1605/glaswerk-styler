# Werkzeuge

Zwei Skripte und eine Liste von Fallen. Kein `npm install` nötig.

```bash
werkzeuge/pruefen.sh              # alles ohne Instanz: Syntax, Tests, Versionen
werkzeuge/einspielen.sh           # Dateien auf die Instanz, mit Gegenprobe
werkzeuge/einspielen.sh www/theme.js   # nur eine
```

---

## Die Schleife beim Entwickeln

```
1. ändern
2. werkzeuge/pruefen.sh                  rot = nicht einspielen
3. werkzeuge/einspielen.sh               druckt den Befehl, prüft die Ankunft
4. Befehl in den Terminal des Studio Code Server
5. Integration neu laden                 sonst sieht der Browser die alte Datei
6. im Browser messen, nicht ansehen
```

Schritt 5 ist der, den man vergisst. Dann sucht man den Fehler im Code, und er
liegt im Cache.

---

## Die Fallen, der Reihe nach

### Der Terminal verfremdet ein getipptes `;` zu `\;`

Eine Schleife zerlegt es damit, und die Shell landet in ihrer
Fortsetzungszeile. **Keine Semikolons, keine Schleifen, nur `&&`.**
`einspielen.sh` erzeugt den Befehl deshalb selbst.

**Aus der Fortsetzungszeile kommt man nicht mit Strg-C heraus** — das fängt der
Browser ab, es erreicht die Shell gar nicht. Man gibt ihr das fehlende `done`,
dann läuft der Rest ins Leere und der Prompt ist wieder sauber.

### Die Meldung von code-server fängt den ersten Klick ab

Sie kommt bei jedem Laden der Seite wieder („being accessed in an insecure
context"). Erst „I understand" klicken, **dann** in den Terminal. Sonst geht
der Klick an die Meldung und das Getippte ins Nichts.

Und: Nach jeder Größenänderung des Fensters stimmen die Koordinaten nicht mehr.
Vor dem Klicken einen frischen Screenshot.

### Der Cache-Buster wird nur beim Setup gerechnet

`__init__.py` hängt eine Prüfsumme über `hats-panel.js` an die Adresse. Sie
entsteht in `async_setup_entry` — wer die Datei danach austauscht, bekommt im
Browser weiter die alte, obwohl auf der Platte die neue liegt.

**Ein Reload des Konfigurationseintrags genügt** (seit die Registrierungssperre
weg ist):

```js
hass.callService('homeassistant', 'reload_config_entry', { entry_id: '…' })
```

Nachgemessen am 13.10.2026: `?v=0.2.0b1.6ee47442` → `?v=0.2.0b1.ac6feccc`.

**`config_entries/reload` als Websocket-Befehl gibt es nicht** („Unknown
command"). Nur den Dienst.

### Python-Änderungen brauchen einen Neustart

Ein Reload ruft `async_unload_entry` und `async_setup_entry` auf demselben,
schon importierten Modul auf. Geänderter Python-Code kommt damit **nicht** an.
Dafür `homeassistant.restart`.

### `node --check` reicht nicht

Eine doppelte Deklaration im selben Gültigkeitsbereich — ein `const` mit dem
Namen eines Parameters — kommt damit durch. Erst der Browser wirft dann
`Identifier … has already been declared`, die Datei lädt gar nicht, und das
Panel bleibt eine leere Fläche.

```bash
node --input-type=module --check < custom_components/hats/www/hats-panel.js
```

`pruefen.sh` macht das für alle Dateien, `tests/hats-syntax.test.js` hält es
fest.

---

## Was vom Mac aus geht und was nicht

```
Port 80    offen     HTTP, und /hats_static ist OHNE Anmeldung lesbar
Port 4357  offen     Observer
Port 22    zu        kein SSH
Port 445   zu        kein Samba
/api/      401       braucht einen Token - wird nicht angefasst
```

Deshalb: **schreiben nur über den Terminal, lesen direkt vom Mac.**
`einspielen.sh` nutzt genau das für die Gegenprobe:

```bash
curl -s http://192.168.178.31/hats_static/hats-panel.js | cmp - custom_components/hats/www/hats-panel.js
```

Wenn SSH oder Samba eingerichtet würden, fiele der Terminal-Umweg weg.

---

## Im Browser messen

### Das Panel greifen

```js
const ha = document.querySelector('home-assistant');
const p = ha.shadowRoot.querySelector('home-assistant-main').shadowRoot
  .querySelector('partial-panel-resolver').querySelector('ha-panel-custom')
  .querySelector('hats-panel');
const sr = p.shadowRoot;
```

### Was wirklich gilt

Theme-Werte **nur** über `getComputedStyle` lesen, nie über das Theme-Objekt —
das sagt, was gespeichert ist, nicht was wirkt.

```js
getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim()
```

### Die aktive Theme lässt sich von außen nicht umschalten

Weder `frontend.set_theme` noch `frontend/set_user_data` noch `localStorage`
noch die `prefers-color-scheme`-Emulation greifen durch: HA schreibt seinen
aufgelösten Stand bei jedem Laden zurück. Der einzige Hebel wäre das
`settheme`-Ereignis, und das ist tabu. Für eine Messung im anderen Modus muss
der Nutzer einmal im Profil umschalten.

**Reihenfolge beim Anwenden:** erst `frontend.reload_themes`, dann die Auswahl.
Andersherum kennt HA die Datei noch nicht und fällt auf eine andere zurück.

### Dashboard-Pfade

`/dashboard-home/0` ist **kein** gültiger Ansichtspfad, wenn die Ansichten
eigene Pfade tragen — HA zeigt dann eine leere Seite, und man hält das
Dashboard für kaputt. Die echten Pfade stehen in der Konfiguration:

```js
hui.lovelace.config.views.map(v => v.path)
```

---

## Übersetzungen

Neue Texte gehören **in den `en:`-Block** von `TEXTE`, nicht daneben.
`t()` liest `TEXTE[sprache]`, also nur `.en` — ein Eintrag daneben ist stumm
unerreichbar. In HATG standen so einmal 21 Einträge, und der Test war grün,
weil er im Quelltext suchte statt im Objekt. Geprüft wird deshalb der Block:

```js
const tab = panel.slice(panel.indexOf("const TEXTE = {"));
const en  = tab.slice(tab.indexOf("en: {"), tab.indexOf("\n  },"));
```
