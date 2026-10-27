import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import ExcelJS from "exceljs";

const PORT = Number(process.env.PORT || 8080);
const DATA_DIR = path.resolve("data");
const TSV_FILE = path.join(DATA_DIR, "appointments.tsv");
const EXCEL_FILE = path.join(DATA_DIR, "appointments.xlsx");
const CSV_FILE = path.join(DATA_DIR, "appointments.csv");
const USERS_FILE = path.join(DATA_DIR, "users.tsv");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Medical departments and doctors
const DOCTORS = [
  "Dr. Ananya Sharma", "Dr. Rohan Mehta", "Dr. Priya Nair", "Dr. Arjun Patel",
  "Dr. Meera Iyer", "Dr. Vikram Desai", "Dr. Kavita Rao", "Dr. Aisha Khan",
  "Dr. Rahul Verma", "Dr. Neha Kulkarni", "Dr. Sanjay Joshi", "Dr. Isha Deshmukh",
  "Dr. Dev Malhotra", "Dr. Pooja Menon", "Dr. Karan Shah", "Dr. Maya Banerjee",
  "Dr. Nikhil Sinha", "Dr. Simran Gill", "Dr. Farhan Ali", "Dr. Tara Kapoor"
];

const DEPARTMENTS = [
  "Cardiology", "Dermatology", "Pediatrics", "General Medicine", "Orthopedics",
  "Neurology", "Oncology", "Gynecology", "Ophthalmology", "ENT",
  "Gastroenterology", "Endocrinology", "Psychiatry", "Pulmonology", "Urology",
  "Nephrology", "Rheumatology", "Radiology", "Dentistry", "Physiotherapy"
];

const DOCTOR_DEPARTMENTS = {
  "Dr. Ananya Sharma": "Cardiology",
  "Dr. Rohan Mehta": "Dermatology",
  "Dr. Priya Nair": "Pediatrics",
  "Dr. Arjun Patel": "General Medicine",
  "Dr. Meera Iyer": "Orthopedics",
  "Dr. Vikram Desai": "Neurology",
  "Dr. Kavita Rao": "Oncology",
  "Dr. Aisha Khan": "Gynecology",
  "Dr. Rahul Verma": "Ophthalmology",
  "Dr. Neha Kulkarni": "ENT",
  "Dr. Sanjay Joshi": "Gastroenterology",
  "Dr. Isha Deshmukh": "Endocrinology",
  "Dr. Dev Malhotra": "Psychiatry",
  "Dr. Pooja Menon": "Pulmonology",
  "Dr. Karan Shah": "Urology",
  "Dr. Maya Banerjee": "Nephrology",
  "Dr. Nikhil Sinha": "Rheumatology",
  "Dr. Simran Gill": "Radiology",
  "Dr. Farhan Ali": "Dentistry",
  "Dr. Tara Kapoor": "Physiotherapy"
};

// In-memory data
let appointments = [];
let nextAppointmentId = 1;
const usersByEmail = new Map();
let nextUserId = 1;
const sessions = new Map();

function encodeB64(str) {
  return Buffer.from(str || "", "utf8").toString("base64url");
}

function decodeB64(str) {
  try {
    return Buffer.from(str || "", "base64url").toString("utf8");
  } catch {
    return "";
  }
}

function hashPassword(password, salt) {
  return crypto.createHash("sha256").update(salt + ":" + password).digest("base64url");
}

function generateSalt() {
  return crypto.randomBytes(16).toString("base64url");
}

// Load Users
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    seedDefaultUsers();
    return;
  }
  const lines = fs.readFileSync(USERS_FILE, "utf8").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    if (parts.length < 9) continue;
    const user = {
      id: Number(parts[0]),
      name: decodeB64(parts[1]),
      email: decodeB64(parts[2]).toLowerCase(),
      phone: decodeB64(parts[3]),
      role: decodeB64(parts[4]),
      department: decodeB64(parts[5]),
      passwordHash: decodeB64(parts[6]),
      salt: decodeB64(parts[7]),
      createdAt: decodeB64(parts[8])
    };
    usersByEmail.set(user.email, user);
    nextUserId = Math.max(nextUserId, user.id + 1);
  }
  if (usersByEmail.size === 0) {
    seedDefaultUsers();
  }
}

