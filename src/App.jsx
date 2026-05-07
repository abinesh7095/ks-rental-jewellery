import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import BillingPage from './pages/BillingPage'
import InventoryPage from './pages/InventoryPage'
import StockPage from './pages/StockPage'
import PreviousBills from './pages/PreviousBills'

export default function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<BillingPage />} />
          <Route path="/edit-bill/:id" element={<BillingPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/previous-bills" element={<PreviousBills />} />
        </Routes>
      </main>
    </div>
  )
}
