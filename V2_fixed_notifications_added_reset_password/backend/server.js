import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

dotenv.config();
const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json());

// ======================== ROUTES ========================
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);

// ======================== HOME PAGE ========================
app.get("/", (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ClockIt Attendance Tracker API</title>
    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: 'Poppins', sans-serif;
      }

      body {
        background-color: #FAFAF0;
        color: #222;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        overflow-x: hidden;
      }

      h1 {
        font-size: 2.5rem;
        margin-bottom: 10px;
        text-align: center;
        color: #06C3A7;
        animation: fadeInDown 1s ease forwards;
      }

      p {
        font-size: 1rem;
        opacity: 0.9;
        margin-bottom: 30px;
        text-align: center;
        animation: fadeIn 2s ease forwards;
      }

      @keyframes fadeInDown {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .card {
        background: #fff;
        border: 1px solid rgba(0,0,0,0.08);
        border-radius: 16px;
        padding: 24px;
        max-width: 800px;
        width: 90%;
        box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        animation: popIn 1.3s ease forwards;
      }

      @keyframes popIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
      }

      th, td {
        text-align: left;
        padding: 12px 8px;
      }

      th {
        color: #06C3A7;
        font-size: 1rem;
        border-bottom: 1px solid rgba(0,0,0,0.1);
      }

      tr:hover {
        background-color: rgba(6,195,167,0.08);
        transition: 0.3s;
      }

      td {
        font-size: 0.95rem;
      }

      footer {
        margin-top: 30px;
        font-size: 0.8rem;
        opacity: 0.7;
      }

      .endpoint {
        color: #06C3A7;
        font-weight: 600;
        font-family: monospace;
      }

      .method {
        font-weight: 600;
        text-transform: uppercase;
      }

      .get { color: #06C3A7; }
      .post { color: #0EA5E9; }
      .put { color: #F59E0B; }
      .delete { color: #DC2626; }
    </style>
  </head>
  <body>
    <h1>ClockIt Attendance Tracker API</h1>
    <p>Backend Connected ⚡ Server running on <b>Node.js (Express + MySQL)</b></p>

    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Endpoint</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td class="method post">POST</td><td class="endpoint">/api/auth/signup</td><td>Register new user</td></tr>
          <tr><td class="method post">POST</td><td class="endpoint">/api/auth/login</td><td>Login (JWT + lockout + reset)</td></tr>
          <tr><td class="method post">POST</td><td class="endpoint">/api/auth/forgot-password</td><td>Request password reset email</td></tr>
          <tr><td class="method post">POST</td><td class="endpoint">/api/auth/reset-password</td><td>Reset password via link</td></tr>
          <tr><td class="method get">GET</td><td class="endpoint">/api/users/profile</td><td>Fetch logged-in user's profile</td></tr>
          <tr><td class="method get">GET</td><td class="endpoint">/api/notifications</td><td>Fetch user's notifications</td></tr>
        </tbody>
      </table>
    </div>

    <footer>© ${new Date().getFullYear()} ClockIt Attendance Tracker | Backend running on port ${process.env.PORT || 4000
    }</footer>

    <script>
      document.querySelectorAll('tr').forEach((row, i) => {
        row.style.opacity = '0';
        setTimeout(() => {
          row.style.transition = 'opacity 0.5s ease';
          row.style.opacity = '1';
        }, 150 * i);
      });
    </script>
  </body>
  </html>`;
  res.status(200).send(html);
});

// ======================== ERROR HANDLER ========================
app.use(errorHandler);

// ======================== SERVER START ========================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(
    `Backend Connected!! Server is running on http://localhost:${PORT}`
  )
);
