import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

const UPDATE_CHECK_INTERVAL_MS = 60_000

export default function PwaUpdatePrompt() {
  const registrationRef = useRef<ServiceWorkerRegistration>()
  const [updating, setUpdating] = useState(false)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW: (_swUrl, registration) => {
      registrationRef.current = registration
    },
  })

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      registrationRef.current?.update().catch(() => {})
    }, UPDATE_CHECK_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [])

  if (!needRefresh) return null

  async function handleUpdate() {
    setUpdating(true)
    try {
      await updateServiceWorker()
      window.location.reload()
    } catch {
      setUpdating(false)
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed inset-x-4 bottom-24 z-[100] mx-auto max-w-md rounded-2xl border border-orange-400/30 bg-[#171717] p-4 shadow-2xl"
    >
      <p className="text-sm font-extrabold text-white">Доступно обновление</p>
      <p className="mt-1 text-xs leading-relaxed text-white/60">
        Обновите приложение, чтобы использовать актуальную версию.
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="rounded-lg px-3 py-2 text-xs font-bold text-white/60"
        >
          Позже
        </button>
        <button
          type="button"
          onClick={handleUpdate}
          disabled={updating}
          className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-60"
        >
          {updating ? 'Обновляем...' : 'Обновить сейчас'}
        </button>
      </div>
    </div>
  )
}
