import { useState } from 'react'
import { downloadSkin } from '../lib/downloads'
import { useToast } from '../hooks/useToast'
import { friendlyError } from '../lib/errors'
import { formatCount } from '../utils/format'
import type { SkinRecord } from '../types/skin'

interface DownloadButtonProps {
  skin: SkinRecord
  variant?: 'primary' | 'ghost' | 'shine'
  showCount?: boolean
}

export function DownloadButton({ skin, variant = 'shine', showCount = false }: DownloadButtonProps) {
  const { notify } = useToast()
  const [busy, setBusy] = useState(false)
  const [count, setCount] = useState(skin.download_count)

  async function handleDownload() {
    setBusy(true)
    try {
      const total = await downloadSkin(skin)
      if (total !== null) setCount(total)
      notify(`Downloaded ${skin.name}.`, 'success')
    } catch (error) {
      notify(friendlyError(error, 'The download failed. Try again in a moment.'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const classes = { primary: 'btn-primary', ghost: 'btn-ghost', shine: 'btn-shine' }[variant]

  return (
    <button type="button" className={`${classes} w-full`} onClick={() => void handleDownload()} disabled={busy}>
      {busy ? 'Preparing…' : 'Download skin'}
      {showCount && <span className="font-body text-sm font-medium">({formatCount(count)})</span>}
    </button>
  )
}
