import vendoIcon from '../../assets/brand/vendo-icon.svg'
import vendoLogo from '../../assets/brand/vendo-logo.svg'
import vendoStacked from '../../assets/brand/vendo-stacked.svg'
import vendoIconWhite from '../../assets/brand/vendo-icon-white.svg'
import vendoLogoWhite from '../../assets/brand/vendo-logo-white.svg'
import vendoStackedWhite from '../../assets/brand/vendo-stacked-white.svg'

const SOURCES = {
  icon:       { color: vendoIcon,    white: vendoIconWhite,    ratio: 96.6 / 94 },
  horizontal: { color: vendoLogo,    white: vendoLogoWhite,    ratio: 274 / 94 },
  stacked:    { color: vendoStacked, white: vendoStackedWhite, ratio: 168 / 180 },
}

/*
 * Moif Vendo — Retail POS brand mark (artwork: admaze logo proposal, set 3).
 *
 *   <BrandLogo variant="horizontal" height={40} />
 *   <BrandLogo variant="stacked" tone="white" height={150} />   // on brand colour
 *
 * Props:
 *   variant — 'icon' (square mark) | 'horizontal' (mark + wordmark) | 'stacked'
 *   tone    — 'color' (for white backgrounds) | 'white' (reversed, for brand-coloured backgrounds)
 *   height  — rendered height in px (width follows the artwork's ratio)
 */
export default function BrandLogo({ variant = 'horizontal', tone = 'color', height = 40, style }) {
  const { ratio, ...srcs } = SOURCES[variant]
  return (
    <img
      src={srcs[tone]}
      alt="Moif Vendo — Retail POS"
      draggable={false}
      style={{ height, width: Math.round(height * ratio), display: 'block', flexShrink: 0, ...style }}
    />
  )
}
