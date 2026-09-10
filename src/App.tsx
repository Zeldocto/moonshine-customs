import { Route, Routes } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Toaster } from './components/Toaster'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ConfigWarning } from './components/ConfigWarning'
import Home from './pages/Home'
import Browse from './pages/Browse'
import SkinDetail from './pages/SkinDetail'
import Upload from './pages/Upload'
import EditSkin from './pages/EditSkin'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AuthCallback from './pages/AuthCallback'
import Community from './pages/Community'
import About from './pages/About'
import NotFound from './pages/NotFound'
import { lazy, Suspense } from 'react'

// Dev-only harness for eyeballing the 3D preview. Tree-shaken out of prod builds.
const PreviewTest = import.meta.env.DEV ? lazy(() => import('./pages/PreviewTest')) : null

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-shell focus:px-4 focus:py-2"
      >
        Skip to content
      </a>

      <Navbar />
      <ConfigWarning />

      <main id="main" className="flex-1">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            {PreviewTest && (
              <Route
                path="/preview-test"
                element={
                  <Suspense fallback={null}>
                    <PreviewTest />
                  </Suspense>
                }
              />
            )}
            <Route path="/browse" element={<Browse />} />
            <Route path="/skin/:id" element={<SkinDetail />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/community" element={<Community />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <Upload />
                </ProtectedRoute>
              }
            />
            <Route
              path="/skin/:id/edit"
              element={
                <ProtectedRoute>
                  <EditSkin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </main>

      <Footer />
      <Toaster />
    </div>
  )
}

const DISCLAIMER =
  '...D.E.B.S. ALERT... This is a community project for the Super Mario Sunshine speedrunning scene. Not affiliated with Nintendo. — Skins are color values only. Nothing here modifies your game files.'

function Footer() {
  return (
    <footer className="mt-16 border-t border-sandDeep bg-shell/60">
      <div className="ticker py-2 text-sm text-white" role="note" aria-label="Site disclaimer">
        <div className="ticker-track">
          <span className="px-8">{DISCLAIMER}</span>
          <span className="px-8" aria-hidden="true">
            {DISCLAIMER}
          </span>
        </div>
      </div>
    </footer>
  )
}

