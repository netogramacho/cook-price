type ApiError = { errors?: Record<string, string[]>; message?: string }

export function handleApiError(
  err: unknown,
  setErrors: (errors: Record<string, string[]>) => void,
  showError: (msg: string) => void,
  fallback = 'Erro inesperado.'
): void {
  const e = err as ApiError
  setErrors(e.errors ?? {})
  if (!e.errors) showError(e.message ?? fallback)
}
