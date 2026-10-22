import { Link } from 'react-router-dom';

const NoticesPreview = ({ notices }) => {
  if (!notices || notices.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Notices</h3>
        </div>
        <div className="card-content">
          <div className="empty-state">
            <p className="empty-state-title">No notices published</p>
          </div>
        </div>
      </div>
    );
  }

  const getAudienceBadge = (audience) => {
    switch (audience) {
      case 'all': return <span className="badge badge-default">All Students</span>;
      case 'boys': return <span className="badge badge-default">Boys Hostel</span>;
      case 'girls': return <span className="badge badge-default">Girls Hostel</span>;
      default: return null;
    }
  };

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="card-title">Recent Notices</h3>
          <p className="card-description">Latest published announcements</p>
        </div>
        <Link to="/admin/notices" className="btn btn-ghost btn-sm">
          View All
        </Link>
      </div>
      <div className="card-content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {notices.map((notice) => (
            <div key={notice.id} style={{
              padding: '1rem',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: '600', margin: 0 }}>
                  {notice.title}
                </h4>
                {getAudienceBadge(notice.audience)}
              </div>
              <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }}>
                {notice.body.length > 120 ? notice.body.substring(0, 120) + '...' : notice.body}
              </p>
              <div style={{ fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))' }}>
                Published: {new Date(notice.publishDate).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NoticesPreview;
