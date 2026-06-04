import { useAppStore } from '../store/useAppStore'

export function AppLoader() {
  const isLoading = useAppStore(s => s.isLoading)
  if (!isLoading) return null

  return (
    <div className="global-loader">
      <div className="global-loader-dots">
        <span /><span /><span />
      </div>
    </div>
  )
}
