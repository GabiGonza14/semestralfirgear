type ShapeKind = 'hex' | 'ring' | 'triangle' | 'plus' | 'diamond' | 'arc'
type ShapeColor = 'lime' | 'cyan'

interface ShapeSpec {
  kind: ShapeKind
  color: ShapeColor
  size: number
  top?: string
  bottom?: string
  left?: string
  right?: string
  rotate: number
  strokeOpacity: number
  glowOpacity: number
  duration: number
  delay: number
  floatX: number
  floatY: number
  floatRot: number
}

const STROKE: Record<ShapeColor, string> = {
  lime: '#a3e635',
  cyan: '#22d3ee',
}

// Outline vocabulary borrowed from the gym floor — a hex plate, a loaded ring,
// a chevron, a rig joint, a plate clip, an open collar — rather than generic
// decorative blobs.
function ShapeMark({ kind, size, color, strokeOpacity, glowOpacity }: { kind: ShapeKind; size: number; color: ShapeColor; strokeOpacity: number; glowOpacity: number }) {
  const common = { stroke: STROKE[color], strokeWidth: 2, fill: 'none' }
  const glow = `drop-shadow(0 0 ${Math.round(size * 0.22)}px ${STROKE[color]}${Math.round(glowOpacity * 255).toString(16).padStart(2, '0')})`

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ opacity: strokeOpacity, filter: glow }} aria-hidden>
      {kind === 'hex' && <polygon points="50,4 93,27 93,73 50,96 7,73 7,27" {...common} />}
      {kind === 'ring' && (
        <>
          <circle cx="50" cy="50" r="42" {...common} />
          <circle cx="50" cy="50" r="28" {...common} strokeOpacity={0.6} />
        </>
      )}
      {kind === 'triangle' && <polygon points="50,8 92,88 8,88" {...common} strokeLinejoin="round" />}
      {kind === 'plus' && (
        <path d="M40 4h20v36h36v20H60v36H40V60H4V40h36z" {...common} strokeLinejoin="round" />
      )}
      {kind === 'diamond' && <polygon points="50,4 96,50 50,96 4,50" {...common} />}
      {kind === 'arc' && <path d="M12 62a38 38 0 0 1 76 0" {...common} strokeLinecap="round" />}
    </svg>
  )
}

