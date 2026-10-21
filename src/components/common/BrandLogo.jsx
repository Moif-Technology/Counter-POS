import vendoIcon from '../../assets/brand/vendo-icon.svg'
import vendoLogo from '../../assets/brand/vendo-logo.svg'
import vendoStacked from '../../assets/brand/vendo-stacked.svg'

const SOURCES = {
  icon:       { src: vendoIcon,    ratio: 96.6 / 94 },
  horizontal: { src: vendoLogo,    ratio: 274 / 94 },
  stacked:    { src: vendoStacked, ratio: 168 / 180 },
}

/*
 * Moif Vendo — Retail POS brand mark (artwork: admaze logo proposal, set 3).
 *
 *   <BrandLogo variant="horizontal" height={40} />
 *
 * Props:
 *   variant — 'icon' (square mark) | 'horizontal' (mark + wordmark) | 'stacked'
 *   height  — rendered height in px (width follows the artwork's ratio)
 *
 * The wordmark is dark — on brand-coloured backgrounds place it on a white tile.
 */
export default function BrandLogo({ variant = 'horizontal', height = 40, style }) {
  const { src, ratio } = SOURCES[variant]
  return (
    <img
      src={src}
      alt="Moif Vendo — Retail POS"
      draggable={false}
      style={{ height, width: Math.round(height * ratio), display: 'block', flexShrink: 0, ...style }}
    />
  )
}
