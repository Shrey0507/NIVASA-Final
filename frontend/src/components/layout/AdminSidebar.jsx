import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

// SVG icons - inline, no dependency needed
const Icons = {
  Dashboard: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  Students: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Rooms: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Fees: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  Mess: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
      <path d="M7 2v20"/>
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
    </svg>
  ),
  Movements: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
      <line x1="6" y1="1" x2="6" y2="4"/>
      <line x1="10" y1="1" x2="10" y2="4"/>
      <line x1="14" y1="1" x2="14" y2="4"/>
    </svg>
  ),
  Grievances: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Notices: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  Credentials: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  Menu: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
};

const navigation = [
  { name: 'Dashboard', path: '/admin', Icon: Icons.Dashboard },
  { name: 'Students', path: '/admin/students', Icon: Icons.Students },
  { name: 'Rooms', path: '/admin/rooms', Icon: Icons.Rooms },
  { name: 'Fees', path: '/admin/fees', Icon: Icons.Fees },
  { name: 'Mess', path: '/admin/mess', Icon: Icons.Mess },
  { name: 'In/Out Register', path: '/admin/movements', Icon: Icons.Movements },
  { name: 'Grievances', path: '/admin/grievances', Icon: Icons.Grievances },
  { name: 'Notices', path: '/admin/notices', Icon: Icons.Notices },
  { name: 'Credentials', path: '/admin/credentials', Icon: Icons.Credentials },
];

const AdminSidebar = () => {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const handleNavClick = () => setIsMobileOpen(false);

  return (
    <>
      <button
        className="mobile-menu-toggle"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label="Toggle sidebar"
        aria-expanded={isMobileOpen}
      >
        <Icons.Menu />
      </button>

      {isMobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsMobileOpen(false)} />
      )}

      <aside className={`admin-sidebar ${isMobileOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <Link to="/admin" className="admin-sidebar-logo">
            NIVASA
          </Link>
          <div className="admin-sidebar-tagline">Hostel Management</div>
        </div>

        <nav className="admin-sidebar-nav">
          {navigation.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`admin-sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              <item.Icon />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">A</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">Admin</div>
              <div className="sidebar-user-role">Super Admin</div>
            </div>
          </div>
        </div>
      </aside>

      <style>{`
        .admin-sidebar-tagline {
          font-size: 0.6875rem;
          color: hsl(var(--muted-foreground));
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-top: 0.125rem;
        }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.5rem;
        }

        .sidebar-user-avatar {
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8125rem;
          font-weight: 600;
          flex-shrink: 0;
        }

        .sidebar-user-info {
          min-width: 0;
        }

        .sidebar-user-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: hsl(var(--foreground));
          line-height: 1.2;
        }

        .sidebar-user-role {
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
          line-height: 1.2;
        }

        @media (max-width: 768px) {
          .mobile-menu-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 2.25rem;
            height: 2.25rem;
            padding: 0;
            border: 1px solid hsl(var(--border));
            border-radius: var(--radius);
            background-color: hsl(var(--card));
            color: hsl(var(--foreground));
            cursor: pointer;
            position: fixed;
            top: 0.875rem;
            left: 0.875rem;
            z-index: 60;
            transition: background-color 0.15s ease;
          }
          .mobile-menu-toggle:hover {
            background-color: hsl(var(--muted));
          }
          .sidebar-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background-color: rgba(0, 0, 0, 0.4);
            z-index: 30;
          }
          .admin-sidebar {
            transform: translateX(-100%);
            transition: transform 0.25s ease;
          }
          .admin-sidebar.open {
            transform: translateX(0);
          }
        }

        @media (min-width: 769px) {
          .mobile-menu-toggle,
          .sidebar-backdrop {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default AdminSidebar;
