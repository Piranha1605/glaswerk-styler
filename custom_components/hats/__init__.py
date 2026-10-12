"""HATS - Home Assistant Theme Studio.

Registriert das Panel und die drei Websocket-Befehle, die HATS braucht:
Themes auflisten, eine Theme-Datei lesen, eine Theme-Datei schreiben.

Mehr ist absichtlich nicht drin. Vorlagen, Marker und Shadow-DOM-Pfade bleiben
bei HATG - HATS schreibt gewoehnliche Theme-Felder, und die erben durch jede
Shadow-Grenze. Siehe CLAUDE.md.
"""

from __future__ import annotations

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
    DOMAIN,
    FRONTEND_MODULE,
    PANEL_ICON,
    PANEL_TAG,
    PANEL_TITLE,
    PANEL_URL,
    STATIC_PATH,
    THEMES_SUBDIR,
)

_LOGGER = logging.getLogger(__name__)

_WS_REGISTERED_FLAG = f"{DOMAIN}_ws_registered"
_SAFE_NAME_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


def _ist_sicherer_name(name: str) -> bool:
    """Ein Theme-Name darf keinen Pfad enthalten."""
    return bool(_SAFE_NAME_RE.match(name))


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/list_themes"})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_list_themes(hass: HomeAssistant, connection, msg) -> None:
    """Die Dateien in config/themes auflisten."""
    themes_dir = Path(hass.config.path(THEMES_SUBDIR))

    def _lies() -> list[str]:
        if not themes_dir.is_dir():
            return []
        return sorted(p.name for p in themes_dir.glob("*.yaml") if p.is_file())

    connection.send_result(msg["id"], {"files": await hass.async_add_executor_job(_lies)})


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


def _registriere_websocket(hass: HomeAssistant) -> None:
    """Die Befehle nur einmal anmelden, auch bei mehreren Eintraegen."""
    if hass.data.get(_WS_REGISTERED_FLAG):
        return
    hass.data[_WS_REGISTERED_FLAG] = True
    websocket_api.async_register_command(hass, ws_list_themes)
    websocket_api.async_register_command(hass, ws_load_theme_file)
    websocket_api.async_register_command(hass, ws_save_theme)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Panel registrieren und Websocket anmelden."""
    www_path = Path(__file__).parent / "www"

    # Der Cache-Buster haengt am Inhalt, nicht nur an der Versionsnummer.
    # Home Assistant liefert /hats_static mit max-age=2678400 aus: Wer die
    # Panel-Datei innerhalb derselben Version austauscht - beim Entwickeln die
    # Regel, nicht die Ausnahme -, bekommt im Browser 31 Tage lang den alten
    # Stand, obwohl die Kopfzeile die neue Version zeigt. Faellt das Lesen aus,
    # bleibt es bei der Version.
    def _modul_url() -> str:
        datei = www_path / "hats-panel.js"
        try:
            kurz = hashlib.md5(datei.read_bytes()).hexdigest()[:8]
        except OSError:
            return FRONTEND_MODULE
        return f"{FRONTEND_MODULE}.{kurz}"

    module_url = await hass.async_add_executor_job(_modul_url)

    await hass.http.async_register_static_paths(
        [StaticPathConfig(STATIC_PATH, str(www_path), True)]
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

    _registriere_websocket(hass)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Panel wieder abmelden."""
    frontend.async_remove_panel(hass, PANEL_URL)
    return True
