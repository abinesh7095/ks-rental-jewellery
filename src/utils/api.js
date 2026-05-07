const API = '/api';

export async function fetchInventory(search = '', category = '') {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category) params.set('category', category);
  const res = await fetch(`${API}/inventory?${params}`);
  return res.json();
}

export async function fetchCategories() {
  const res = await fetch(`${API}/inventory/categories`);
  return res.json();
}

export async function addProduct(data) {
  const res = await fetch(`${API}/inventory`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return res.json();
}

export async function updateProduct(id, data) {
  const res = await fetch(`${API}/inventory/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return res.json();
}

export async function deleteProduct(id) {
  const res = await fetch(`${API}/inventory/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function fetchNextInvoice() {
  const res = await fetch(`${API}/bills/next-invoice`);
  return res.json();
}

export async function fetchBills(params = {}) {
  const q = new URLSearchParams(params);
  const res = await fetch(`${API}/bills?${q}`);
  return res.json();
}

export async function fetchBill(id) {
  const res = await fetch(`${API}/bills/${id}`);
  return res.json();
}

export async function createBill(data) {
  const res = await fetch(`${API}/bills`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return res.json();
}

export async function updateBill(id, data) {
  const res = await fetch(`${API}/bills/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return res.json();
}

export async function updateBillStatus(id, status) {
  const res = await fetch(`${API}/bills/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
  return res.json();
}

export async function deleteBill(id) {
  const res = await fetch(`${API}/bills/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function fetchStock() {
  const res = await fetch(`${API}/stock`);
  return res.json();
}

export async function fetchRented() {
  const res = await fetch(`${API}/stock/rented`);
  return res.json();
}

export async function updateStock(id, data) {
  const res = await fetch(`${API}/stock/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return res.json();
}
