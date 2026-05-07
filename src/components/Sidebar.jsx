import { NavLink } from 'react-router-dom'
import './Sidebar.css'

export default function Sidebar() {
  const links = [
    { to: '/', icon: '📋', label: 'Billing' },
    { to: '/inventory', icon: '💎', label: 'Inventory' },
    { to: '/stock', icon: '📦', label: 'Stock' },
    { to: '/previous-bills', icon: '🧾', label: 'Previous Bills' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/logo.jpg" alt="KS Logo" className="brand-logo" />
        <div className="brand-text">
          <span className="brand-name">KS Bridal</span>
          <span className="brand-sub">Rental Jewellery</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{link.icon}</span>
            <span className="nav-label">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="footer-info">
          <span className="footer-dot"></span>
          <span>System Online</span>
        </div>
      </div>
    </aside>
  )
}
