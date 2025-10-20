import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'leaflet/dist/leaflet.css'
import Routes from './routes/routes'
import { AuthProvider } from '@/contexts/AuthContext'
import { PeriodProvider } from "./contexts/PeriodContext";

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <AuthProvider>
      <PeriodProvider>
        <Routes />
      </PeriodProvider>
    </AuthProvider>
  </StrictMode>,
)
