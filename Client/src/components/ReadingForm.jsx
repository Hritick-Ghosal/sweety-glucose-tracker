import { useState, useEffect } from "react";
import { apiRequest } from "../api";

const SLOTS = ["Morning", "After breakfast", "After lunch", "After dinner"];

export default function ReadingForm({
  selectedDate,
  existingReadingsForDate,
  editingReading,
  onCancelEdit,
  onSaved,
}) {
  const [date, setDate] = useState(selectedDate);
  const [timeSlot, setTimeSlot] = useState("Morning");
  const [glucoseValue, setGlucoseValue] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingReading) {
      const cleanDate = editingReading.reading_date
        ? String(editingReading.reading_date).slice(0, 10)
        : selectedDate;
      setDate(cleanDate);
      setTimeSlot(editingReading.time_slot);
      setGlucoseValue(String(editingReading.glucose_value));
      setError("");
    } else {
      setDate(selectedDate);
      setGlucoseValue("");
      setError("");
    }
  }, [editingReading, selectedDate]);

  const getTodayString = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const validateClientSide = () => {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return "Please select a valid date.";
    }

    if (date > getTodayString()) {
      return "Date cannot be in the future.";
    }

    if (glucoseValue === "" || String(glucoseValue).trim() === "") {
      return "Please enter a glucose value.";
    }

    const num = Number(glucoseValue);
    if (!Number.isInteger(num) || num < 40 || num > 600) {
      return "Value must be between 40 and 600 mg/dl.";
    }

    if (date === selectedDate) {
      const others = existingReadingsForDate.filter(
        (r) => !editingReading || r.id !== editingReading.id
      );

      if (others.length >= 4) {
        return "You can add only 4 readings per day.";
      }

      if (others.some((r) => r.time_slot === timeSlot)) {
        return `You already have an ${timeSlot} reading for this date.`;
      }
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const clientError = validateClientSide();
    if (clientError) {
      setError(clientError);
      return;
    }

    setSubmitting(true);
    try {
      if (editingReading) {
        await apiRequest(`/readings/${editingReading.id}`, {
          method: "PUT",
          body: JSON.stringify({
            reading_date: date,
            time_slot: timeSlot,
            glucose_value: Number(glucoseValue),
          }),
        });
      } else {
        await apiRequest("/readings", {
          method: "POST",
          body: JSON.stringify({
            reading_date: date,
            time_slot: timeSlot,
            glucose_value: Number(glucoseValue),
          }),
        });
      }

      setGlucoseValue("");
      onSaved(date);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h2>{editingReading ? "Edit Glucose Reading" : "Add Glucose Reading"}</h2>

      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="reading-form" noValidate>
        <div className="form-group">
          <label htmlFor="reading-date">Date</label>
          <input
            id="reading-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="time-slot">Time Slot</label>
          <select
            id="time-slot"
            value={timeSlot}
            onChange={(e) => setTimeSlot(e.target.value)}
          >
            {SLOTS.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="glucose-value">Glucose (mg/dl)</label>
          <input
            id="glucose-value"
            type="number"
            placeholder="40 - 600"
            value={glucoseValue}
            onChange={(e) => setGlucoseValue(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting
              ? "Saving..."
              : editingReading
              ? "Update Reading"
              : "Save Reading"}
          </button>

          {editingReading && (
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancelEdit}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}