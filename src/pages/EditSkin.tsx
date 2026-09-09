import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { SkinForm } from '../components/SkinForm'
import { PageSpinner, ErrorState } from '../components/Loaders'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../lib/auth'
import { useToast } from '../hooks/useToast'
import { deleteSkin, getSkin, updateSkin, type SkinInput } from '../lib/skins'
import { friendlyError } from '../lib/errors'

export default function EditSkin() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const { data: skin, loading, error, reload } = useAsync(() => getSkin(id), [id])

  if (loading) return <PageSpinner label="Loading skin" />
  if (error) return <div className="mx-auto max-w-3xl px-4 py-10"><ErrorState message={error} onRetry={reload} /></div>
  if (!skin) return <Navigate to="/browse" replace />
  if (user && skin.user_id !== user.id) return <Navigate to={`/skin/${skin.id}`} replace />

  async function handleSubmit(input: SkinInput, colorsChanged: boolean) {
    if (!skin) return
    try {
      await updateSkin(skin, input, colorsChanged)
      notify('Changes saved.', 'success')
      navigate(`/skin/${skin.id}`)
    } catch (err) {
      throw new Error(friendlyError(err, 'Those changes did not save.'))
    }
  }

  async function handleDelete() {
    if (!skin) return
    setDeleting(true)
    try {
      await deleteSkin(skin)
      notify(`Deleted ${skin.name}.`, 'success')
      navigate('/browse')
    } catch (err) {
      notify(friendlyError(err, 'The skin could not be deleted.'), 'error')
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl">Edit {skin.name}</h1>
        <p className="text-inkSoft">
          Votes and downloads stay with the skin. Replacing the file updates the colours everywhere.
        </p>
      </header>

      <SkinForm initial={skin} submitLabel="Save changes" onSubmit={handleSubmit} />

      <section className="surface mt-10 border-coral/40 p-5">
        <h2 className="text-xl">Delete this skin</h2>
        <p className="mt-1 max-w-prose text-inkSoft">
          The skin, its file and its votes are removed. Anyone who already downloaded it keeps their
          copy. This cannot be undone.
        </p>
        {confirming ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn bg-coral text-white shadow-[0_3px_0_0_#A63A20]"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Yes, delete it'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setConfirming(false)}>
              Keep it
            </button>
          </div>
        ) : (
          <button type="button" className="btn-ghost mt-4" onClick={() => setConfirming(true)}>
            Delete skin
          </button>
        )}
      </section>
    </div>
  )
}
