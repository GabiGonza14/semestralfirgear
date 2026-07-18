interface SectionDecorProps {
  /** Texture style behind the content. */
  pattern?: 'dots' | 'grid' | 'stripes'
  /** Tailwind bg-* class for each drifting glow (colour variety per section). */
  glowA?: string
  glowB?: string
  /** Huge faint brand word sitting behind the section. */
  watermark?: string
  /** Scrolls the texture slowly to the right (grid pattern only). */
  animated?: boolean
  /** Opacity of the dot texture (dots pattern only). Default 0.5 — the landing
   *  value; pages that sit closer to content (e.g. Shop) can dim it. */
  dotOpacity?: number
  /** Fade the texture toward the edges with a radial mask. Default true — set
   *  false for a tall page section where a uniform, edge-to-edge texture reads
   *  better than one that fades out partway down. */
  mask?: boolean
}

// Decorative background layer for landing sections so they never read as a flat
// empty panel: a masked dot/grid texture, two drifting coloured glows, and an
// oversized faint watermark. Purely cosmetic — hidden from assistive tech and
// non-interactive. Motion respects prefers-reduced-motion via the fg-drift CSS.
export function SectionDecor({
  pattern = 'dots',
  glowA = 'bg-lime-400/10',
  glowB = 'bg-cyan-500/10',
  watermark,
  animated = false,
  dotOpacity = 0.5,
  mask = true,
}: SectionDecorProps) {
  let patternStyle: { backgroundImage: string; backgroundSize?: string } = {
    backgroundImage: `radial-gradient(circle, rgba(163,230,53,${dotOpacity}) 2px, transparent 2px)`,
    backgroundSize: '26px 26px',
  }
  if (pattern === 'grid') {
    patternStyle = {
      backgroundImage:
        'linear-gradient(rgba(163,230,53,0.4) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(163,230,53,0.4) 1.5px, transparent 1.5px)',
      backgroundSize: '54px 54px',
    }
  } else if (pattern === 'stripes') {
    // Diagonal hazard-tape motif — thick bands (18px, up from the original
    // 8px) so it reads clearly behind content/photos. No backgroundSize here
    // on purpose: repeating-linear-gradient already tiles seamlessly along
    // its own angle — forcing a fixed backgroundSize cuts it into a grid of
    // squares that don't line up at the seams, which made the lines look
    // broken/checkered before.
    patternStyle = {
      backgroundImage:
        'repeating-linear-gradient(45deg, rgba(163,230,53,0.22) 0px, rgba(163,230,53,0.22) 18px, transparent 18px, transparent 26px, rgba(34,211,238,0.18) 26px, rgba(34,211,238,0.18) 44px, transparent 44px, transparent 52px)',
    }
  }

  let scrollAnimationClassName = ''
  if (animated && pattern === 'grid') {
    scrollAnimationClassName = 'fg-grid-scroll'
  } else if (animated && pattern === 'stripes') {
    scrollAnimationClassName = 'fg-stripe-scroll-right'
  } else if (animated && pattern === 'dots') {
    scrollAnimationClassName = 'fg-dot-scroll-diagonal'
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Texture, faded toward the edges with a radial mask */}
      <div
        className={`absolute inset-0 ${mask ? '[mask-image:radial-gradient(ellipse_at_center,black,transparent_88%)]' : ''} ${scrollAnimationClassName}`}
        style={patternStyle}
      />

      {/* Drifting coloured glows */}
      <div
        className={`fg-drift absolute -left-24 -top-10 h-80 w-80 rounded-full blur-[120px] ${glowA}`}
      />
      <div
        className={`fg-drift-slow absolute -right-20 bottom-0 h-80 w-80 rounded-full blur-[120px] ${glowB}`}
      />

      {/* Oversized faint watermark */}
      {watermark ? (
        <span className="font-display absolute -right-2 top-1/2 -translate-y-1/2 select-none text-[24vw] font-black uppercase leading-none tracking-tighter text-white/[0.018] lg:text-[12vw]">
          {watermark}
        </span>
      ) : null}
    </div>
  )
}
