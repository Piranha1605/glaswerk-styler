// Liest die Systemfarben von iOS aus - auf dem Mac, ueber Mac Catalyst.
//
//     SDK=$(xcrun --sdk macosx --show-sdk-path)
//     xcrun swiftc -target arm64-apple-ios17.0-macabi -sdk "$SDK" \
//       -F "$SDK/System/iOSSupport/System/Library/Frameworks" \
//       -I "$SDK/System/iOSSupport/usr/lib/swift" \
//       -L "$SDK/System/iOSSupport/usr/lib/swift" \
//       werkzeuge/test/ios-farben.swift -o /tmp/iosfarben && /tmp/iosfarben
//
// Ohne die drei Pfade findet der Compiler UIKit nicht ("no such module
// 'UIKit'") - es liegt nicht im macOS-SDK, sondern daneben unter iOSSupport.
// Die Command Line Tools reichen, Xcode braucht es nicht.
//
// DAS ERGEBNIS, am 14.10.2026 an macOS 26.5.2 gemessen: Alle dreizehn
// Systemfarben sind Wert fuer Wert dieselben wie unter AppKit. Es gibt also
// keine zweite Apple-Palette, und in Glaswerk gibt es nur das eine Teil "macOS".
//
// Was sich unterscheidet, ist die Graustufenleiter: systemGray2 bis
// systemGray6 gibt es nur unter iOS (hell #aeaeb2 bis #f2f2f7, dunkel #636366
// bis #1c1c1e). Fuer Glaswerk ohne Belang - die Rolle "neutral" ist systemGray,
// und der ist auf beiden #8e8e93.
//
// VORSICHT bei den Hintergruenden: Unter Catalyst liefert systemBackground die
// MAC-Werte (#ffffff / #1e1e1e), nicht die von iOS (dort ist der Dunkelmodus
// schwarz). Die Graustufenleiter ist dagegen echt iOS. Catalyst mischt also -
// wer die Hintergruende braucht, misst sie am Geraet, nicht hier.

import UIKit

func hex(_ c: UIColor, _ stil: UIUserInterfaceStyle) -> String {
    let r = c.resolvedColor(with: UITraitCollection(userInterfaceStyle: stil))
    var rr: CGFloat = 0, gg: CGFloat = 0, bb: CGFloat = 0, aa: CGFloat = 0
    guard r.getRed(&rr, green: &gg, blue: &bb, alpha: &aa) else { return "-" }
    let h = String(format: "#%02x%02x%02x", Int((rr*255).rounded()), Int((gg*255).rounded()), Int((bb*255).rounded()))
    return aa < 0.999 ? "\(h) a=\(String(format: "%.3f", aa))" : h
}

let farben: [(String, UIColor)] = [
    ("red", .systemRed), ("orange", .systemOrange), ("yellow", .systemYellow),
    ("green", .systemGreen), ("mint", .systemMint), ("teal", .systemTeal),
    ("cyan", .systemCyan), ("blue", .systemBlue), ("indigo", .systemIndigo),
    ("purple", .systemPurple), ("pink", .systemPink), ("brown", .systemBrown),
    ("gray", .systemGray), ("gray2", .systemGray2), ("gray3", .systemGray3),
    ("gray4", .systemGray4), ("gray5", .systemGray5), ("gray6", .systemGray6),
    ("label", .label), ("secondaryLabel", .secondaryLabel),
    ("tertiaryLabel", .tertiaryLabel), ("separator", .separator),
    ("systemBackground", .systemBackground),
    ("secondarySystemBackground", .secondarySystemBackground),
    ("tertiarySystemBackground", .tertiarySystemBackground),
    ("systemGroupedBackground", .systemGroupedBackground),
    ("secondarySystemGroupedBackground", .secondarySystemGroupedBackground),
    ("link", .link), ("tintColor", UIColor.tintColor),
]
for (name, stil) in [("hell", UIUserInterfaceStyle.light), ("dunkel", .dark)] {
    print("=== \(name) ===")
    for (n, c) in farben { print("\(n)\t\(hex(c, stil))") }
}
