import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { usePosStore } from './store/posStore.js'
import { broadcast, buildPayload } from './lib/customerDisplay.js'

// Debounced posStore → customer display sync.
// Fires on every state mutation; 80 ms debounce prevents flooding on rapid scans.
let _cdTimer = null
usePosStore.subscribe(() => {
  const state = usePosStore.getState()
  if (!state.customerDisplayEnabled) return
  clearTimeout(_cdTimer)
  _cdTimer = setTimeout(() => {
    broadcast(buildPayload(usePosStore.getState()))
  }, 80)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
