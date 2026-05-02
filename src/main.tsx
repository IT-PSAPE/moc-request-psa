import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import App from '@/App.tsx'
import { initializeMockData } from '@/data/mock-data'
import { AuthProvider } from '@/lib/auth-context'
import { OverlayProvider } from '@/components/overlays/overlay-provider'
import { FeedbackProvider } from '@/components/feedback/feedback-provider'
import { ConfirmProvider } from '@/components/feedback/confirm-modal'
import { ServiceWorkerRegistrar } from '@/lib/service-worker'

async function bootstrap() {
  await initializeMockData()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthProvider>
        <OverlayProvider>
          <FeedbackProvider>
            <ConfirmProvider>
              <ServiceWorkerRegistrar />
              <App />
            </ConfirmProvider>
          </FeedbackProvider>
        </OverlayProvider>
      </AuthProvider>
    </StrictMode>,
  )
}

void bootstrap()
