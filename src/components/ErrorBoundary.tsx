import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  hasError: boolean
}

/** Stops one broken component — usually WebGL — from blanking the whole page. */
export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error(error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="surface mx-auto my-10 max-w-lg px-6 py-10 text-center">
            <h2>This part of the page stopped working</h2>
            <p className="mt-2 text-inkSoft">Reload to try again.</p>
            <button type="button" className="btn-primary mt-4" onClick={() => window.location.reload()}>
              Reload page
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