// Hand-placed per section, more shapes than a section "needs" so the field
// reads full rather than a couple of stray icons — but never stacked on top
// of where the copy sits (left-aligned headings, centered CTAs). Travel
// distances are large relative to each shape's own size so they visibly
// wander across the section instead of jittering in place. Opacity/glow are
// deliberately bright — this is a signature background element, not a
// barely-there texture.
const VARIANTS: Record<string, ShapeSpec[]> = {
  marquee: [
    { kind: 'ring', color: 'cyan', size: 60, top: '-30%', left: '4%', rotate: 0, strokeOpacity: 0.55, glowOpacity: 0.7, duration: 34, delay: 0, floatX: 90, floatY: 30, floatRot: 10 },
    { kind: 'plus', color: 'lime', size: 36, bottom: '-40%', right: '16%', rotate: 12, strokeOpacity: 0.5, glowOpacity: 0.65, duration: 29, delay: 4, floatX: -110, floatY: -20, floatRot: -14 },
    { kind: 'diamond', color: 'cyan', size: 30, top: '10%', right: '38%', rotate: 10, strokeOpacity: 0.45, glowOpacity: 0.6, duration: 26, delay: 9, floatX: 70, floatY: -25, floatRot: 12 },
  ],
  showcase: [
    { kind: 'hex', color: 'lime', size: 110, top: '2%', right: '2%', rotate: 8, strokeOpacity: 0.5, glowOpacity: 0.7, duration: 46, delay: 0, floatX: -140, floatY: 90, floatRot: 16 },
    { kind: 'ring', color: 'cyan', size: 64, bottom: '8%', left: '0%', rotate: 0, strokeOpacity: 0.55, glowOpacity: 0.7, duration: 38, delay: 5, floatX: 130, floatY: -70, floatRot: -12 },
    { kind: 'triangle', color: 'cyan', size: 44, top: '34%', right: '18%', rotate: -10, strokeOpacity: 0.4, glowOpacity: 0.6, duration: 42, delay: 10, floatX: -90, floatY: 110, floatRot: 18 },
    { kind: 'arc', color: 'lime', size: 54, top: '55%', left: '30%', rotate: 0, strokeOpacity: 0.42, glowOpacity: 0.58, duration: 50, delay: 14, floatX: 100, floatY: 60, floatRot: -8 },
    { kind: 'diamond', color: 'lime', size: 34, top: '12%', left: '20%', rotate: 4, strokeOpacity: 0.45, glowOpacity: 0.6, duration: 33, delay: 3, floatX: -80, floatY: -50, floatRot: 10 },
  ],
  giftfinder: [
    { kind: 'ring', color: 'lime', size: 90, top: '-4%', left: '-2%', rotate: 0, strokeOpacity: 0.5, glowOpacity: 0.7, duration: 44, delay: 2, floatX: -120, floatY: 80, floatRot: 14 },
    { kind: 'plus', color: 'cyan', size: 48, bottom: '4%', right: '4%', rotate: 8, strokeOpacity: 0.55, glowOpacity: 0.68, duration: 36, delay: 6, floatX: 100, floatY: -90, floatRot: -12 },
    { kind: 'hex', color: 'lime', size: 56, top: '18%', right: '28%', rotate: 20, strokeOpacity: 0.4, glowOpacity: 0.58, duration: 48, delay: 12, floatX: -70, floatY: -60, floatRot: 8 },
    { kind: 'triangle', color: 'cyan', size: 38, bottom: '20%', left: '35%', rotate: -6, strokeOpacity: 0.42, glowOpacity: 0.6, duration: 40, delay: 8, floatX: 90, floatY: 70, floatRot: -16 },
  ],
  cta: [
    { kind: 'triangle', color: 'lime', size: 52, top: '6%', left: '4%', rotate: 6, strokeOpacity: 0.55, glowOpacity: 0.7, duration: 32, delay: 0, floatX: 80, floatY: 60, floatRot: -10 },
    { kind: 'hex', color: 'cyan', size: 80, bottom: '-10%', right: '6%', rotate: -6, strokeOpacity: 0.5, glowOpacity: 0.7, duration: 40, delay: 5, floatX: -100, floatY: -70, floatRot: 12 },
    { kind: 'diamond', color: 'cyan', size: 32, top: '15%', right: '30%', rotate: 8, strokeOpacity: 0.45, glowOpacity: 0.62, duration: 30, delay: 9, floatX: 60, floatY: -40, floatRot: 8 },
  ],
  trust: [
    { kind: 'ring', color: 'cyan', size: 42, top: '4%', left: '10%', rotate: 0, strokeOpacity: 0.55, glowOpacity: 0.68, duration: 27, delay: 1, floatX: 70, floatY: 20, floatRot: 8 },
    { kind: 'plus', color: 'lime', size: 30, bottom: '4%', right: '8%', rotate: 10, strokeOpacity: 0.5, glowOpacity: 0.65, duration: 31, delay: 6, floatX: -80, floatY: -18, floatRot: -10 },
    { kind: 'arc', color: 'lime', size: 40, top: '20%', right: '38%', rotate: 180, strokeOpacity: 0.42, glowOpacity: 0.58, duration: 25, delay: 3, floatX: 50, floatY: -24, floatRot: 6 },
  ],
}

interface FloatingShapesProps {
  variant: keyof typeof VARIANTS
}

// Ambient geometric layer (hex plates, rings, chevrons, rig joints) that
// wanders slowly across the whole section, mixing the lime accent with a
// cyan partner and a bright matching glow so the flat dark sections read as
// a deliberate signature element, not a barely-there texture. Purely
// cosmetic: hidden from assistive tech, non-interactive, and the drift is
// plain CSS (fg-float in index.css) so it's paused by the centralized
// prefers-reduced-motion block like every other ambient animation in the app.
export function FloatingShapes({ variant }: FloatingShapesProps) {
  const shapes = VARIANTS[variant]

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {shapes.map((shape, index) => (
        <div
          key={index}
          className="fg-float absolute"
          style={{
            top: shape.top,
            bottom: shape.bottom,
            left: shape.left,
            right: shape.right,
            transform: `rotate(${shape.rotate}deg)`,
            ['--float-x' as string]: `${shape.floatX}px`,
            ['--float-y' as string]: `${shape.floatY}px`,
            ['--float-rot' as string]: `${shape.floatRot}deg`,
            ['--float-duration' as string]: `${shape.duration}s`,
            ['--float-delay' as string]: `${shape.delay}s`,
          }}
        >
          <ShapeMark kind={shape.kind} size={shape.size} color={shape.color} strokeOpacity={shape.strokeOpacity} glowOpacity={shape.glowOpacity} />
        </div>
      ))}
    </div>
  )
}
