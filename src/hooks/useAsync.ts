import { useCallback, useEffect, useRef, useState } from 'react'
import { friendlyError } from '../lib/errors'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

/** Small data-fetching helper: loading / error / empty states without a library. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], fallbackError?: string): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const latest = useRef(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    const run = ++latest.current
    setLoading(true)
    setError(null)
    fn()
      .then((result) => {
        if (run !== latest.current) return
        setData(result)
      })
      .catch((err) => {
        if (run !== latest.current) return
        setError(friendlyError(err, fallbackError))
      })
      .finally(() => {
        if (run === latest.current) setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  return { data, loading, error, reload }
}
