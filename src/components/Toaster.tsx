import { useToast } from '../hooks/useToast'

const TONES = {
  success: 'border-lagoon bg-lagoon/12 text-lagoonDeep',
  error: 'border-coral bg-coral/12 text-[#9B2F16]',
  info: 'border-ink/20 bg-shell text-ink',
} as const

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border-2 px-4 py-3 shadow-lift ${TONES[toast.tone]}`}
        >
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="rounded px-1 text-sm font-bold"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
