import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { FullPageLoader, Spinner } from './components/ui'
import { useApp } from './hooks/useApp'
import { isSupabaseConfigured } from './lib/supabase'
import Home from './pages/Home'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import SetupNotice from './pages/SetupNotice'
import Transactions from './pages/Transactions'

// Cac trang it dung hon duoc tai rieng, giup lan mo app dau tien nhe hon.
// Rieng Stats keo theo thu vien bieu do nen bat buoc phai tach.
const Stats = lazy(() => import('./pages/Stats'))
const Savings = lazy(() => import('./pages/Savings'))
const More = lazy(() => import('./pages/More'))
const Accounts = lazy(() => import('./pages/more/Accounts'))
const Bills = lazy(() => import('./pages/more/Bills'))
const Budgets = lazy(() => import('./pages/more/Budgets'))
const Categories = lazy(() => import('./pages/more/Categories'))
const Debts = lazy(() => import('./pages/more/Debts'))
const Family = lazy(() => import('./pages/more/Family'))
const Settings = lazy(() => import('./pages/more/Settings'))
const Statement = lazy(() => import('./pages/more/Statement'))

function PageFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner className="h-6 w-6 text-ink-400" />
    </div>
  )
}

export default function App() {
  const { session, profile, bootstrapping } = useApp()

  if (!isSupabaseConfigured) return <SetupNotice />
  if (bootstrapping) return <FullPageLoader />
  if (!session) return <Login />
  if (!profile) return <Onboarding />

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/savings" element={<Savings />} />
          <Route path="/more" element={<More />} />
          <Route path="/more/budgets" element={<Budgets />} />
          <Route path="/more/debts" element={<Debts />} />
          <Route path="/more/bills" element={<Bills />} />
          <Route path="/more/accounts" element={<Accounts />} />
          <Route path="/more/statement" element={<Statement />} />
          <Route path="/more/categories" element={<Categories />} />
          <Route path="/more/family" element={<Family />} />
          <Route path="/more/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