function seedDefaultUsers() {
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");

  const staffSalt = generateSalt();
  const staff = {
    id: nextUserId++,
    name: "Omkar Fandade",
    email: "staff@carepoint.com",
    phone: "+91 95799 75307",
    role: "STAFF",
    department: "Administration",
    passwordHash: hashPassword("admin123", staffSalt),
    salt: staffSalt,
    createdAt: now
  };
  usersByEmail.set(staff.email, staff);

  const patientSalt = generateSalt();
  const patient = {
    id: nextUserId++,
    name: "Alex Morgan",
    email: "patient@carepoint.com",
    phone: "+91 98765 43210",
    role: "PATIENT",
    department: "General",
    passwordHash: hashPassword("patient123", patientSalt),
    salt: patientSalt,
    createdAt: now
  };
  usersByEmail.set(patient.email, patient);

  saveUsers();
}

function saveUsers() {
  const lines = [];
  for (const u of usersByEmail.values()) {
    lines.push([
      u.id,
      encodeB64(u.name),
      encodeB64(u.email),
      encodeB64(u.phone),
      encodeB64(u.role),
      encodeB64(u.department),
      encodeB64(u.passwordHash),
      encodeB64(u.salt),
      encodeB64(u.createdAt)
    ].join("\t"));
  }
  fs.writeFileSync(USERS_FILE, lines.join("\n"), "utf8");
}

// Load Appointments
function loadAppointments() {
  if (!fs.existsSync(TSV_FILE)) return;
  const lines = fs.readFileSync(TSV_FILE, "utf8").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    if (parts.length < 10) continue;
    const a = {
      id: Number(parts[0]),
      patient: decodeB64(parts[1]),
      phone: decodeB64(parts[2]),
      email: decodeB64(parts[3]),
      doctor: decodeB64(parts[4]),
      department: decodeB64(parts[5]),
      date: decodeB64(parts[6]),
      time: decodeB64(parts[7]),
      reason: decodeB64(parts[8]),
      status: decodeB64(parts[9]),
      bookedByRole: parts[10] ? decodeB64(parts[10]) : "PATIENT",
      bookedByEmail: parts[11] ? decodeB64(parts[11]) : decodeB64(parts[3]),
      createdAt: parts[12] ? decodeB64(parts[12]) : ""
    };
    appointments.push(a);
    nextAppointmentId = Math.max(nextAppointmentId, a.id + 1);
  }
}

function saveAppointments() {
  const lines = appointments.map(a => [
    a.id,
    encodeB64(a.patient),
    encodeB64(a.phone),
    encodeB64(a.email),
    encodeB64(a.doctor),
    encodeB64(a.department),
    encodeB64(a.date),
    encodeB64(a.time),
    encodeB64(a.reason),
    encodeB64(a.status),
    encodeB64(a.bookedByRole),
    encodeB64(a.bookedByEmail),
    encodeB64(a.createdAt)
  ].join("\t"));
  fs.writeFileSync(TSV_FILE, lines.join("\n"), "utf8");
}

