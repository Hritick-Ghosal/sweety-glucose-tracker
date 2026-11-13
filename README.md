# Sweety – Blood Glucose Tracker

A full-stack web application built with PostgreSQL, Express.js, React (Vite), and Node.js where diabetes patients can securely record up to 4 daily blood glucose readings and view Daily, Month-to-Date, and Monthly reports.

---

## Features Implemented

1. User Authentication & Data Isolation
   - Register with name, email, and password (hashed with bcryptjs; plain text passwords are never stored).
   - JWT-based login authentication (7d token expiration) ensuring authenticated users only view, edit, or delete their own glucose readings.

2. Blood Glucose Readings CRUD & Validation
   - Add, view, edit, and delete readings across 4 daily time slots: Morning, After breakfast, After lunch, and After dinner.
   - Enforces all required validation rules on both the React client and Express/PostgreSQL backend:
     - Value required: "Please enter a glucose value."
     - Range & whole-number check (40–600 mg/dl): "Value must be between 40 and 600 mg/dl."
     - One reading per slot per day: "You already have an <Slot> reading for this date."
     - Maximum 4 readings per day: "You can add only 4 readings per day."
     - No future dates: "Date cannot be in the future."

3. Reports Dashboard
   - Daily Report: Highest, lowest, average (rounded to 1 decimal place), reading count, and full slot-by-slot reading log for the selected date.
   - Month-to-Date Report: Summary statistics from the 1st of the selected month through the selected date.
   - Monthly Report: Summary statistics for the entire previous calendar month.
   - Friendly empty states when no readings exist for a selected period.

4. Paginated Readings API (Bonus)
   - Supports ?page=1&limit=20 query parameters on GET /api/readings alongside date filtering, returning pagination metadata (page, limit, total, totalPages).

---

## Tech Stack

- Frontend: React, Vite, CSS3
- Backend: Node.js, Express.js, pg (node-postgres), jsonwebtoken, bcryptjs
- Database: PostgreSQL
- Testing: Node.js built-in test runner (node:test + node:assert)

---

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)

---

## Setup & Installation

### 1. Clone the Repository
```bash
git clone [https://github.com/Hritick-Ghosal/sweety-glucose-tracker.git](https://github.com/Hritick-Ghosal/sweety-glucose-tracker.git)
cd sweety-glucose-tracker