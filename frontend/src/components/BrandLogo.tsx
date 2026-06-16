export function BrandLogo({ size = 20, variant = 'branco' }: { size?: number; variant?: 'bordo' | 'branco' }) {
  return (
    <img
      src={variant === 'bordo' ? '/logo_bordo.png' : '/logo_branco.png'}
      alt="Preciva"
      height={size}
      style={{ width: 'auto', display: 'block', flexShrink: 0 }}
    />
  )
}
