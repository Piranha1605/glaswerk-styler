# Werkzeuge

```bash
pruefen.sh                     alles ohne Instanz: Syntax, Tests, Versionen
einspielen-test.sh             auf die Testmaschine am Mac  <- der Normalfall
test-reload.sh                 Integration dort neu laden
einspielen.sh                  auf die Instanz im Heimnetz (nur wenn noetig)
```

---

## Der Arbeitsplatz ist die Testmaschine

**Seit dem 13.10.2026, auf Ansage.** Eine QEMU-Maschine auf dem Mac mit
Home Assistant OS 18.3 / HA 2026.10.1, Oberflaeche unter
**http://localhost:8123**, Dateien unter
`/Users/enricofischer/Projekte/haos-test/`.

Der Unterschied ist nicht Bequemlichkeit, sondern dass **niemand mehr etwas
tippen muss**: Die serielle Konsole der Maschine haengt an einem Socket, und
`konsole.py` schickt Befehle direkt hinein.

```bash
cd /Users/enricofischer/Projekte/ha-theme-studio
werkzeuge/einspielen-test.sh        # Dateien rein, mit byteweiser Gegenprobe
werkzeuge/test-reload.sh            # Integration neu laden (JS)
werkzeuge/test-reload.sh --neustart # ganz neu starten (Python)
```

**Die Maschine erreicht den Mac unter `10.0.2.2`** — darueber holt sie sich
die Dateien, ohne dass etwas durchs Heimnetz muss. Ein Dateiserver auf Port
8778 wird gestartet, falls keiner laeuft; ein laufender wird **behalten**.

**Demo-Geraete sind an** (`demo:` in der configuration.yaml): Lichter mit
Farbe, Luefter, Cover, Klima, Media Player, Schloss. Auf der Testmaschine darf
geschaltet werden — anders als im Haus, wo nur Zuchtbecken und Terrarium frei
sind. Damit lassen sich Zustaende wirklich durchprobieren statt abzuwarten,
bis zufaellig einer eintritt.

### Die Fallen der Maschine

**Die serielle Konsole schneidet eine zu lange Zeile ab, ohne es zu melden.**
Am 13.10.2026 mit 19 Dateien in einem Befehl gemessen: `curl: (2) no URL
specified`, und sieben Dateien fehlten. Der Fehler sieht aus wie ein
curl-Problem und ist ein Laengenproblem. `einspielen-test.sh` geht deshalb in
Bloecken zu drei Dateien.

**Keine Semikolons, keine Schleifen, nur `&&`** — gilt hier wie im Terminal des
Studio Code Server.

**Der Reload bleibt noetig.** `/hats_static` traegt kein `Cache-Control`, und
dann darf ein Browser heuristisch cachen. Erst eine neue Pruefsumme in der
Adresse bringt den neuen Stand durch, und die wird nur beim Setup gerechnet.
Fuer Python reicht ein Reload nicht — er ruft `async_unload_entry` und
`async_setup_entry` auf demselben, schon importierten Modul auf.

---

## Die Instanz im Heimnetz

**Nur noch, wenn wirklich dort gemessen werden muss.** Was sie gekostet hat,
bevor der Umzug kam — jede Zeile ein verlorener Nachmittag:

- Jeder Deploy brauchte einen Menschen, der eine Zeile in den Terminal des
  Studio Code Server tippt.
- Die Sync-Schleife umging das, fiel aber aus, ohne es zu sagen. Gemerkt hat
  man es an einer Messung, die nicht passte.
- `einspielen.sh` schoss mit `pkill -f "http.server"` den Dateiserver ab, von
  dem die Sync-Schleife lebte — es zerstoerte also genau das, was es brauchte.
  (Behoben; es erkennt einen laufenden Server jetzt.)
- Ein `fetch()` vom Browser ins LAN wird blockiert, und die Meldung
  (`TypeError: Failed to fetch`) sieht nach einem Server-Problem aus.
- Ein Fehlgriff trifft das Dashboard des Hauses. Am 13.10.2026 stand die
  Musterseite serverseitig auf `{"views":[]}`.

