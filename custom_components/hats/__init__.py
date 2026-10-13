"""HATS - Home Assistant Theme Studio.

Registriert das Panel und die drei Websocket-Befehle, die HATS braucht:
Themes auflisten, eine Theme-Datei lesen, eine Theme-Datei schreiben.

Dazu die Steuerkarte fuer Dashboards (hats-control-card.js). Sie wird als
zusaetzliches Modul der Oberflaeche angemeldet und steht damit auf jedem
Dashboard bereit, ohne dass jemand eine Ressource eintragen muss.

Mehr ist absichtlich nicht drin. Vorlagen, Marker und Shadow-DOM-Pfade bleiben
bei HATG - HATS schreibt gewoehnliche Theme-Felder, und die erben durch jede
Shadow-Grenze. Siehe CLAUDE.md.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import logging
import re
from pathlib import Path

import voluptuous as vol
import yaml as yaml_lib

from homeassistant.components import frontend, panel_custom, websocket_api
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import (
    BILDER_LOCAL_PATH,
    BILDER_SUBDIR,
    CARD_FILE,
    DOMAIN,
    FRONTEND_MODULE,
    PANEL_ICON,
    PANEL_TAG,
    PANEL_TITLE,
    PANEL_URL,
    STATIC_PATH,
    THEMES_SUBDIR,
    VERSION,
    WWW_SUBDIR,
)

_LOGGER = logging.getLogger(__name__)

_WS_REGISTERED_FLAG = f"{DOMAIN}_ws_registered"
_KARTEN_URL = f"{DOMAIN}_karten_url"
_SAFE_NAME_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")

# Woran eine von HATS gebaute Datei zu erkennen ist. Dieselbe Zeichenfolge
# schreibt schreibeTheme() in den Kopf - stimmen beide nicht ueberein, findet
# die Oberflaeche ihre eigenen Dateien nicht mehr. Ein Test vergleicht sie.
HATS_MARKE = "# Erzeugt mit HATS "

# Nur Bilder, und nur mit harmlosem Namen. Beides zusammen schliesst einen
# Pfadausbruch aus: Path(...).name wirft jedes Verzeichnis weg, die
# Endungsliste jede ausfuehrbare Datei.
_BILD_ENDUNGEN = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"}
_BILD_NAME_RE = re.compile(r"[^A-Za-z0-9._-]+")
_BILD_MAX_BYTES = 12 * 1024 * 1024
KOPF_BYTES = 512


def _bilder_ordner(hass: HomeAssistant) -> Path:
    return Path(hass.config.path(WWW_SUBDIR, BILDER_SUBDIR))


def _bild_url(name: str) -> str:
    return f"{BILDER_LOCAL_PATH}/{name}"


def _bild_name_saeubern(roh: str) -> str | None:
    """Macht aus einem hochgeladenen Namen einen, der im Ordner stehen darf."""
    if not roh:
        return None
    basis = Path(roh).name                      # wirft jedes Verzeichnis weg
    endung = Path(basis).suffix.lower()
    if endung not in _BILD_ENDUNGEN:
        return None
    stamm = basis[: -len(endung)] if endung else basis
    stamm = _BILD_NAME_RE.sub("_", stamm).strip("._") or "bild"
    return f"{stamm}{endung}"


def _bild_pruefsumme(pfad: Path) -> str:
    h = hashlib.sha256()
    with pfad.open("rb") as f:
        for block in iter(lambda: f.read(131072), b""):
            h.update(block)
    return h.hexdigest()


def _bild_mit_inhalt(ordner: Path, summe: str) -> Path | None:
    """Liegt dasselbe Bild schon da? Dann nicht ein zweites Mal ablegen."""
    if not ordner.exists():
        return None
    for eintrag in sorted(ordner.iterdir()):
        if not eintrag.is_file() or eintrag.suffix.lower() not in _BILD_ENDUNGEN:
            continue
        try:
            if _bild_pruefsumme(eintrag) == summe:
                return eintrag
        except OSError:
            continue
    return None


def _freier_bildpfad(ordner: Path, name: str) -> Path:
    """Bei Namensgleichheit -2, -3 ... anhaengen, statt zu ueberschreiben."""
    ziel = ordner / name
    if not ziel.exists():
        return ziel
    stamm, endung = Path(name).stem, Path(name).suffix
    n = 2
    while True:
        ziel = ordner / f"{stamm}-{n}{endung}"
        if not ziel.exists():
            return ziel
        n += 1


def _ist_sicherer_name(name: str) -> bool:
    """Ein Theme-Name darf keinen Pfad enthalten."""
    return bool(_SAFE_NAME_RE.match(name))


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/list_themes"})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_list_themes(hass: HomeAssistant, connection, msg) -> None:
    """Die Dateien in config/themes auflisten, mit Herkunft.

    Ob eine Datei von HATS stammt, steht in ihrer ersten Zeile - schreibeTheme
    setzt dort "# Erzeugt mit HATS <version> am <datum>". Geprueft wird nur der
    Dateianfang: Eine Theme kann einige hundert Zeilen haben, und fuer die
    Antwort brauchen wir nur den Kopf.

    Fremde Dateien werden MITGELIEFERT, nicht weggelassen - die Oberflaeche
    zeigt sie ausgegraut mit Grund. Wer seine Datei in der Liste nicht findet,
    sucht sonst den Fehler bei sich.
    """
    themes_dir = Path(hass.config.path(THEMES_SUBDIR))

    def _lies() -> list[dict]:
        if not themes_dir.is_dir():
            return []
        aus = []
        for p in sorted(themes_dir.glob("*.yaml")):
            if not p.is_file():
                continue
            try:
                kopf = p.open("r", encoding="utf-8").read(KOPF_BYTES)
            except OSError:
                continue
            marke = next(
                (z for z in kopf.splitlines() if z.startswith(HATS_MARKE)), None
            )
            aus.append({
                "name": p.name,
                "hats": marke is not None,
                "kopf": marke[2:] if marke else None,
                "bytes": p.stat().st_size,
            })
        return aus

    dateien = await hass.async_add_executor_job(_lies)
    connection.send_result(msg["id"], {
        "dateien": dateien,
        # Die alte Form bleibt, damit nichts bricht, was sie schon liest.
        "files": [d["name"] for d in dateien],
    })


@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/load_theme_file", vol.Required("filename"): str}
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_load_theme_file(hass: HomeAssistant, connection, msg) -> None:
    """Eine Theme-Datei im Klartext zurueckgeben."""
    name = msg["filename"]
    if not name.endswith(".yaml") or not _ist_sicherer_name(name[:-5]):
        connection.send_error(msg["id"], "invalid_name", "Ungueltiger Dateiname.")
        return

    pfad = Path(hass.config.path(THEMES_SUBDIR)) / name

    def _lies() -> str | None:
        try:
            return pfad.read_text(encoding="utf-8")
        except OSError:
            return None

    inhalt = await hass.async_add_executor_job(_lies)
    if inhalt is None:
        connection.send_error(msg["id"], "read_failed", f"{name} nicht lesbar.")
        return
    connection.send_result(msg["id"], {"content": inhalt})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/save_theme",
        vol.Required("name"): str,
        vol.Required("yaml"): str,
        vol.Optional("overwrite", default=False): bool,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_save_theme(hass: HomeAssistant, connection, msg) -> None:
    """Eine Theme-Datei schreiben - nach Pruefung mit PyYAML.

    Geprueft wird mit demselben Parser, den Home Assistant beim Start benutzt.
    Ein eigener Parser liest manches klaglos zurueck, was HA in den
    Wiederherstellungsmodus schickt - siehe CLAUDE.md, Abschnitt Backslash.
    """
    name = msg["name"]
    if not _ist_sicherer_name(name):
        connection.send_error(msg["id"], "invalid_name", "Ungueltiger Theme-Name.")
        return

    try:
        yaml_lib.safe_load(msg["yaml"])
    except yaml_lib.YAMLError as err:
        connection.send_error(msg["id"], "invalid_yaml", f"YAML ist ungueltig: {err}")
        return

    themes_dir = Path(hass.config.path(THEMES_SUBDIR))
    pfad = themes_dir / f"{name}.yaml"

    def _schreibe() -> str | None:
        try:
            themes_dir.mkdir(parents=True, exist_ok=True)
            if pfad.exists() and not msg["overwrite"]:
                return "exists"
            pfad.write_text(msg["yaml"], encoding="utf-8")
        except OSError as err:
            return f"write_failed: {err}"
        return None

    fehler = await hass.async_add_executor_job(_schreibe)
    if fehler == "exists":
        connection.send_error(msg["id"], "exists", f"{name}.yaml gibt es schon.")
        return
    if fehler:
        connection.send_error(msg["id"], "write_failed", fehler)
        return

    connection.send_result(msg["id"], {"saved": True, "path": f"/config/themes/{name}.yaml"})


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/list_images"})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_list_images(hass: HomeAssistant, connection, msg) -> None:
    """Die Bilder in config/www/hats auflisten."""
    ordner = _bilder_ordner(hass)

    def _lies() -> list[dict]:
        if not ordner.is_dir():
            return []
        aus = []
        for p in sorted(ordner.iterdir()):
            if not p.is_file() or p.suffix.lower() not in _BILD_ENDUNGEN:
                continue
            aus.append({"name": p.name, "url": _bild_url(p.name), "bytes": p.stat().st_size})
        return aus

    connection.send_result(msg["id"], {"bilder": await hass.async_add_executor_job(_lies)})


@websocket_api.websocket_command({
    vol.Required("type"): f"{DOMAIN}/upload_image",
    vol.Required("filename"): str,
    vol.Required("data"): str,
})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_upload_image(hass: HomeAssistant, connection, msg) -> None:
    """Ein Bild nach config/www/hats legen."""
    name = _bild_name_saeubern(msg["filename"])
    if name is None:
        connection.send_error(msg["id"], "invalid_name",
                              "Nur Bilder (jpg, png, webp, gif, svg, avif).")
        return
    try:
        roh = base64.b64decode(msg["data"], validate=True)
    except (binascii.Error, ValueError) as err:
        connection.send_error(msg["id"], "invalid_data", f"Bild nicht lesbar: {err}")
        return
    if not roh:
        connection.send_error(msg["id"], "invalid_data", "Die Datei ist leer.")
        return
    if len(roh) > _BILD_MAX_BYTES:
        connection.send_error(msg["id"], "too_large",
                              f"Groesser als {_BILD_MAX_BYTES // 1024 // 1024} MB.")
        return

    ordner = _bilder_ordner(hass)

    def _schreibe() -> tuple[str, bool]:
        ordner.mkdir(parents=True, exist_ok=True)
        # Inhaltsgleiche Bilder nicht doppelt ablegen. Wer dasselbe Bild zweimal
        # waehlt, soll nicht zwei Dateien bekommen - und die Theme soll auf
        # dieselbe Adresse zeigen.
        summe = hashlib.sha256(roh).hexdigest()
        schon_da = _bild_mit_inhalt(ordner, summe)
        if schon_da is not None:
            return schon_da.name, True
        ziel = _freier_bildpfad(ordner, name)
        ziel.write_bytes(roh)
        return ziel.name, False

    try:
        endname, war_da = await hass.async_add_executor_job(_schreibe)
    except OSError as err:
        connection.send_error(msg["id"], "write_failed", f"Nicht gespeichert: {err}")
        return

    connection.send_result(msg["id"], {
        "name": endname, "url": _bild_url(endname), "doppelt": war_da,
    })


@websocket_api.websocket_command({
    vol.Required("type"): f"{DOMAIN}/delete_image",
    vol.Required("name"): str,
})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_delete_image(hass: HomeAssistant, connection, msg) -> None:
    """Ein Bild loeschen - nur aus diesem einen Ordner."""
    name = _bild_name_saeubern(msg["name"])
    if name is None or name != Path(msg["name"]).name:
        connection.send_error(msg["id"], "invalid_name", "Ungueltiger Dateiname.")
        return
    pfad = _bilder_ordner(hass) / name

    def _loesche() -> str | None:
        if not pfad.is_file():
            return "not_found"
        try:
            pfad.unlink()
        except OSError as err:
            return f"delete_failed: {err}"
        return None

    fehler = await hass.async_add_executor_job(_loesche)
    if fehler == "not_found":
        connection.send_error(msg["id"], "not_found", f"{name} gibt es nicht.")
        return
    if fehler:
        connection.send_error(msg["id"], "delete_failed", fehler)
        return
    connection.send_result(msg["id"], {"deleted": True, "name": name})


def _registriere_websocket(hass: HomeAssistant) -> None:
    """Die Befehle anmelden - bei jedem Setup neu.

    Frueher stand hier eine Sperre, die beim zweiten Mal heraussprang. Gedacht
    war sie gegen doppelte Anmeldungen bei mehreren Eintraegen; sie hatte aber
    eine Folge, die beim Entwickeln teuer ist: Ein Reload der Integration liess
    die ALTE Funktion registriert. Wer einen Websocket-Befehl aendert, bekam
    nach dem Reload weiter die alte Antwort - ohne Fehlermeldung, weil nichts
    kaputt war. Am 12.10.2026 eine halbe Stunde damit verloren.

    Mehrfaches Anmelden ist unschaedlich: async_register_command schreibt in
    ein Dict und ueberschreibt den Eintrag einfach.
    """
    hass.data[_WS_REGISTERED_FLAG] = True
    websocket_api.async_register_command(hass, ws_list_themes)
    websocket_api.async_register_command(hass, ws_load_theme_file)
    websocket_api.async_register_command(hass, ws_save_theme)
    websocket_api.async_register_command(hass, ws_list_images)
    websocket_api.async_register_command(hass, ws_upload_image)
    websocket_api.async_register_command(hass, ws_delete_image)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Panel registrieren und Websocket anmelden."""
    www_path = Path(__file__).parent / "www"

    # Home Assistant registriert /local NUR, wenn config/www beim Start schon
    # da war. Legen wir den Ordner gerade erst an, bleibt /local bis zum
    # naechsten Neustart tot - und dann sucht man den Fehler in der Theme,
    # obwohl die Adresse stimmt. Deshalb steht es im Log.
    def _bilderordner_anlegen() -> bool:
        eltern = Path(hass.config.path(WWW_SUBDIR))
        www_fehlte = not eltern.is_dir()
        _bilder_ordner(hass).mkdir(parents=True, exist_ok=True)
        return www_fehlte

    if await hass.async_add_executor_job(_bilderordner_anlegen):
        _LOGGER.warning(
            "config/www wurde gerade erst angelegt. Home Assistant liefert %s "
            "erst nach einem Neustart aus - bis dahin bleiben Hintergrundbilder leer.",
            BILDER_LOCAL_PATH,
        )

    # Der Cache-Buster haengt am Inhalt, nicht nur an der Versionsnummer.
    # Home Assistant liefert /hats_static mit max-age=2678400 aus: Wer die
    # Panel-Datei innerhalb derselben Version austauscht - beim Entwickeln die
    # Regel, nicht die Ausnahme -, bekommt im Browser 31 Tage lang den alten
    # Stand, obwohl die Kopfzeile die neue Version zeigt. Faellt das Lesen aus,
    # bleibt es bei der Version.
    def _mit_pruefsumme(datei: str, adresse: str) -> str:
        try:
            kurz = hashlib.md5((www_path / datei).read_bytes()).hexdigest()[:8]
        except OSError:
            return adresse
        return f"{adresse}.{kurz}"

    module_url = await hass.async_add_executor_job(
        _mit_pruefsumme, "hats-panel.js", FRONTEND_MODULE
    )
    karten_url = await hass.async_add_executor_job(
        _mit_pruefsumme, CARD_FILE, f"{STATIC_PATH}/{CARD_FILE}?v={VERSION}"
    )

    # Dritter Parameter ist cache_headers. Bewusst False, solange entwickelt
    # wird: Mit True liefert HA die Datei mit max-age=2678400 aus, also 31
    # Tage. Der Cache-Buster oben haengt zwar am Inhalt, aber er wird nur
    # HIER gerechnet - wer die Datei austauscht, ohne die Integration neu zu
    # laden, bekommt im Browser wochenlang den alten Stand bei scheinbar
    # richtiger Adresse. Genau das ist am 12.10.2026 passiert. Vor dem ersten
    # Release wieder auf True.
    await hass.http.async_register_static_paths(
        [StaticPathConfig(STATIC_PATH, str(www_path), False)]
    )

    await panel_custom.async_register_panel(
        hass,
        webcomponent_name=PANEL_TAG,
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        frontend_url_path=PANEL_URL,
        module_url=module_url,
        require_admin=True,
    )

    # Die Steuerkarte als zusaetzliches Modul der Oberflaeche - NICHT als
    # Lovelace-Ressource. Eine Ressource stuende in der Konfiguration des
    # Nutzers und bliebe dort liegen, wenn HATS wieder geht; das Modul hier
    # verschwindet mit dem Eintrag. Dieselbe Regel wie bei den Theme-Feldern:
    # nichts hinterlassen, was spaeter ins Leere zeigt.
    #
    # Die Adresse wird gemerkt, weil async_unload_entry genau DIESE wieder
    # abmelden muss: Nach einem Reload mit geaenderter Datei ist die Pruefsumme
    # eine andere, und eine neu gerechnete Adresse traefe die alte nicht.
    frontend.add_extra_js_url(hass, karten_url)
    hass.data[_KARTEN_URL] = karten_url

    _registriere_websocket(hass)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Panel und Steuerkarte wieder abmelden."""
    frontend.async_remove_panel(hass, PANEL_URL)
    karten_url = hass.data.pop(_KARTEN_URL, None)
    if karten_url:
        frontend.remove_extra_js_url(hass, karten_url)
    return True
