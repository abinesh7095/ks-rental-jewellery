import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchInventory, fetchNextInvoice, createBill, updateBill, fetchBill } from '../utils/api'
import PrintPreviewModal from '../components/PrintPreviewModal'
import './BillingPage.css'

const DEFAULT_ITEMS = [
  'Necklace', 'Haram', 'Hipbelt', 'Vangi', 'Earing',
  'Tikka', 'Ring', 'Bangle', 'Jadabilla', 'Maattai'
]

const PAYMENT_MODES = [
  { value: '', label: 'Select Mode' },
  { value: 'cash', label: '💵 Cash' },
  { value: 'upi', label: '📱 UPI' },
  { value: 'gpay', label: '🟢 GPay' },
  { value: 'phonepay', label: '🟣 PhonePe' },
  { value: 'bank_transfer', label: '🏦 Bank Transfer' },
]

export default function BillingPage() {
  const { id: editId } = useParams()
  const navigate = useNavigate()
  const isEditMode = !!editId

  const [invoiceNo, setInvoiceNo] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [bookingDate, setBookingDate] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [products, setProducts] = useState([])
  const [toast, setToast] = useState(null)
  const [billLoaded, setBillLoaded] = useState(false)
  const [printHTML, setPrintHTML] = useState(null)
  const printRef = useRef()

  const [items, setItems] = useState(
    DEFAULT_ITEMS.map((name, i) => ({
      sno: i + 1,
      jewellery_name: name,
      description: '',
      quantity: 0,
      unit_price: 0,
      amount: 0,
      product_id: null
    }))
  )
  const [advance, setAdvance] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState('flat') // 'flat' or 'percent'
  const [advancePaymentMode, setAdvancePaymentMode] = useState('')
  const [balancePaymentMode, setBalancePaymentMode] = useState('')

  useEffect(() => {
    loadProducts().then(() => {
      if (isEditMode && !billLoaded) {
        loadBillForEdit(editId)
      } else if (!isEditMode) {
        loadInvoice()
      }
    })
  }, [editId])

  async function loadInvoice() {
    try {
      const data = await fetchNextInvoice()
      setInvoiceNo(data.invoice_no)
    } catch { setInvoiceNo('1001') }
  }

  async function loadProducts() {
    try {
      const data = await fetchInventory()
      setProducts(data)
      // Only auto-map when NOT in edit mode (edit mode sets its own items)
      if (!isEditMode || !billLoaded) {
        setItems(prev => prev.map(item => {
          const match = data.find(p => p.name.toLowerCase() === item.jewellery_name.toLowerCase())
          if (match) {
            const unitPrice = match.rental_price || 0
            return {
              ...item,
              product_id: match.id,
              unit_price: unitPrice,
              amount: item.quantity > 0 ? item.quantity * unitPrice : 0
            }
          }
          return item
        }))
      }
      return data
    } catch { return [] }
  }

  async function loadBillForEdit(billId) {
    try {
      const bill = await fetchBill(billId)
      const prods = await fetchInventory()
      setInvoiceNo(bill.invoice_no)
      setCustomerName(bill.customer_name)
      setCustomerPhone(bill.customer_phone || '')
      setCustomerAddress(bill.customer_address || '')
      setBookingDate(bill.booking_date)
      setReturnDate(bill.return_date)
      setAdvance(bill.advance || 0)
      setDiscount(bill.discount || 0)
      setDiscountType('flat') // stored discount is always flat amount
      setAdvancePaymentMode(bill.advance_payment_mode || '')
      setBalancePaymentMode(bill.balance_payment_mode || '')

      // Map bill items with unit_price from inventory
      const billItems = (bill.items || []).map((item, i) => {
        const match = prods.find(p => p.id === item.product_id)
        const unitPrice = match ? match.rental_price : (item.quantity > 0 ? item.amount / item.quantity : 0)
        return {
          sno: i + 1,
          jewellery_name: item.jewellery_name,
          description: item.description || '',
          quantity: item.quantity,
          unit_price: unitPrice,
          amount: item.amount,
          product_id: item.product_id
        }
      })
      setItems(billItems.length > 0 ? billItems : DEFAULT_ITEMS.map((name, i) => ({
        sno: i + 1, jewellery_name: name, description: '', quantity: 0,
        unit_price: 0, amount: 0, product_id: null
      })))
      setBillLoaded(true)
    } catch (err) {
      showToast('Failed to load bill for editing', 'error')
    }
  }

  const subtotal = items.reduce((s, i) => s + (i.amount || 0), 0)
  const discountAmount = discountType === 'percent'
    ? Math.round((subtotal * (discount || 0)) / 100)
    : (discount || 0)
  const total = Math.max(subtotal - discountAmount, 0)
  const balance = total - (advance || 0)

  function updateItem(index, field, value) {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      if (field === 'description') {
        return { ...item, description: value }
      }
      const numVal = Number(value) || 0
      if (field === 'quantity') {
        // Auto-calculate amount = quantity × unit_price
        return {
          ...item,
          quantity: numVal,
          amount: numVal * (item.unit_price || 0)
        }
      }
      if (field === 'amount') {
        // Manual override of amount
        return { ...item, amount: numVal }
      }
      return { ...item, [field]: numVal }
    }))
  }

  // When jewellery name changes, auto-fill unit_price from inventory and recalculate
  function updateItemName(index, value) {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const match = products.find(p => p.name.toLowerCase() === value.toLowerCase())
      const unitPrice = match ? match.rental_price : 0
      return {
        ...item,
        jewellery_name: value,
        product_id: match ? match.id : null,
        unit_price: unitPrice,
        amount: item.quantity > 0 ? item.quantity * unitPrice : 0
      }
    }))
  }

  function addRow() {
    setItems(prev => [...prev, {
      sno: prev.length + 1,
      jewellery_name: '',
      description: '',
      quantity: 0,
      unit_price: 0,
      amount: 0,
      product_id: null
    }])
  }

  function removeRow(index) {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, sno: i + 1 })))
  }

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSave() {
    if (!customerName.trim()) return showToast('Please enter customer name', 'error')
    if (!bookingDate) return showToast('Please select booking date', 'error')
    if (!returnDate) return showToast('Please select return date', 'error')
    const activeItems = items.filter(i => i.quantity > 0)
    if (activeItems.length === 0) return showToast('Please add at least one item', 'error')

    const billData = {
      invoice_no: invoiceNo,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      booking_date: bookingDate,
      return_date: returnDate,
      total,
      discount: discountAmount,
      advance: advance || 0,
      balance,
      advance_payment_mode: advancePaymentMode,
      balance_payment_mode: balancePaymentMode,
      items: activeItems
    }

    try {
      if (isEditMode) {
        await updateBill(editId, billData)
        showToast('Bill updated successfully! ✨')
        setTimeout(() => navigate('/previous-bills'), 1000)
      } else {
        await createBill(billData)
        showToast('Bill saved successfully! ✨')
        handleClear()
        loadInvoice()
      }
      loadProducts()
    } catch (err) {
      showToast(isEditMode ? 'Failed to update bill' : 'Failed to save bill', 'error')
    }
  }

  function handleClear() {
    setCustomerName(''); setCustomerPhone(''); setCustomerAddress('')
    setBookingDate(''); setReturnDate(''); setAdvance(0)
    setDiscount(0); setDiscountType('flat')
    setAdvancePaymentMode(''); setBalancePaymentMode('')
    setItems(DEFAULT_ITEMS.map((name, i) => {
      const match = products.find(p => p.name.toLowerCase() === name.toLowerCase())
      return {
        sno: i + 1, jewellery_name: name, description: '', quantity: 0,
        unit_price: match?.rental_price || 0,
        amount: 0,
        product_id: match?.id || null
      }
    }))
  }

  function getPaymentLabel(mode) {
    const found = PAYMENT_MODES.find(pm => pm.value === mode)
    return found ? found.label : mode || '—'
  }

  function handlePrint() {
    const html = `
      <html><head><title>Invoice #${invoiceNo}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; padding: 30px; color: #1a1a2e; }
        .inv-header { text-align:center; margin-bottom:20px; border-bottom: 2px solid #1a1a5e; padding-bottom:15px; }
        .inv-brand { font-size:22px; font-weight:bold; color:#1a1a5e; margin-bottom:4px; }
        .inv-addr { font-size:11px; color:#444; }
        .inv-meta { display:flex; justify-content:space-between; margin:15px 0; font-size:13px; }
        .inv-meta div { flex:1; }
        .inv-dates { display:flex; justify-content:space-between; margin:10px 0 15px; font-size:13px; }
        table { width:100%; border-collapse:collapse; margin:10px 0; }
        th { background:#1a1a5e; color:white; padding:8px 10px; font-size:12px; text-align:left; }
        td { padding:7px 10px; border-bottom:1px solid #ddd; font-size:13px; }
        .totals { width:320px; margin-left:auto; margin-top:10px; }
        .totals td { border:1px solid #ccc; font-weight:bold; }
        .totals .discount-row td { color:#e74c3c; }
        .payment-info { margin-top:20px; display:flex; justify-content:space-between; font-size:13px; padding: 10px; background: #f8f9fa; border-radius: 6px; }
        .payment-info div { }
        .payment-label { font-weight: bold; color: #1a1a5e; }
        .sig { display:flex; justify-content:space-between; margin-top:50px; font-size:13px; }
      </style></head><body>
      <div class="inv-header">
        <img src="${window.location.origin}/logo.jpg" alt="Logo" style="height: 70px; object-fit: contain; border-radius: 8px; margin-bottom: 5px;" />
        <div style="font-size:14px; font-weight:bold;">📞 8098790374 / 8374139827</div>
        <div class="inv-brand">Bridal Academy | Rental Jewellery</div>
        <div class="inv-addr">KRD Complex, 2nd Floor, Chennai - Kumbakonam Road, Indira Nagar, Neyveli - 607 801</div>
        <div class="inv-addr">E-mail: ksmakeoverartistry@gmail.com</div>
      </div>
      <div class="inv-meta">
        <div><strong>Invoice No:</strong> ${invoiceNo}</div>
        <div style="text-align:center"><strong>Date:</strong> ${bookingDate}</div>
        <div style="text-align:right"><strong>Phone:</strong> ${customerPhone}</div>
      </div>
      <div class="inv-meta">
        <div><strong>Name:</strong> ${customerName}</div>
        <div style="text-align:right"><strong>Address:</strong> ${customerAddress}</div>
      </div>
      <div class="inv-dates">
        <div><strong>Booking Date:</strong> ${bookingDate}</div>
        <div><strong>Return Date:</strong> ${returnDate}</div>
      </div>
      <table>
        <thead><tr><th>S.No</th><th>Jewellery</th><th>Description</th><th>Qty</th><th>Amount</th></tr></thead>
        <tbody>
          ${items.map((item, i) => `<tr><td>${i + 1}</td><td>${item.jewellery_name}</td><td>${item.description}</td><td>${item.quantity || ''}</td><td>${item.amount ? '₹' + item.amount : ''}</td></tr>`).join('')}
        </tbody>
      </table>
      <table class="totals">
        <tr><td>Subtotal</td><td>₹${subtotal.toLocaleString('en-IN')}</td></tr>
        ${discountAmount > 0 ? `<tr class="discount-row"><td>Discount</td><td>-₹${discountAmount.toLocaleString('en-IN')}</td></tr>` : ''}
        <tr><td>Total</td><td>₹${total.toLocaleString('en-IN')}</td></tr>
        <tr><td>Advance</td><td>₹${(advance || 0).toLocaleString('en-IN')}</td></tr>
        <tr><td>Balance</td><td>₹${balance.toLocaleString('en-IN')}</td></tr>
      </table>
      ${(advancePaymentMode || balancePaymentMode) ? `
      <div class="payment-info">
        ${advancePaymentMode ? `<div><span class="payment-label">Advance Payment:</span> ${getPaymentLabel(advancePaymentMode).replace(/[^\w\s]/g, '')}</div>` : ''}
        ${balancePaymentMode ? `<div><span class="payment-label">Balance Payment:</span> ${getPaymentLabel(balancePaymentMode).replace(/[^\w\s]/g, '')}</div>` : ''}
      </div>` : ''}
      <div class="sig">
        <div>Customer Signature</div>
        <div>KS Bridal Academy & Rental Jewellery</div>
      </div>
      </body></html>
    `;
    setPrintHTML(html);
  }

  return (
    <div className="billing-page">
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.message}</div>
        </div>
      )}

      <div className="page-header">
        <h1>📋 {isEditMode ? 'Edit ' : 'Create '}<span>Invoice</span></h1>
        <p>{isEditMode ? `Updating Invoice #${invoiceNo}` : 'Generate a new rental bill matching your invoice format'}</p>
      </div>

      <div className="invoice-card" ref={printRef}>
        {/* Invoice Header */}
        <div className="invoice-header">
          <img src="/logo.jpg" alt="KS Logo" className="inv-logo" />
          <div className="inv-brand-info">
            <div className="inv-phones">📞 8098790374 / 8374139827</div>
            <h2 className="inv-title">Bridal Academy | Rental Jewellery</h2>
            <p className="inv-address">KRD Complex, 2nd Floor, Chennai - Kumbakonam Road, Indira Nagar, Neyveli - 607 801</p>
            <p className="inv-email">E-mail: ksmakeoverartistry@gmail.com</p>
          </div>
          <div className="inv-social">
            <span>@ksmakeoverartistry</span>
            <span>@ksrentaljewellery</span>
          </div>
        </div>

        {/* Customer Info */}
        <div className="inv-section">
          <div className="inv-row-3">
            <div className="inv-field">
              <label>Invoice No</label>
              <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className="form-input" />
            </div>
            <div className="inv-field">
              <label>Date</label>
              <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="form-input" />
            </div>
            <div className="inv-field">
              <label>Phone</label>
              <input type="text" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="form-input" placeholder="Customer phone" />
            </div>
          </div>
          <div className="inv-row-2">
            <div className="inv-field">
              <label>Name</label>
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="form-input" placeholder="Customer name" />
            </div>
            <div className="inv-field">
              <label>Address</label>
              <input type="text" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} className="form-input" placeholder="Customer address" />
            </div>
          </div>
          <div className="inv-row-2">
            <div className="inv-field">
              <label>Booking Date</label>
              <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="form-input" />
            </div>
            <div className="inv-field">
              <label>Return Date</label>
              <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className="form-input" />
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="inv-table-section">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{width:'50px'}}>S.No</th>
                  <th style={{width:'150px'}}>Jewellery</th>
                  <th>Description</th>
                  <th style={{width:'70px'}}>Qty</th>
                  <th style={{width:'100px'}}>Rate (₹)</th>
                  <th style={{width:'120px'}}>Amount (₹)</th>
                  <th style={{width:'40px'}}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="sno">{i + 1}</td>
                    <td>
                      <div className="jewellery-select-wrapper">
                        <input
                          type="text"
                          value={item.jewellery_name}
                          onChange={e => updateItemName(i, e.target.value)}
                          className="table-input"
                          list={`product-list-${i}`}
                          placeholder="Select item..."
                        />
                        <datalist id={`product-list-${i}`}>
                          {products.map(p => (
                            <option key={p.id} value={p.name}>
                              {p.name} — ₹{p.rental_price} ({p.available_stock} avail.)
                            </option>
                          ))}
                        </datalist>
                      </div>
                    </td>
                    <td>
                      <input type="text" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} className="table-input" placeholder="Details..." />
                    </td>
                    <td>
                      <input type="number" min="0" value={item.quantity || ''} onChange={e => updateItem(i, 'quantity', e.target.value)} className="table-input qty" />
                    </td>
                    <td>
                      <div className="rate-cell">
                        <span className={`rate-value ${item.unit_price > 0 ? 'has-rate' : ''}`}>
                          {item.unit_price > 0 ? `₹${item.unit_price.toLocaleString('en-IN')}` : '—'}
                        </span>
                        {item.product_id && item.unit_price > 0 && (
                          <span className="auto-price-tag" title="Fetched from inventory">auto</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="amount-cell">
                        <input type="number" min="0" value={item.amount || ''} onChange={e => updateItem(i, 'amount', e.target.value)} className="table-input amount" />
                      </div>
                    </td>
                    <td>
                      {items.length > 1 && (
                        <button className="btn-remove-row" onClick={() => removeRow(i)} title="Remove row">✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={addRow} style={{marginTop: '10px'}}>+ Add Row</button>
        </div>

        {/* Totals + Discount + Payment Modes */}
        <div className="inv-totals-section">
          <div className="inv-totals">
            <div className="totals-table">
              {/* Subtotal */}
              <div className="total-row">
                <span>Subtotal</span>
                <span className="total-value">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              {/* Discount Row */}
              <div className="total-row discount-row">
                <span className="discount-label">Discount</span>
                <div className="discount-controls">
                  <div className="discount-type-toggle">
                    <button
                      className={`discount-toggle-btn ${discountType === 'flat' ? 'active' : ''}`}
                      onClick={() => setDiscountType('flat')}
                      title="Flat amount"
                    >₹</button>
                    <button
                      className={`discount-toggle-btn ${discountType === 'percent' ? 'active' : ''}`}
                      onClick={() => setDiscountType('percent')}
                      title="Percentage"
                    >%</button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={discount || ''}
                    onChange={e => setDiscount(Number(e.target.value) || 0)}
                    className="form-input discount-input"
                    placeholder={discountType === 'percent' ? '0%' : '₹0'}
                  />
                  {discountAmount > 0 && (
                    <span className="discount-computed">-₹{discountAmount.toLocaleString('en-IN')}</span>
                  )}
                </div>
              </div>

              {/* Net Total */}
              <div className="total-row net-total-row">
                <span>Total</span>
                <span className="total-value">₹{total.toLocaleString('en-IN')}</span>
              </div>

              {/* Advance + Payment Mode */}
              <div className="total-row advance-row">
                <span>Advance</span>
                <div className="payment-input-group">
                  <input
                    type="number"
                    min="0"
                    value={advance || ''}
                    onChange={e => setAdvance(Number(e.target.value) || 0)}
                    className="form-input advance-input"
                  />
                  <select
                    value={advancePaymentMode}
                    onChange={e => setAdvancePaymentMode(e.target.value)}
                    className="payment-mode-select"
                    title="Advance payment mode"
                  >
                    {PAYMENT_MODES.map(pm => (
                      <option key={pm.value} value={pm.value}>{pm.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Balance + Payment Mode */}
              <div className="total-row balance-row">
                <span>Balance</span>
                <div className="payment-input-group">
                  <span className="total-value balance-value">₹{balance.toLocaleString('en-IN')}</span>
                  <select
                    value={balancePaymentMode}
                    onChange={e => setBalancePaymentMode(e.target.value)}
                    className="payment-mode-select"
                    title="Balance payment mode"
                  >
                    {PAYMENT_MODES.map(pm => (
                      <option key={pm.value} value={pm.value}>{pm.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="inv-footer">
          <span className="sig-label">Customer Signature</span>
          <span className="shop-label">KS Bridal Academy & Rental Jewellery</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="billing-actions">
        <button className="btn btn-primary" onClick={handleSave}>💾 {isEditMode ? 'Update' : 'Save'} Bill</button>
        <button className="btn btn-secondary" onClick={handlePrint}>🖨️ Print Bill</button>
        {isEditMode ? (
          <button className="btn btn-secondary" onClick={() => navigate('/previous-bills')}>✕ Cancel Edit</button>
        ) : (
          <button className="btn btn-danger" onClick={handleClear}>🗑️ Clear</button>
        )}
      </div>

      {printHTML && (
        <PrintPreviewModal billHTML={printHTML} onClose={() => setPrintHTML(null)} />
      )}
    </div>
  )
}
