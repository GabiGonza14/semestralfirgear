interface SectionDecorProps {
  /** Texture style behind the content. */
  pattern?: 'dots' | 'grid'
  /** Tailwind bg-* class for each drifting glow (colour variety per section). */
  glowA?: string
  glowB?: string
  /** Huge faint brand word sitting behind the section. */
  watermark?: string
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
}: SectionDecorProps) {
  const patternStyle =
    pattern === 'grid'
      ? {
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '54px 54px',
        }
      : {
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Texture, faded toward the edges with a radial mask */}
      <div
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]"
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
