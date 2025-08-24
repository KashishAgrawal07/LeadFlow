import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
<React.StrictMode>
    <BrowserRouter>
      <AuthProvider>   {/* ✅ provides context for useAuth() */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)