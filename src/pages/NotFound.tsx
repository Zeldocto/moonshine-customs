import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-4xl">Nothing at this address</h1>
      <p className="mt-3 text-inkSoft">
        The link may be old, or the skin may have been deleted.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/browse" className="btn-primary">
          Browse skins
        </Link>
        <Link to="/" className="btn-ghost">
          Go home
        </Link>
      </div>
    </div>
  )
}