Wenn es doch sein muss, steht der Weg in `einspielen.sh` und in der Historie
dieser Datei.


## Zuerst: die Schleife starten, dann arbeiten

**Ohne das kostet jede Aenderung einen Browser-Umweg mit Tipperei im Terminal.**
Am 13.10.2026 so eingerichtet und gemessen: eine lokale Aenderung liegt nach
**neun Sekunden** auf der Instanz.

Zwei Dinge muessen laufen:

```bash
# 1. Auf dem Mac, einmal am Tag - liefert das Projekt ins LAN
cd /Users/enricofischer/Projekte/ha-theme-studio && python3 -m http.server 8778 --bind 0.0.0.0
```

```
2. Im Terminal des Studio Code Server, einmal am Tag, EINE Zeile:

curl -sSf -o /config/sync-hats.sh http://192.168.178.47:8778/werkzeuge/sync-instanz.sh && chmod +x /config/sync-hats.sh && nohup /config/sync-hats.sh 192.168.178.47 > /config/sync-hats.log 2>&1 &
```

Danach holt die Instanz alle drei Sekunden, was sich geaendert hat. Die Liste
der Dateien kommt aus `werkzeuge/sync-dateien.txt` und wird **jede Runde neu
geholt** - eine neue Datei dort eingetragen wirkt sofort, ohne Neustart der
Schleife.

**Der Reload des Konfigurationseintrags bleibt noetig** - am 13.10.2026
nachgemessen, nachdem ich das Gegenteil angenommen hatte. `/hats_static` ist
zwar mit `cache_headers=False` registriert und die Antwort traegt kein
`Cache-Control`, nur ETag und Last-Modified. Ohne `Cache-Control` darf ein
Browser aber **heuristisch** cachen, und Chrome tut das: Die Datei lag
byteweise neu auf der Instanz, `fetch(..., {cache:'reload'})` holte sie auch
frisch - und die Seite zeigte nach zwei vollen Reloads weiter den alten Stand.
Erst als die **Pruefsumme in der Adresse** sich aenderte, kam der neue Stand an.

```js
const hass = document.querySelector('home-assistant').hass;
await hass.callService('homeassistant', 'reload_config_entry',
  { entry_id: '01M4R20W5WM5A4985E4ZW8P9NT' });
// danach: location.reload()
```

Die entry_id holt man sich mit
`await hass.connection.sendMessagePromise({type:'config_entries/get', domain:'hats'})`.
Fuer jede Aenderung an Python reicht das nicht - dann `homeassistant.restart`.

Pruefen, ob die Schleife laeuft (vom Mac aus, ohne Terminal):

```bash
echo "// probe $(date +%s)" >> custom_components/hats/www/uix.js
sleep 9 && curl -s http://192.168.178.31/hats_static/uix.js | tail -1
```

Die Panel-Adresse ist **`http://192.168.178.31/hats`** - nicht `/hats-studio`,
das gibt 404.

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

### Die Wahl von Theme und Modus liegt in den Nutzerdaten, Schlüssel `theme`

Hier stand bis zum 13.10.2026, sie lasse sich von außen nicht umschalten. Das
war mit dem falschen Schlüssel gemessen (`selectedTheme`, den Home Assistant
nie liest). Der richtige:

```js
await hass.connection.sendMessagePromise({
  type: "frontend/set_user_data", key: "theme",
  value: { theme: "liquid_glass", dark: true },   // dark weglassen = automatisch
});
```

Home Assistant abonniert den Schlüssel; ein offener Browser folgt ohne
Neuladen. `frontend.set_theme` setzt dagegen nur die globale Zuordnung, und in
den `localStorage` schreibt HA seinen aufgelösten Stand zurück.

**Das gilt für jedes Gerät des Nutzers.** Auf der Testmaschine ist das egal,
an der Instanz im Heimnetz nicht — dort schaltet weiter der Nutzer selbst im
Profil um. Und danach zurückstellen, nicht vergessen: vorher lesen mit
`frontend/get_user_data`.

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
