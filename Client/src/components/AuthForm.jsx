import { useState } from "react";
import { apiRequest } from "../api";

export default function AuthForm({ onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("demo@sweety.com");
  const [password, setPassword] = useState("Sweety123");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (isRegister) {
        await apiRequest("/auth/register", {
          method: "POST",
          body: JSON.stringify({ name, email, password }),
        });
        setSuccessMsg("Registration successful! Please log in.");
        setIsRegister(false);
      } else {
        const data = await apiRequest("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        localStorage.setItem("sweety_token", data.token);
        localStorage.setItem("sweety_user", JSON.stringify(data.user));
        onAuthSuccess(data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="card auth-card">
        <h1>Sweety</h1>
        <p className="subtitle">Blood Glucose Tracker</p>

        <div className="tab-row">
          <button
            type="button"
            className={!isRegister ? "tab active" : "tab"}
            onClick={() => {
              setIsRegister(false);
              setError("");
            }}
          >
            Log In
          </button>
          <button
            type="button"
            className={isRegister ? "tab active" : "tab"}
            onClick={() => {
              setIsRegister(true);
              setName("");
              setEmail("");
              setPassword("");
              setError("");
            }}
          >
            Sign Up
          </button>
        </div>

        {error && <div className="alert error">{error}</div>}
        {successMsg && <div className="alert success">{successMsg}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="e.g. Demo Patient"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="demo@sweety.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Please wait..." : isRegister ? "Create Account" : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}