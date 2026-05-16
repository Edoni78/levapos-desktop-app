import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FocusStyleManager } from '@blueprintjs/core'
import './index.css'
import App from './App.jsx'

FocusStyleManager.onlyShowFocusOnTabs()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
