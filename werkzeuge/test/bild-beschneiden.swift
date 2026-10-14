// Beschneidet ein Bild auf einen Ausschnitt - in ANTEILEN, nicht in Pixeln.
//
//     swift werkzeuge/test/bild-beschneiden.swift <datei> <x> <y> <breite> <hoehe>
//     swift werkzeuge/test/bild-beschneiden.swift bild.jpg 0 0 0.62 0.62
//
// Warum eigens dafuer ein Programm:
//
// 1. sips ignoriert --cropOffset. "sips -c 710 1000" schneidet IMMER aus der
//    Mitte und rahmt schwarz, wenn der Ausschnitt groesser ist als das Bild.
//    Am 14.10.2026 damit drei Vergleichsbilder verdorben - und die Originale
//    waren schon ueberschrieben.
// 2. ImageMagick, PIL und die Quartz-Bindings sind auf diesem Rechner nicht da.
//    Swift ist da, und AppKit kann es ohne Zutat.
//
// ANTEILE statt Pixel, weil die Screenshots des eingebauten Browsers in
// hoeherer Aufloesung ankommen als die gemeldete Bildgroesse: Das Ergebnis
// meldet 800 x 568, die Datei hat ein Vielfaches davon. Wer in Pixeln
// rechnet, rechnet am falschen Bild.
//
// Geschrieben wird eine JPEG-Datei an dieselbe Stelle.

import AppKit

let argumente = CommandLine.arguments
guard argumente.count == 6,
      let x = Double(argumente[2]), let y = Double(argumente[3]),
      let b = Double(argumente[4]), let h = Double(argumente[5]) else {
    FileHandle.standardError.write("Aufruf: bild-beschneiden.swift <datei> <x> <y> <breite> <hoehe>  (Anteile 0 bis 1)\n".data(using: .utf8)!)
    exit(1)
}
let pfad = argumente[1]

guard let bild = NSImage(contentsOfFile: pfad),
      let quelle = bild.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    FileHandle.standardError.write("Nicht lesbar: \(pfad)\n".data(using: .utf8)!)
    exit(1)
}

let breite = CGFloat(quelle.width), hoehe = CGFloat(quelle.height)
let fenster = CGRect(x: CGFloat(x) * breite, y: CGFloat(y) * hoehe,
                     width: CGFloat(b) * breite, height: CGFloat(h) * hoehe)
    .intersection(CGRect(x: 0, y: 0, width: breite, height: hoehe))

guard !fenster.isEmpty, let aus = quelle.cropping(to: fenster) else {
    FileHandle.standardError.write("Der Ausschnitt liegt ausserhalb des Bildes.\n".data(using: .utf8)!)
    exit(1)
}

let ziel = NSBitmapImageRep(cgImage: aus)
guard let daten = ziel.representation(using: .jpeg, properties: [.compressionFactor: 0.92]) else {
    FileHandle.standardError.write("Nicht zu schreiben.\n".data(using: .utf8)!)
    exit(1)
}
try daten.write(to: URL(fileURLWithPath: pfad))
print("\(pfad): \(quelle.width) x \(quelle.height)  ->  \(aus.width) x \(aus.height)")
