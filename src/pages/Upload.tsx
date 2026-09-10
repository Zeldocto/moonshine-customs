import { useNavigate } from 'react-router-dom'
import { SkinForm } from '../components/SkinForm'
import { useAuth } from '../lib/auth'
import { useToast } from '../hooks/useToast'
import { createSkin, type SkinInput } from '../lib/skins'
import { friendlyError } from '../lib/errors'

export default function Upload() {
  const { user, profile } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()

  async function handleSubmit(input: SkinInput) {
    if (!user || !profile) throw new Error('Sign in again to publish a skin.')
    try {
      const skin = await createSkin(user.id, profile.username, input)
      notify(`Published ${skin.name}.`, 'success')
      navigate(`/skin/${skin.id}`)
    } catch (error) {
      throw new Error(friendlyError(error, 'The skin could not be published.'))
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl">Upload a skin</h1>
        <p className="max-w-prose text-inkSoft">
          Drop in the susamune.ini Moonshine writes. The site reads the Mario and FLUDD colors out
          of it, shows you the result, and publishes only those values.
        </p>
      </header>

      <SkinForm submitLabel="Publish skin" onSubmit={handleSubmit} />
    </div>
  )
}