// Save Excel & CSV
async function saveAppointmentsExcelAndCsv() {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Appointments");

    sheet.columns = [
      { header: "Appointment ID", key: "id", width: 14 },
      { header: "Patient Name", key: "patient", width: 22 },
      { header: "Phone Number", key: "phone", width: 18 },
      { header: "Email Address", key: "email", width: 26 },
      { header: "Department", key: "department", width: 20 },
      { header: "Doctor Name", key: "doctor", width: 22 },
      { header: "Appointment Date", key: "date", width: 15 },
      { header: "Appointment Time", key: "time", width: 14 },
      { header: "Reason for Visit", key: "reason", width: 32 },
      { header: "Status", key: "status", width: 14 },
      { header: "Booked By Role", key: "bookedByRole", width: 16 },
      { header: "Booked By Account", key: "bookedByEmail", width: 24 },
      { header: "Created At", key: "createdAt", width: 20 }
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell(cell => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2563EB" }
      };
      cell.font = {
        name: "Segoe UI",
        bold: true,
        color: { argb: "FFFFFFFF" },
        size: 11
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } }
      };
    });

    // Add appointment rows
    for (const a of appointments) {
      const row = sheet.addRow(a);
      row.height = 20;
      row.eachCell(cell => {
        cell.font = { name: "Segoe UI", size: 10 };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } }
        };
      });
    }

    await workbook.xlsx.writeFile(EXCEL_FILE);

    // Save CSV
    const csvHeaders = sheet.columns.map(c => `"${c.header}"`).join(",");
    const csvRows = appointments.map(a => [
      a.id,
      `"${(a.patient || "").replace(/"/g, '""')}"`,
      `"${(a.phone || "").replace(/"/g, '""')}"`,
      `"${(a.email || "").replace(/"/g, '""')}"`,
      `"${(a.department || "").replace(/"/g, '""')}"`,
      `"${(a.doctor || "").replace(/"/g, '""')}"`,
      `"${a.date}"`,
      `"${a.time}"`,
      `"${(a.reason || "").replace(/"/g, '""')}"`,
      `"${a.status}"`,
      `"${a.bookedByRole}"`,
      `"${a.bookedByEmail}"`,
      `"${a.createdAt}"`
    ].join(","));

    fs.writeFileSync(CSV_FILE, [csvHeaders, ...csvRows].join("\r\n"), "utf8");
  } catch (err) {
    console.error("Warning: Failed to save Excel file:", err.message);
  }
}

// Helpers
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

function getAuthUser(req, queryParams) {
  let token = "";
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) {
    token = auth.slice(7).trim();
  } else if (queryParams && queryParams.get("token")) {
    token = queryParams.get("token");
  }
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return session.user;
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) req.destroy();
    });
    req.on("end", () => {
      if (!body.trim()) return resolve({});
      const contentType = req.headers["content-type"] || "";
      if (contentType.includes("application/json")) {
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error("Invalid JSON body"));
        }
      } else {
        const params = new URLSearchParams(body);
        const obj = {};
        for (const [k, v] of params.entries()) {
          obj[k] = v;
        }
        resolve(obj);
      }
    });
  });
}

// Initialize data
loadUsers();
loadAppointments();
saveAppointmentsExcelAndCsv();

