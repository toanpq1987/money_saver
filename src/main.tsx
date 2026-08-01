import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import App from './App'
import { AppProvider } from './hooks/useApp'
import { ConfirmProvider, ToastProvider } from './components/ui'
import { applyTheme, useUI } from './lib/store'
import { flushOutbox, setOutboxSyncHandler, startOutboxAutoFlush } from './lib/outbox'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 30_000,
      // Mat mang thi truy van tam dung va tra ve du lieu da luu, khong bao loi.
      networkMode: 'online',
      gcTime: 1000 * 60 * 60 * 24 * 7,
    },
    mutations: {
      // Hang doi offline tu lo viec thu lai, nen dung de React Query
      // treo mutation lai - neu khong mutateAsync se khong bao gio tra ve.
      networkMode: 'always',
      retry: 0,
    },
  },
})

/**
 * Luu cache truy van xuong localStorage de mo app khi mat mang van thay
 * du lieu cu. Chi luu nhung truy van da thanh cong.
 */
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'moneysaver.cache.v1',
  throttleTime: 1000,
})

// Sau moi lan day hang doi thanh cong, tai lai du lieu that tu may chu.
setOutboxSyncHandler(() => {
  queryClient.invalidateQueries()
})

// Theme phai duoc ap dung truoc khi React ve, tranh nhap nhay mau nen.
applyTheme(useUI.getState().theme)
useUI.subscribe((s) => applyTheme(s.theme))
window
  .matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', () => applyTheme(useUI.getState().theme))

startOutboxAutoFlush()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => query.state.status === 'success',
        },
      }}
      onSuccess={() => {
        // Cache cu da nap xong -> day not nhung gi con dang cho gui.
        void flushOutbox()
      }}
    >
      <BrowserRouter>
        <ToastProvider>
          <ConfirmProvider>
            <AppProvider>
              <App />
            </AppProvider>
          </ConfirmProvider>
        </ToastProvider>
      </BrowserRouter>
    </PersistQueryClientProvider>
  </StrictMode>,
)
