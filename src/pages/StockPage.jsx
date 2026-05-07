import { useState, useEffect } from 'react'
import { fetchStock, fetchRented, updateStock } from '../utils/api'
import './StockPage.css'

export default function StockPage() {
  const [data, setData] = useState({ products: [], summary: {} })
  const [rented, setRented] = useState([])
  const [tab, setTab] = useState('overview')
  const [toast, setToast] = useState(null)
  const [editingStock, setEditingStock] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const stockData = await fetchStock()
    setData(stockData)
    const rentedData = await fetchRented()
    setRented(rentedData)
  }

  function showToast(msg, type = 'success') {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function saveStock() {
    if (!editingStock) return
    try {
      await updateStock(editingStock.id, {
        total_stock: Number(editingStock.total_stock),
        available_stock: Number(editingStock.available_stock)
      })
      showToast('Stock updated ✨')
      setEditingStock(null)
      load()
    } catch { showToast('Failed to update', 'error') }
  }

  function getStockStatus(p) {
    if (p.available_stock === 0) return { label: 'Out of Stock', class: 'badge-danger' }
    if (p.available_stock <= 2) return { label: 'Low Stock', class: 'badge-warning' }
    return { label: 'Available', class: 'badge-success' }
  }

  function getStockPercent(p) {
    if (p.total_stock === 0) return 0
    return Math.round((p.available_stock / p.total_stock) * 100)
  }

  const s = data.summary

  return (
    <div className="stock-page">
      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}>{toast.message}</div></div>}

      <div className="page-header">
        <h1>📦 <span>Stock</span> Overview</h1>
        <p>Monitor your jewellery inventory and rental status</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-value">{s.totalStock || 0}</div>
          <div className="stat-label">Total Stock</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{s.availableStock || 0}</div>
          <div className="stat-label">Available</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔄</div>
          <div className="stat-value">{s.rentedOut || 0}</div>
          <div className="stat-label">Rented Out</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-value">{(s.lowStock || 0) + (s.outOfStock || 0)}</div>
          <div className="stat-label">Low / Out of Stock</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="stock-tabs">
        <button className={`tab-btn ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>📊 Stock Levels</button>
        <button className={`tab-btn ${tab === 'rented' ? 'active' : ''}`} onClick={() => setTab('rented')}>🔄 Currently Rented ({rented.length})</button>
      </div>

      {tab === 'overview' && (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Total</th>
                <th>Available</th>
                <th>Rented</th>
                <th>Availability</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((p, i) => {
                const status = getStockStatus(p)
                const pct = getStockPercent(p)
                return (
                  <tr key={p.id}>
                    <td style={{color:'var(--text-muted)'}}>{i + 1}</td>
                    <td><strong style={{color:'var(--gold-light)'}}>{p.name}</strong></td>
                    <td>{editingStock?.id === p.id ?
                      <input type="number" className="form-input" style={{width:70,padding:'4px 8px'}} value={editingStock.total_stock} onChange={e => setEditingStock({...editingStock, total_stock: e.target.value})} />
                      : p.total_stock}
                    </td>
                    <td>{editingStock?.id === p.id ?
                      <input type="number" className="form-input" style={{width:70,padding:'4px 8px'}} value={editingStock.available_stock} onChange={e => setEditingStock({...editingStock, available_stock: e.target.value})} />
                      : p.available_stock}
                    </td>
                    <td>{p.total_stock - p.available_stock}</td>
                    <td>
                      <div className="stock-bar-wrapper">
                        <div className="stock-bar">
                          <div className={`stock-bar-fill ${pct <= 20 ? 'danger' : pct <= 40 ? 'warning' : 'success'}`} style={{width: `${pct}%`}}></div>
                        </div>
                        <span className="stock-pct">{pct}%</span>
                      </div>
                    </td>
                    <td><span className={`badge ${status.class}`}>{status.label}</span></td>
                    <td>
                      {editingStock?.id === p.id ? (
                        <div style={{display:'flex',gap:'6px'}}>
                          <button className="btn btn-primary btn-sm" onClick={saveStock}>Save</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditingStock(null)}>Cancel</button>
                        </div>
                      ) : (
                        <button className="btn-icon" title="Edit Stock" onClick={() => setEditingStock({ id: p.id, total_stock: p.total_stock, available_stock: p.available_stock })}>✏️</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'rented' && (
        rented.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✨</div>
            <h3>No items currently rented</h3>
            <p>All jewellery is available in stock</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Jewellery</th>
                  <th>Qty</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Invoice</th>
                  <th>Booking</th>
                  <th>Return</th>
                </tr>
              </thead>
              <tbody>
                {rented.map((r, i) => (
                  <tr key={i}>
                    <td style={{color:'var(--text-muted)'}}>{i + 1}</td>
                    <td><strong style={{color:'var(--gold-light)'}}>{r.jewellery_name}</strong></td>
                    <td>{r.quantity}</td>
                    <td>{r.customer_name}</td>
                    <td>{r.customer_phone}</td>
                    <td><span className="badge badge-info">#{r.invoice_no}</span></td>
                    <td>{r.booking_date}</td>
                    <td>{r.return_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
