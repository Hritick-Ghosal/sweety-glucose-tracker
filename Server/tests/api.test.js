const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../server");
const { pool } = require("../config/db");

let server;
let baseUrl;
let token;
let createdReadingId;

const testEmail = `test_${Date.now()}@sweety.com`;
const today = new Date().toISOString().split("T")[0];

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await pool.query("DELETE FROM users WHERE email = $1", [testEmail]);
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

describe("Sweety API Integration & Validation Tests", () => {
  it("registers a new user and logs in with JWT", async () => {
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Patient",
        email: testEmail,
        password: "Password123",
      }),
    });
    assert.equal(regRes.status, 201);

    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: "Password123",
      }),
    });
    const loginData = await loginRes.json();
    assert.equal(loginRes.status, 200);
    assert.ok(loginData.token);
    token = loginData.token;
  });

  it("rejects missing glucose value with exact error message", async () => {
    const res = await fetch(`${baseUrl}/api/readings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        reading_date: today,
        time_slot: "Morning",
        glucose_value: "",
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.message, "Please enter a glucose value.");
  });

  it("rejects out-of-range or decimal glucose value", async () => {
    const res = await fetch(`${baseUrl}/api/readings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        reading_date: today,
        time_slot: "Morning",
        glucose_value: 650,
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.message, "Value must be between 40 and 600 mg/dl.");
  });

  it("rejects future dates", async () => {
    const res = await fetch(`${baseUrl}/api/readings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        reading_date: "2099-12-31",
        time_slot: "Morning",
        glucose_value: 110,
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.message, "Date cannot be in the future.");
  });

  it("creates a valid reading and blocks duplicate slot on same date", async () => {
    const createRes = await fetch(`${baseUrl}/api/readings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        reading_date: today,
        time_slot: "After lunch",
        glucose_value: 145,
      }),
    });
    const createData = await createRes.json();
    assert.equal(createRes.status, 201);
    createdReadingId = createData.reading.id;

    const dupRes = await fetch(`${baseUrl}/api/readings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        reading_date: today,
        time_slot: "After lunch",
        glucose_value: 150,
      }),
    });
    const dupData = await dupRes.json();
    assert.equal(dupRes.status, 409);
    assert.equal(
      dupData.message,
      "You already have an After lunch reading for this date."
    );
  });

  it("enforces maximum 4 readings per day and calculates reports accurately", async () => {
    const remainingSlots = ["Morning", "After breakfast", "After dinner"];
    for (const slot of remainingSlots) {
      const res = await fetch(`${baseUrl}/api/readings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reading_date: today,
          time_slot: slot,
          glucose_value: 120,
        }),
      });
      assert.equal(res.status, 201);
    }

    // 5th reading on same day must fail with max 4 message
    const fifthRes = await fetch(`${baseUrl}/api/readings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        reading_date: today,
        time_slot: "Morning",
        glucose_value: 110,
      }),
    });
    const fifthData = await fifthRes.json();
    assert.equal(fifthRes.status, 400);
    assert.equal(fifthData.message, "You can add only 4 readings per day.");

    // Check report stats: readings are 145, 120, 120, 120 -> avg 126.3
    const reportRes = await fetch(`${baseUrl}/api/reports?date=${today}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const reportData = await reportRes.json();
    assert.equal(reportRes.status, 200);
    assert.equal(reportData.reports.daily.count, 4);
    assert.equal(reportData.reports.daily.highest, 145);
    assert.equal(reportData.reports.daily.lowest, 120);
    assert.equal(reportData.reports.daily.average, 126.3);
  });

  it("updates and deletes a reading", async () => {
    const putRes = await fetch(`${baseUrl}/api/readings/${createdReadingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        reading_date: today,
        time_slot: "After lunch",
        glucose_value: 135,
      }),
    });
    assert.equal(putRes.status, 200);

    const delRes = await fetch(`${baseUrl}/api/readings/${createdReadingId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(delRes.status, 200);
  });

  it("supports pagination on GET /api/readings (?page=1&limit=2)", async () => {
    const res = await fetch(`${baseUrl}/api/readings?page=1&limit=2`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.readings));
    assert.equal(data.readings.length, 2);
    assert.equal(data.pagination.page, 1);
    assert.equal(data.pagination.limit, 2);
    assert.equal(data.pagination.total, 3);
    assert.equal(data.pagination.totalPages, 2);
  });
});