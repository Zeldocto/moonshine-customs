import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './lib/auth'
import { ToastProvider } from './hooks/useToast'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* basename comes from Vite's `base`, so the app works both at
        /moonshine-customs/ on GitHub Pages and at / in dev. */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
