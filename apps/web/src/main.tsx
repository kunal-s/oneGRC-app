import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { DevIdentityBar } from './api/DevIdentityBar'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Governance data is read for decisions; a stale register is misleading.
      staleTime: 10_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const isDev = import.meta.env.DEV

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        {isDev && <DevIdentityBar />}
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