// Server
const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = urlObj.pathname;
  const method = req.method.toUpperCase();

  try {
    // -------------------------------------------------------------------------
    // API: HEALTH CHECK (for Cloud Deployment: Render, Railway, Docker, etc.)
    // -------------------------------------------------------------------------
    if (pathname === "/api/health" && method === "GET") {
      return sendJson(res, 200, {
        status: "healthy",
        service: "CarePoint Hospital Appointment System",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        totalAppointments: appointments.length,
        totalUsers: usersByEmail.size
      });
    }

    // -------------------------------------------------------------------------
    // API: DOCTORS
    // -------------------------------------------------------------------------
    if (pathname === "/api/doctors" && method === "GET") {
      return sendJson(res, 200, {
        doctors: DOCTORS,
        departments: DEPARTMENTS,
        doctorDepartments: DOCTOR_DEPARTMENTS
      });
    }

    // -------------------------------------------------------------------------
    // API: AUTH
    // -------------------------------------------------------------------------
    if (pathname === "/api/auth/register" && method === "POST") {
      const body = await parseBody(req);
      const name = (body.name || "").trim();
      const email = (body.email || "").trim().toLowerCase();
      const phone = (body.phone || "").trim();
      const role = (body.role || "PATIENT").trim().toUpperCase();
      const department = (body.department || "General").trim();
      const password = body.password || "";

      if (!name || !email || !phone || !password) {
        return sendError(res, 400, "All required fields must be filled.");
      }
      if (password.length < 4) {
        return sendError(res, 400, "Password must be at least 4 characters long.");
      }
      if (usersByEmail.has(email)) {
        return sendError(res, 400, "An account with this email already exists.");
      }

      const salt = generateSalt();
      const user = {
        id: nextUserId++,
        name,
        email,
        phone,
        role,
        department,
        passwordHash: hashPassword(password, salt),
        salt,
        createdAt: new Date().toISOString().slice(0, 16).replace("T", " ")
      };

      usersByEmail.set(email, user);
      saveUsers();

      const token = crypto.randomUUID();
      sessions.set(token, { user, expiresAt: Date.now() + 7 * 24 * 3600 * 1000 });

      const safeUser = { ...user };
      delete safeUser.passwordHash;
      delete safeUser.salt;

      return sendJson(res, 201, { token, user: safeUser });
    }

    if (pathname === "/api/auth/login" && method === "POST") {
      const body = await parseBody(req);
      const email = (body.email || "").trim().toLowerCase();
      const password = body.password || "";
      const role = (body.role || "").toUpperCase();

      const user = usersByEmail.get(email);
      if (!user) {
        return sendError(res, 400, "Invalid email or password.");
      }

      const hash = hashPassword(password, user.salt);
      if (hash !== user.passwordHash) {
        return sendError(res, 400, "Invalid email or password.");
      }

      if (role && role !== user.role) {
        return sendError(res, 400, `Account is registered as ${user.role}, not ${role}.`);
      }

      const token = crypto.randomUUID();
      sessions.set(token, { user, expiresAt: Date.now() + 7 * 24 * 3600 * 1000 });

      const safeUser = { ...user };
      delete safeUser.passwordHash;
      delete safeUser.salt;

      return sendJson(res, 200, { token, user: safeUser });
    }

    if (pathname === "/api/auth/me" && method === "GET") {
      const user = getAuthUser(req, urlObj.searchParams);
      if (!user) return sendError(res, 401, "Not authenticated.");
      const safeUser = { ...user };
      delete safeUser.passwordHash;
      delete safeUser.salt;
      return sendJson(res, 200, { user: safeUser });
    }

    if (pathname === "/api/auth/logout" && method === "POST") {
      const auth = req.headers.authorization || "";
      if (auth.startsWith("Bearer ")) {
        sessions.delete(auth.slice(7).trim());
      }
      return sendJson(res, 200, { message: "Logged out." });
    }

    // -------------------------------------------------------------------------
    // API: APPOINTMENTS
    // -------------------------------------------------------------------------
    if (pathname === "/api/appointments" && method === "GET") {
      const user = getAuthUser(req, urlObj.searchParams);
      if (user && user.role === "PATIENT") {
        const filtered = appointments.filter(
          a => a.email.toLowerCase() === user.email.toLowerCase() ||
               a.bookedByEmail.toLowerCase() === user.email.toLowerCase()
        );
        return sendJson(res, 200, filtered);
      }
      return sendJson(res, 200, appointments);
    }

    if (pathname === "/api/appointments/export-excel" && method === "GET") {
      await saveAppointmentsExcelAndCsv();
      if (!fs.existsSync(EXCEL_FILE)) {
        return sendError(res, 404, "Excel sheet not generated yet.");
      }
      const data = fs.readFileSync(EXCEL_FILE);
      res.writeHead(200, {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="carepoint_appointments.xlsx"',
        "Cache-Control": "no-cache, no-store, must-revalidate"
      });
      return res.end(data);
    }

    if (pathname === "/api/appointments/export-csv" && method === "GET") {
      await saveAppointmentsExcelAndCsv();
      if (!fs.existsSync(CSV_FILE)) {
        return sendError(res, 404, "CSV sheet not generated yet.");
      }
      const data = fs.readFileSync(CSV_FILE);
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="carepoint_appointments.csv"',
        "Cache-Control": "no-cache, no-store, must-revalidate"
      });
      return res.end(data);
    }

    if (pathname === "/api/appointments" && method === "POST") {
      const body = await parseBody(req);
      const patient = (body.patient || "").trim();
      const phone = (body.phone || "").trim();
      const email = (body.email || "").trim();
      const doctor = (body.doctor || "").trim();
      const department = (body.department || "").trim();
      const date = (body.date || "").trim();
      const time = (body.time || "").trim();
      const reason = (body.reason || "").trim();

      if (!patient || !phone || !email || !doctor || !department || !date || !time || !reason) {
        return sendError(res, 400, "All appointment details are required.");
      }

      // Check slot conflict
      const conflict = appointments.find(
        a => a.doctor === doctor && a.date === date && a.time === time && a.status !== "Cancelled"
      );
      if (conflict) {
        return sendError(res, 400, "This doctor already has an appointment at this time. Please pick another slot.");
      }

      const authUser = getAuthUser(req, urlObj.searchParams);
      const bookedByRole = authUser ? authUser.role : "PATIENT";
      const bookedByEmail = authUser ? authUser.email : email;
      const now = new Date().toISOString().slice(0, 16).replace("T", " ");

      const appointment = {
        id: nextAppointmentId++,
        patient,
        phone,
        email,
        doctor,
        department,
        date,
        time,
        reason,
        status: "Scheduled",
        bookedByRole,
        bookedByEmail,
        createdAt: now
      };

      appointments.push(appointment);
      saveAppointments();
      await saveAppointmentsExcelAndCsv();

      console.log(`[CarePoint] Booked Appointment #${appointment.id} for ${patient} with ${doctor}`);
      console.log(`[CarePoint] Excel sheet updated: ${EXCEL_FILE}`);

      return sendJson(res, 201, appointment);
    }

    const matchId = pathname.match(/^\/api\/appointments\/(\d+)$/);
    if (matchId) {
      const id = Number(matchId[1]);

      if (method === "PATCH") {
        const body = await parseBody(req);
        const appointment = appointments.find(a => a.id === id);
        if (!appointment) return sendError(res, 404, "Appointment not found.");

        const status = body.status;
        if (!["Scheduled", "Completed", "Cancelled"].includes(status)) {
          return sendError(res, 400, "Invalid status.");
        }

        const authUser = getAuthUser(req, urlObj.searchParams);
        if (authUser && authUser.role === "PATIENT" && status !== "Cancelled") {
          return sendError(res, 403, "Patients can only cancel appointments.");
        }

        appointment.status = status;
        saveAppointments();
        await saveAppointmentsExcelAndCsv();

        return sendJson(res, 200, appointment);
      }

      if (method === "DELETE") {
        const authUser = getAuthUser(req, urlObj.searchParams);
        if (authUser && authUser.role === "PATIENT") {
          return sendError(res, 403, "Patients cannot delete appointment records.");
        }

        const index = appointments.findIndex(a => a.id === id);
        if (index === -1) return sendError(res, 404, "Appointment not found.");

        appointments.splice(index, 1);
        saveAppointments();
        await saveAppointmentsExcelAndCsv();

        return sendJson(res, 200, { message: "Appointment deleted." });
      }
    }

    // -------------------------------------------------------------------------
    // STATIC FILES
    // -------------------------------------------------------------------------
    let filePath = pathname === "/" ? "/index.html" : pathname;
    let safePath = path.join(process.cwd(), filePath);

    if (!fs.existsSync(safePath) || fs.statSync(safePath).isDirectory()) {
      safePath = path.join(process.cwd(), "src", "main", "resources", "static", filePath);
    }

    if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
      const ext = path.extname(safePath).toLowerCase();
      const mimeTypes = {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".csv": "text/csv; charset=utf-8"
      };

      res.writeHead(200, {
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff"
      });
      return fs.createReadStream(safePath).pipe(res);
    }

    return sendError(res, 404, "Not found");
  } catch (err) {
    console.error("Server Error:", err);
    return sendError(res, 500, "Internal Server Error: " + err.message);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("==================================================================");
  console.log(" CarePoint Health - Hospital Appointment Server (Node.js)");
  console.log(` Running at:       http://localhost:${PORT}`);
  console.log(` Running at:       http://127.0.0.1:${PORT}`);
  console.log(` Excel Data File:  ${EXCEL_FILE}`);
  console.log(` CSV Data File:    ${CSV_FILE}`);
  console.log("==================================================================");
});
