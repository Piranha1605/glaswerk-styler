// Liest die Systemfarben von macOS aus - erste Hand, nicht aus der
// Dokumentation abgeschrieben.
//
//     swift werkzeuge/test/macos-farben.swift
//
// Warum ueberhaupt: Die bekannten Werte (systemRed #ff3b30, systemBlue
// #007aff) stammen aus aelteren Versionen. Am 14.10.2026 an macOS 26.5.2
// gemessen, und mehrere stimmen nicht mehr:
//
//     systemRed     #ff3b30  ->  #ff383c
//     systemBlue    #007aff  ->  #0088ff
//     systemOrange  #ff9500  ->  #ff8d28
//     systemPurple  #af52de  ->  #cb30e0
//     systemIndigo  #5856d6  ->  #6155f5
//
// controlAccentColor ist dagegen in beiden Modi #007aff geblieben - das ist
// die Farbe, die der Nutzer in den Einstellungen waehlt, und sie folgt nicht
// der Systempalette. Bei "Multicolor" (Vorgabe) steht sie auf Blau.
//
// performAsCurrentDrawingAppearance ist noetig, weil die Systemfarben
// dynamisch sind: Ohne gesetztes Erscheinungsbild liefert dieselbe NSColor
// je nach Systemeinstellung einen anderen Wert.
//
// Nach einem macOS-Update neu laufen lassen und PALETTEN in baukasten.js
// dagegenhalten.

import AppKit

func hex(_ c: NSColor?) -> String {
    guard let s = c?.usingColorSpace(.sRGB) else { return "-" }
    let r = Int((s.redComponent   * 255).rounded())
    let g = Int((s.greenComponent * 255).rounded())
    let b = Int((s.blueComponent  * 255).rounded())
    let a = s.alphaComponent
    let h = String(format: "#%02x%02x%02x", r, g, b)
    return a < 0.999 ? "\(h) a=\(String(format: "%.3f", a))" : h
}

let system: [(String, NSColor)] = [
    ("red", .systemRed), ("orange", .systemOrange), ("yellow", .systemYellow),
    ("green", .systemGreen), ("mint", .systemMint), ("teal", .systemTeal),
    ("cyan", .systemCyan), ("blue", .systemBlue), ("indigo", .systemIndigo),
    ("purple", .systemPurple), ("pink", .systemPink), ("brown", .systemBrown),
    ("gray", .systemGray),
]
let semantic: [(String, NSColor)] = [
    ("controlAccent", .controlAccentColor),
    ("windowBackground", .windowBackgroundColor),
    ("underPageBackground", .underPageBackgroundColor),
    ("controlBackground", .controlBackgroundColor),
    ("textBackground", .textBackgroundColor),
    ("control", .controlColor),
    ("label", .labelColor), ("secondaryLabel", .secondaryLabelColor),
    ("tertiaryLabel", .tertiaryLabelColor), ("quaternaryLabel", .quaternaryLabelColor),
    ("placeholderText", .placeholderTextColor),
    ("separator", .separatorColor), ("grid", .gridColor),
    ("selectedContentBackground", .selectedContentBackgroundColor),
    ("unemphasizedSelectedContentBackground", .unemphasizedSelectedContentBackgroundColor),
    ("selectedTextBackground", .selectedTextBackgroundColor),
    ("link", .linkColor), ("shadow", .shadowColor),
    ("disabledControlText", .disabledControlTextColor),
    ("controlText", .controlTextColor), ("selectedControlText", .selectedControlTextColor),
    ("headerText", .headerTextColor), ("highlight", .highlightColor),
]

for (modus, name) in [("hell", NSAppearance.Name.aqua), ("dunkel", .darkAqua)] {
    guard let app = NSAppearance(named: name) else { continue }
    print("=== \(modus) ===")
    app.performAsCurrentDrawingAppearance {
        for (n, c) in system   { print("system.\(n)\t\(hex(c))") }
        for (n, c) in semantic { print("sem.\(n)\t\(hex(c))") }
    }
}
