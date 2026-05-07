import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchBills, fetchBill, updateBillStatus, deleteBill } from '../utils/api'
import PrintPreviewModal from '../components/PrintPreviewModal'
import './PreviousBills.css'

export default function PreviousBills() {
  const navigate = useNavigate()
  const [bills, setBills] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedBill, setSelectedBill] = useState(null)
  const [toast, setToast] = useState(null)
  const [printHTML, setPrintHTML] = useState(null)

  useEffect(() => { load() }, [search, statusFilter])

  async function load() {
    const params = {}
    if (search) params.search = search
    if (statusFilter) params.status = statusFilter
    setBills(await fetchBills(params))
  }

  function showToast(msg, type = 'success') {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function viewBill(id) {
    const bill = await fetchBill(id)
    setSelectedBill(bill)
  }

  async function markReturned(id) {
    try {
      await updateBillStatus(id, 'returned')
      showToast('Marked as returned ✨')
      setSelectedBill(null)
      load()
    } catch { showToast('Failed to update', 'error') }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this bill?')) return
    try {
      await deleteBill(id)
      showToast('Bill deleted')
      setSelectedBill(null)
      load()
    } catch { showToast('Failed to delete', 'error') }
  }

  function printBill(bill) {
    const html = `
      <html><head><title>Invoice #${bill.invoice_no}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; padding: 30px; color: #1a1a2e; }
        .hdr { text-align:center; border-bottom:2px solid #1a1a5e; padding-bottom:15px; margin-bottom:20px; }
        .hdr h2 { color:#1a1a5e; margin-top: 10px; }
        .hdr p { font-size:11px; color:#666; }
        .meta { display:flex; justify-content:space-between; font-size:13px; margin:10px 0; }
        table { width:100%; border-collapse:collapse; margin:15px 0; }
        th { background:#1a1a5e; color:white; padding:8px; font-size:12px; text-align:left; }
        td { padding:7px 8px; border-bottom:1px solid #ddd; font-size:13px; }
        .totals { width:250px; margin-left:auto; }
        .totals td { border:1px solid #ccc; font-weight:bold; }
        .payment-info { margin-top:20px; font-size:13px; padding: 10px; background: #f8f9fa; border-radius: 6px; }
        .sig { display:flex; justify-content:space-between; margin-top:60px; font-size:13px; }
      </style></head><body>
      <div class="hdr">
        <img src="${window.location.origin}/logo.jpg" alt="Logo" style="height: 70px; object-fit: contain; border-radius: 8px;" />
        <div style="font-size:13px; margin-top:5px; font-weight:bold;">📞 8098790374 / 8374139827</div>
        <h2>Bridal Academy | Rental Jewellery</h2>
        <p>KRD Complex, 2nd Floor, Chennai - Kumbakonam Road, Indira Nagar, Neyveli - 607 801</p>
        <p>E-mail: ksmakeoverartistry@gmail.com</p>
      </div>
      <div class="meta"><div><b>Invoice:</b> #${bill.invoice_no}</div><div><b>Date:</b> ${bill.booking_date}</div><div><b>Phone:</b> ${bill.customer_phone}</div></div>
      <div class="meta"><div><b>Name:</b> ${bill.customer_name}</div><div><b>Address:</b> ${bill.customer_address}</div></div>
      <div class="meta"><div><b>Booking:</b> ${bill.booking_date}</div><div><b>Return:</b> ${bill.return_date}</div></div>
      <table><thead><tr><th>S.No</th><th>Jewellery</th><th>Description</th><th>Qty</th><th>Amount</th></tr></thead>
      <tbody>${(bill.items || []).map((it, i) => `<tr><td>${i+1}</td><td>${it.jewellery_name}</td><td>${it.description}</td><td>${it.quantity}</td><td>₹${it.amount}</td></tr>`).join('')}</tbody></table>
      <table class="totals">
        ${bill.discount > 0 ? `<tr><td style="color:#e74c3c">Discount</td><td style="color:#e74c3c">-₹${bill.discount}</td></tr>` : ''}
        <tr><td>Total</td><td>₹${bill.total}</td></tr>
        <tr><td>Advance</td><td>₹${bill.advance}</td></tr>
        <tr><td>Balance</td><td>₹${bill.balance}</td></tr>
      </table>
      ${(bill.advance_payment_mode || bill.balance_payment_mode) ? `
      <div class="payment-info">
        ${bill.advance_payment_mode ? `<div><strong>Advance Payment:</strong> ${bill.advance_payment_mode.toUpperCase().replace('_', ' ')}</div>` : ''}
        ${bill.balance_payment_mode ? `<div><strong>Balance Payment:</strong> ${bill.balance_payment_mode.toUpperCase().replace('_', ' ')}</div>` : ''}
      </div>` : ''}
      <div class="sig"><div>Customer Signature</div><div>KS Bridal Academy & Rental Jewellery</div></div>
      </body></html>
    `;
    setPrintHTML(html);
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'active': return <span className="badge badge-info">Active</span>
      case 'returned': return <span className="badge badge-success">Returned</span>
      case 'overdue': return <span className="badge badge-danger">Overdue</span>
      default: return <span className="badge">{status}</span>
    }
  }

  return (
    <div className="previous-bills-page">
      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}>{toast.message}</div></div>}

      <div className="page-header">
        <h1>🧾 <span>Previous</span> Bills</h1>
        <p>View and manage all past rental invoices</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🧾</div>
          <div className="stat-value">{bills.length}</div>
          <div className="stat-label">Total Bills</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔵</div>
          <div className="stat-value">{bills.filter(b => b.status === 'active').length}</div>
          <div className="stat-label">Active Rentals</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{bills.filter(b => b.status === 'returned').length}</div>
          <div className="stat-label">Returned</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-value">₹{bills.reduce((s, b) => s + b.total, 0).toLocaleString('en-IN')}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <input type="text" placeholder="Search by name, invoice, phone..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{width:'160px'}}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="returned">Returned</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {bills.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🧾</div>
          <h3>No bills found</h3>
          <p>Create your first bill from the Billing page</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Booking</th>
                <th>Return</th>
                <th>Total</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.map(bill => (
                <tr key={bill.id}>
                  <td><strong style={{color:'var(--gold-light)'}}>#{bill.invoice_no}</strong></td>
                  <td>{bill.customer_name}</td>
                  <td>{bill.customer_phone}</td>
                  <td>{bill.booking_date}</td>
                  <td>{bill.return_date}</td>
                  <td>₹{bill.total.toLocaleString('en-IN')}</td>
                  <td style={{color: bill.balance > 0 ? 'var(--warning)' : 'var(--success)'}}>₹{bill.balance.toLocaleString('en-IN')}</td>
                  <td>{getStatusBadge(bill.status)}</td>
                  <td>
                    <div style={{display:'flex',gap:'6px'}}>
                      <button className="btn-icon" title="View" onClick={() => viewBill(bill.id)}>👁️</button>
                      <button className="btn-icon" title="Edit" onClick={() => navigate(`/edit-bill/${bill.id}`)}>✏️</button>
                      <button className="btn-icon" title="Print" onClick={async () => { const b = await fetchBill(bill.id); printBill(b); }}>🖨️</button>
                      {bill.status === 'active' && <button className="btn-icon" title="Mark Returned" onClick={() => markReturned(bill.id)} style={{color:'var(--success)'}}>✅</button>}
                      <button className="btn-icon" title="Delete" onClick={() => handleDelete(bill.id)} style={{color:'var(--danger)'}}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bill Detail Modal */}
      {selectedBill && (
        <div className="modal-overlay" onClick={() => setSelectedBill(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:'600px'}}>
            <div className="modal-header">
              <h2>Invoice #{selectedBill.invoice_no}</h2>
              <button className="btn-icon" onClick={() => setSelectedBill(null)}>✕</button>
            </div>
            <div className="bill-detail-grid">
              <div><span className="detail-label">Customer</span><span>{selectedBill.customer_name}</span></div>
              <div><span className="detail-label">Phone</span><span>{selectedBill.customer_phone}</span></div>
              <div><span className="detail-label">Address</span><span>{selectedBill.customer_address}</span></div>
              <div><span className="detail-label">Status</span>{getStatusBadge(selectedBill.status)}</div>
              <div><span className="detail-label">Booking</span><span>{selectedBill.booking_date}</span></div>
              <div><span className="detail-label">Return</span><span>{selectedBill.return_date}</span></div>
            </div>

            <h3 style={{color:'var(--gold)', margin:'16px 0 8px', fontSize:'15px'}}>Items</h3>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Jewellery</th><th>Description</th><th>Qty</th><th>Amount</th></tr></thead>
                <tbody>
                  {(selectedBill.items || []).map((item, i) => (
                    <tr key={i}>
                      <td>{item.jewellery_name}</td>
                      <td style={{color:'var(--text-muted)'}}>{item.description}</td>
                      <td>{item.quantity}</td>
                      <td>₹{item.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bill-totals-detail">
              <div><span>Total</span><span>₹{selectedBill.total.toLocaleString('en-IN')}</span></div>
              <div><span>Advance</span><span>₹{selectedBill.advance.toLocaleString('en-IN')}</span></div>
              <div className="balance-highlight"><span>Balance</span><span>₹{selectedBill.balance.toLocaleString('en-IN')}</span></div>
            </div>

            <div className="modal-actions">
              {selectedBill.status === 'active' && (
                <button className="btn btn-success" onClick={() => markReturned(selectedBill.id)}>✅ Mark Returned</button>
              )}
              <button className="btn btn-secondary" onClick={() => printBill(selectedBill)}>🖨️ Print</button>
              <button className="btn btn-secondary" onClick={() => setSelectedBill(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {printHTML && (
        <PrintPreviewModal billHTML={printHTML} onClose={() => setPrintHTML(null)} />
      )}
    </div>
  )
}
