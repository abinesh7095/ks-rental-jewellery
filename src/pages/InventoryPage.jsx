import { useState, useEffect } from 'react'
import { fetchInventory, fetchCategories, addProduct, updateProduct, deleteProduct } from '../utils/api'
import './InventoryPage.css'

export default function InventoryPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [form, setForm] = useState({ name: '', category: '', description: '', rental_price: '', total_stock: '', available_stock: '' })

  useEffect(() => { load() }, [search, filterCat])

  async function load() {
    const data = await fetchInventory(search, filterCat)
    setProducts(data)
    const cats = await fetchCategories()
    setCategories(cats)
  }

  function showToast(msg, type = 'success') {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function openAdd() {
    setEditingId(null)
    setForm({ name: '', category: '', description: '', rental_price: '', total_stock: '', available_stock: '' })
    setShowModal(true)
  }

  function openEdit(p) {
    setEditingId(p.id)
    setForm({ name: p.name, category: p.category, description: p.description, rental_price: p.rental_price, total_stock: p.total_stock, available_stock: p.available_stock })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name || !form.category) return showToast('Name and category required', 'error')
    try {
      if (editingId) {
        await updateProduct(editingId, { ...form, rental_price: Number(form.rental_price), total_stock: Number(form.total_stock), available_stock: Number(form.available_stock) })
        showToast('Product updated ✨')
      } else {
        await addProduct({ ...form, rental_price: Number(form.rental_price), total_stock: Number(form.total_stock) })
        showToast('Product added ✨')
      }
      setShowModal(false)
      load()
    } catch { showToast('Failed to save', 'error') }
  }

  async function handleDelete(id) {
    try {
      await deleteProduct(id)
      showToast('Product deleted')
      setConfirmDelete(null)
      load()
    } catch { showToast('Failed to delete', 'error') }
  }

  return (
    <div className="inventory-page">
      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}>{toast.message}</div></div>}

      <div className="page-header">
        <h1>💎 <span>Inventory</span> Management</h1>
        <p>Add, edit and manage your jewellery products</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-value">{products.length}</div>
          <div className="stat-label">Total Products</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏷️</div>
          <div className="stat-value">{categories.length}</div>
          <div className="stat-label">Categories</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-value">₹{products.reduce((s, p) => s + p.rental_price, 0).toLocaleString('en-IN')}</div>
          <div className="stat-label">Total Value</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{products.reduce((s, p) => s + p.available_stock, 0)}</div>
          <div className="stat-label">Available Items</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{width:'180px'}}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>
      </div>

      {/* Table */}
      {products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💎</div>
          <h3>No products found</h3>
          <p>Add your first jewellery product to get started</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Category</th>
                <th>Description</th>
                <th>Rental Price</th>
                <th>Total</th>
                <th>Available</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={p.id}>
                  <td className="text-muted">{i + 1}</td>
                  <td><strong>{p.name}</strong></td>
                  <td><span className="badge badge-gold">{p.category}</span></td>
                  <td className="text-muted">{p.description}</td>
                  <td>₹{p.rental_price.toLocaleString('en-IN')}</td>
                  <td>{p.total_stock}</td>
                  <td>{p.available_stock}</td>
                  <td>
                    {p.available_stock === 0 ? <span className="badge badge-danger">Out of Stock</span>
                      : p.available_stock <= 2 ? <span className="badge badge-warning">Low Stock</span>
                      : <span className="badge badge-success">In Stock</span>}
                  </td>
                  <td>
                    <div style={{display:'flex',gap:'6px'}}>
                      <button className="btn-icon" title="Edit" onClick={() => openEdit(p)}>✏️</button>
                      <button className="btn-icon" title="Delete" onClick={() => setConfirmDelete(p.id)} style={{color:'var(--danger)'}}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Product' : 'Add Product'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label>Product Name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Necklace" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Category *</label>
                <input className="form-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g. Necklace" list="cat-list" />
                <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div className="form-group">
                <label>Rental Price (₹)</label>
                <input className="form-input" type="number" min="0" value={form.rental_price} onChange={e => setForm({...form, rental_price: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <input className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Short description" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Total Stock</label>
                <input className="form-input" type="number" min="0" value={form.total_stock} onChange={e => setForm({...form, total_stock: e.target.value})} />
              </div>
              {editingId && (
                <div className="form-group">
                  <label>Available Stock</label>
                  <input className="form-input" type="number" min="0" value={form.available_stock} onChange={e => setForm({...form, available_stock: e.target.value})} />
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{editingId ? 'Update' : 'Add'} Product</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:'400px'}}>
            <div className="modal-header"><h2>Confirm Delete</h2></div>
            <p style={{color:'var(--text-secondary)', marginBottom:'20px'}}>Are you sure you want to delete this product? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
