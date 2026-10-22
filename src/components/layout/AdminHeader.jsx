import ThemeToggle from '../theme/ThemeToggle';

const AdminHeader = ({ title }) => {
  return (
    <header className="admin-header">
      <h1 className="admin-header-title">{title}</h1>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <ThemeToggle />
        <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
          Admin
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
