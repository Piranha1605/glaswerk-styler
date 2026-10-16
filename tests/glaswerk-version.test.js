// Die Versionsnummer steht an vier Stellen und muss ueberall gleich sein.
//
// In HATG war das vier Stellen, und es ist mehrfach auseinandergelaufen. Beson-
// ders tueckisch: HACS liefert dann die neue Version mit altem Inhalt aus.
//
// Dieser Test prueft ausserdem sich selbst: Ein Lauf mit null Pruefungen gilt
// nicht als bestanden. In HATG hat sich so eine Testdatei einmal selbst
// stillgelegt, ohne rot zu werden.

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const wurzel = path.join(__dirname, "..");
let geprueft = 0;

function pruefe(was, fn) {
  fn();
  geprueft++;
  console.log("ok", was);
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(wurzel, "custom_components/glaswerk/manifest.json"), "utf8")
);
const constPy = fs.readFileSync(path.join(wurzel, "custom_components/glaswerk/const.py"), "utf8");
const panel = fs.readFileSync(
  path.join(wurzel, "custom_components/glaswerk/www/glaswerk-panel.js"),
  "utf8"
);

const version = manifest.version;

pruefe("manifest.json traegt eine Version im erwarteten Format", () => {
  assert.match(version, /^\d+\.\d+\.\d+(b\d+)?$/, `unerwartet: ${version}`);
});

pruefe("const.py VERSION stimmt mit dem Manifest", () => {
  const m = /^VERSION\s*=\s*"([^"]+)"/m.exec(constPy);
  assert.ok(m, "VERSION in const.py nicht gefunden");
  assert.strictEqual(m[1], version);
});

pruefe("der Cache-Buster in FRONTEND_MODULE stimmt mit dem Manifest", () => {
  const m = /^FRONTEND_MODULE\s*=\s*"[^"]*\?v=([^"]+)"/m.exec(constPy);
  assert.ok(m, "FRONTEND_MODULE in const.py nicht gefunden");
  assert.strictEqual(m[1], version);
});

pruefe("GLASWERK_VERSION im Panel stimmt mit dem Manifest", () => {
  const m = /^const GLASWERK_VERSION\s*=\s*"([^"]+)"/m.exec(panel);
  assert.ok(m, "GLASWERK_VERSION im Panel nicht gefunden");
  assert.strictEqual(m[1], version);
});

pruefe("die Domain ist nicht hatg", () => {
  assert.notStrictEqual(manifest.domain, "hatg", "beide Integrationen brauchen eigene Domains");
  assert.match(manifest.domain, /^[a-z][a-z0-9_]*$/);
  assert.ok(
    new RegExp(`^DOMAIN\\s*=\\s*"${manifest.domain}"`, "m").test(constPy),
    "DOMAIN in const.py weicht vom Manifest ab"
  );
});

// Gegenprobe: Ein Test ohne Pruefungen sagt nichts aus.
assert.ok(geprueft >= 5, `nur ${geprueft} Pruefungen gelaufen - der Test prueft nichts`);
console.log(`\n${geprueft} Pruefungen, Version ${version}`);
