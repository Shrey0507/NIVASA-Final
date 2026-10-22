const StatCard = ({ title, value, description, icon }) => {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <h3 className="stat-card-title">{title}</h3>
        {icon && <span style={{ fontSize: '1.5rem' }}>{icon}</span>}
      </div>
      <p className="stat-card-value">{value}</p>
      {description && <p className="stat-card-description">{description}</p>}
    </div>
  );
};

export default StatCard;
