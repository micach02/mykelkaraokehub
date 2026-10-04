import { memo, useMemo } from 'react'
import qrcode from 'qrcode-generator'

const QUIET_ZONE = 4 // modules of white border scanners need

// Crisp SVG QR code, always black on white so phone cameras read it easily.
export const QrCode = memo(function QrCode({ value, size = 220, label, className }) {
  const { path, dimension } = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(value)
    qr.make()
    const count = qr.getModuleCount()
    let d = ''
    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count; col += 1) {
        if (qr.isDark(row, col)) d += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`
      }
    }
    return { path: d, dimension: count + QUIET_ZONE * 2 }
  }, [value])

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${dimension} ${dimension}`}
      role="img"
      aria-label={label ?? `QR code for ${value}`}
      shapeRendering="crispEdges"
    >
      <rect width={dimension} height={dimension} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  )
})
