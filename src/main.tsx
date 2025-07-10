import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { applyCSP } from '@/lib/security/csp'
import { environmentSecurity } from '@/lib/security/environment'

// Initialize security systems
applyCSP();
environmentSecurity.validateRuntimeEnvironment();

createRoot(document.getElementById("root")!).render(<App />);
