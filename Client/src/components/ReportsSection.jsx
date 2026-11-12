function StatCard({ title, subtitle, stats }) {
  return (
    <div className="card stat-card">
      <h3>{title}</h3>
      <p className="date-range">{subtitle}</p>

      {!stats || stats.count === 0 ? (
        <div className="empty-state">No readings recorded for this period.</div>
      ) : (
        <div className="stats-grid">
          <div className="stat-box">
            <span className="stat-label">Highest</span>
            <span className="stat-value high">{stats.highest} mg/dl</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Lowest</span>
            <span className="stat-value low">{stats.lowest} mg/dl</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Average</span>
            <span className="stat-value avg">{stats.average} mg/dl</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Readings</span>
            <span className="stat-value">{stats.count}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportsSection({
  reports,
  loading,
  onEditReading,
  onDeleteReading,
}) {
  if (loading) {
    return <div className="card">Loading reports...</div>;
  }

  if (!reports) {
    return null;
  }

  const { daily, monthToDate, monthly } = reports;

  return (
    <>
      <div className="reports-grid">
        <StatCard
          title="Daily Report"
          subtitle={daily.startDate}
          stats={daily}
        />
        <StatCard
          title="Month-to-Date Report"
          subtitle={`${monthToDate.startDate} to ${monthToDate.endDate}`}
          stats={monthToDate}
        />
        <StatCard
          title="Monthly Report (Previous)"
          subtitle={`${monthly.startDate} to ${monthly.endDate}`}
          stats={monthly}
        />
      </div>

      <div className="card">
        <h2>Daily Readings Log ({daily.startDate})</h2>

        {daily.readings.length === 0 ? (
          <div className="empty-state">
            No readings logged for {daily.startDate}. Add your first reading above!
          </div>
        ) : (
          <table className="readings-table">
            <thead>
              <tr>
                <th>Time Slot</th>
                <th>Glucose Value</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {daily.readings.map((reading) => (
                <tr key={reading.id}>
                  <td>{reading.time_slot}</td>
                  <td>
                    <strong>{reading.glucose_value}</strong> mg/dl
                  </td>
                  <td className="action-cell">
                    <button
                      type="button"
                      className="btn-small edit"
                      onClick={() => onEditReading(reading)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-small delete"
                      onClick={() => onDeleteReading(reading.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}