export function BrandLogo({ height = 48, variant = 'branco' }: { height?: number; variant?: 'bordo' | 'branco' }) {
  return (
    <img
      src={variant === 'bordo' ? '/logo_bordo.png' : '/logo_branco.png'}
      alt="Preciva"
      height={height}
      style={{ width: 'auto', display: 'block', flexShrink: 0 }}
    />
  )
}
