import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "./api";
import AuthForm from "./components/AuthForm";
import ReadingForm from "./components/ReadingForm";
import ReportsSection from "./components/ReportsSection";
import "./App.css";

const getTodayString = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("sweety_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [reports, setReports] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [editingReading, setEditingReading] = useState(null);
  const [bannerError, setBannerError] = useState("");

  const fetchReports = useCallback(
    async (dateToLoad = selectedDate) => {
      if (!user) return;
      setLoadingReports(true);
      setBannerError("");
      try {
        const data = await apiRequest(`/reports?date=${dateToLoad}`);
        setReports(data.reports);
      } catch (err) {
        setBannerError(err.message);
      } finally {
        setLoadingReports(false);
      }
    },
    [user, selectedDate]
  );

  useEffect(() => {
    fetchReports(selectedDate);
  }, [fetchReports, selectedDate]);

  const handleLogout = () => {
    localStorage.removeItem("sweety_token");
    localStorage.removeItem("sweety_user");
    setUser(null);
    setReports(null);
    setEditingReading(null);
  };

  const handleSaved = (savedDate) => {
    setEditingReading(null);
    if (savedDate !== selectedDate) {
      setSelectedDate(savedDate);
    } else {
      fetchReports(selectedDate);
    }
  };

  const handleDeleteReading = async (id) => {
    try {
      await apiRequest(`/readings/${id}`, { method: "DELETE" });
      if (editingReading && editingReading.id === id) {
        setEditingReading(null);
      }
      fetchReports(selectedDate);
    } catch (err) {
      setBannerError(err.message);
    }
  };

  if (!user) {
    return <AuthForm onAuthSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Sweety</h1>
          <span className="tagline">Blood Glucose Tracker</span>
        </div>
        <div className="user-controls">
          <span>Welcome, {user.name}</span>
          <button type="button" className="btn-secondary" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="date-bar card">
          <label htmlFor="report-date">
            <strong>Viewing Report Date:</strong>
          </label>
          <input
            id="report-date"
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setEditingReading(null);
              setSelectedDate(e.target.value);
            }}
          />
        </div>

        {bannerError && <div className="alert error">{bannerError}</div>}

        <ReadingForm
          selectedDate={selectedDate}
          existingReadingsForDate={reports?.daily?.readings || []}
          editingReading={editingReading}
          onCancelEdit={() => setEditingReading(null)}
          onSaved={handleSaved}
        />

        <ReportsSection
          reports={reports}
          loading={loadingReports}
          onEditReading={(reading) => setEditingReading(reading)}
          onDeleteReading={handleDeleteReading}
        />
      </main>
    </div>
  );
}