import AppKit

let outputPath = CommandLine.arguments.dropFirst().first ?? "app-icon-source.png"
let canvas = NSSize(width: 1024, height: 1024)
let image = NSImage(size: canvas)

func color(_ hex: UInt32, alpha: CGFloat = 1.0) -> NSColor {
  NSColor(
    calibratedRed: CGFloat((hex >> 16) & 0xff) / 255,
    green: CGFloat((hex >> 8) & 0xff) / 255,
    blue: CGFloat(hex & 0xff) / 255,
    alpha: alpha
  )
}

image.lockFocus()

color(0x0c0709).setFill()
NSBezierPath(rect: NSRect(origin: .zero, size: canvas)).fill()

let panels: [(NSRect, CGFloat)] = [
  (NSRect(x: 136, y: 594, width: 150, height: 210), 0.28),
  (NSRect(x: 740, y: 602, width: 144, height: 226), 0.28),
  (NSRect(x: 172, y: 200, width: 174, height: 158), 0.28),
  (NSRect(x: 702, y: 214, width: 176, height: 164), 0.28),
]

for (rect, alpha) in panels {
  color(0xd6c8ad, alpha: alpha).setFill()
  NSBezierPath(rect: rect).fill()
}

let threads = [
  (NSPoint(x: 0, y: 836), NSPoint(x: 1024, y: 348)),
  (NSPoint(x: 90, y: 992), NSPoint(x: 946, y: 34)),
  (NSPoint(x: 0, y: 244), NSPoint(x: 1024, y: 738)),
]

color(0x852c24, alpha: 0.34).setStroke()
for (start, end) in threads {
  let path = NSBezierPath()
  path.lineWidth = 8
  path.lineCapStyle = .round
  path.move(to: start)
  path.line(to: end)
  path.stroke()
}

let center = NSPoint(x: 512, y: 512)

func fillEllipse(center: NSPoint, radiusX: CGFloat, radiusY: CGFloat, colorHex: UInt32, alpha: CGFloat = 1.0) {
  color(colorHex, alpha: alpha).setFill()
  let rect = NSRect(x: center.x - radiusX, y: center.y - radiusY, width: radiusX * 2, height: radiusY * 2)
  NSBezierPath(ovalIn: rect).fill()
}

func strokeEllipse(center: NSPoint, radiusX: CGFloat, radiusY: CGFloat, colorHex: UInt32, lineWidth: CGFloat, alpha: CGFloat = 1.0) {
  color(colorHex, alpha: alpha).setStroke()
  let rect = NSRect(x: center.x - radiusX, y: center.y - radiusY, width: radiusX * 2, height: radiusY * 2)
  let path = NSBezierPath(ovalIn: rect)
  path.lineWidth = lineWidth
  path.stroke()
}

fillEllipse(center: center, radiusX: 376, radiusY: 212, colorHex: 0xdcc996)
fillEllipse(center: center, radiusX: 262, radiusY: 146, colorHex: 0x8b5932)
fillEllipse(center: center, radiusX: 116, radiusY: 116, colorHex: 0x140d12)
fillEllipse(center: center, radiusX: 42, radiusY: 42, colorHex: 0xefe2bc)
strokeEllipse(center: center, radiusX: 392, radiusY: 224, colorHex: 0xf2e9cf, lineWidth: 2, alpha: 0.14)
strokeEllipse(center: center, radiusX: 406, radiusY: 236, colorHex: 0x241217, lineWidth: 18, alpha: 0.48)

color(0x1a0d11, alpha: 0.7).setStroke()
let frame = NSBezierPath(rect: NSRect(x: 9, y: 9, width: 1006, height: 1006))
frame.lineWidth = 18
frame.stroke()

image.unlockFocus()

guard
  let tiffData = image.tiffRepresentation,
  let bitmap = NSBitmapImageRep(data: tiffData),
  let pngData = bitmap.representation(using: .png, properties: [:])
else {
  fputs("Failed to render app icon.\n", stderr)
  exit(1)
}

try pngData.write(to: URL(fileURLWithPath: outputPath), options: .atomic)
