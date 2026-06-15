export function BrandLogo({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Subtle fill inside clipboard body */}
      <rect x="4" y="4" width="16" height="18" rx="2" fill="currentColor" fillOpacity="0.1" stroke="none" />

      {/* Clip tab */}
      <rect x="8" y="2" width="8" height="4" rx="1.5" />

      {/* Clipboard body outline — gap at top where clip tab sits */}
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />

      {/* Dollar sign — vertical bar */}
      <line x1="12" y1="10" x2="12" y2="19" strokeWidth="1.6" />

      {/* Dollar sign — S-curve */}
      <path
        d="M14.5 12C14.5 10.5 9.5 10.5 9.5 12C9.5 13.5 14.5 13.5 14.5 15.5C14.5 17 9.5 17 9.5 15.5"
        strokeWidth="1.6"
      />
    </svg>
  )
}
