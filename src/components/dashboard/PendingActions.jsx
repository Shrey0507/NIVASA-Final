import { Link } from 'react-router-dom';

const PendingActions = ({ pendingData }) => {
  if (!pendingData) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  const { openGrievances, overdueFees, pendingReturns } = pendingData;

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Pending Actions</h3>
        <p className="card-description">Items requiring attention</p>
      </div>
      <div className="card-content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Open Grievances */}
          {openGrievances && openGrievances.length > 0 && (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem'
              }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', margin: 0 }}>
                  Open Grievances
                </h4>
                <Link to="/admin/grievances?status=open" className="btn btn-ghost btn-sm">
                  View All
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {openGrievances.slice(0, 3).map((grievance) => (
                  <div key={grievance.id} style={{
                    padding: '0.75rem',
                    backgroundColor: 'hsl(var(--muted))',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.875rem'
                  }}>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                      {grievance.student}
                    </div>
                    <div style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {grievance.issue} • {grievance.days} day{grievance.days !== 1 ? 's' : ''} old
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overdue Fees */}
          {overdueFees && overdueFees.length > 0 && (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem'
              }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', margin: 0 }}>
                  Overdue Fees
                </h4>
                <Link to="/admin/fees?status=overdue" className="btn btn-ghost btn-sm">
                  View All
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {overdueFees.slice(0, 3).map((fee) => (
                  <div key={fee.id} style={{
                    padding: '0.75rem',
                    backgroundColor: 'hsl(var(--muted))',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.875rem'
                  }}>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                      {fee.student} ({fee.usn})
                    </div>
                    <div style={{ color: 'hsl(var(--muted-foreground))' }}>
                      ₹{fee.amount.toLocaleString('en-IN')} • Due: {new Date(fee.dueDate).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Returns */}
          {pendingReturns && pendingReturns.length > 0 && (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem'
              }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', margin: 0 }}>
                  Overdue Returns
                </h4>
                <Link to="/admin/movements?status=out" className="btn btn-ghost btn-sm">
                  View All
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pendingReturns.slice(0, 3).map((movement) => (
                  <div key={movement.id} style={{
                    padding: '0.75rem',
                    backgroundColor: 'hsl(var(--muted))',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.875rem'
                  }}>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                      {movement.student} ({movement.usn})
                    </div>
                    <div style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Expected: {new Date(movement.expectedReturn).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {openGrievances.length === 0 && overdueFees.length === 0 && pendingReturns.length === 0 && (
            <div className="empty-state">
              <p className="empty-state-title">No pending actions</p>
              <p>All tasks are up to date!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PendingActions;
