import { useState } from 'react';

const OccupancyOverview = ({ occupancyData }) => {
  const [hostelType, setHostelType] = useState('boys');
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [selectedBlock, setSelectedBlock] = useState('all');

  if (!occupancyData) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  const data = occupancyData[hostelType];

  let blocks = [];
  if (selectedFloor === 'all') {
    // Aggregate all floors
    Object.keys(data).forEach(floor => {
      Object.keys(data[floor]).forEach(block => {
        const existing = blocks.find(b => b.block === block);
        if (existing) {
          existing.occupied += data[floor][block].occupied;
          existing.total += data[floor][block].total;
        } else {
          blocks.push({
            block,
            floor: 'All',
            occupied: data[floor][block].occupied,
            total: data[floor][block].total
          });
        }
      });
    });
  } else {
    // Show specific floor
    const floorData = data[selectedFloor];
    blocks = Object.keys(floorData).map(block => ({
      block,
      floor: selectedFloor,
      occupied: floorData[block].occupied,
      total: floorData[block].total
    }));
  }

  if (selectedBlock !== 'all') {
    blocks = blocks.filter(b => b.block === selectedBlock);
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Occupancy Overview</h3>
        <p className="card-description">Room occupancy by floor and block</p>
      </div>
      <div className="card-content">
        <div className="filters-bar" style={{ marginBottom: '1.5rem' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '150px' }}>
            <label className="form-label" style={{ fontSize: '0.8125rem' }}>Hostel</label>
            <select
              className="form-select"
              value={hostelType}
              onChange={(e) => setHostelType(e.target.value)}
            >
              <option value="boys">Boys Hostel</option>
              <option value="girls">Girls Hostel</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '120px' }}>
            <label className="form-label" style={{ fontSize: '0.8125rem' }}>Floor</label>
            <select
              className="form-select"
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
            >
              <option value="all">All Floors</option>
              <option value="1">Floor 1</option>
              <option value="2">Floor 2</option>
              <option value="3">Floor 3</option>
              <option value="4">Floor 4</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '120px' }}>
            <label className="form-label" style={{ fontSize: '0.8125rem' }}>Block</label>
            <select
              className="form-select"
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
            >
              <option value="all">All Blocks</option>
              <option value="A">Block A</option>
              <option value="B">Block B</option>
              <option value="C">Block C</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3">
          {blocks.map((blockData, idx) => {
            const percentage = Math.round((blockData.occupied / blockData.total) * 100);
            return (
              <div key={idx} style={{
                padding: '1rem',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  Block {blockData.block}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'hsl(var(--primary))' }}>
                  {blockData.occupied}/{blockData.total}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                  {percentage}% occupied
                </div>
                <div style={{
                  marginTop: '0.75rem',
                  height: '8px',
                  backgroundColor: 'hsl(var(--secondary))',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    backgroundColor: percentage > 90 ? 'hsl(var(--warning))' : 'hsl(var(--primary))',
                    transition: 'width 0.3s'
                  }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OccupancyOverview;
