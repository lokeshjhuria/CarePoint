import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import ExcelJS from "exceljs";

// In Vercel serverless environment, /tmp is the writable storage directory
const DATA_DIR = process.env.VERCEL ? path.join("/tmp", "data") : path.resolve("data");
const TSV_FILE = path.join(DATA_DIR, "appointments.tsv");
const EXCEL_FILE = path.join(DATA_DIR, "appointments.xlsx");
const CSV_FILE = path.join(DATA_DIR, "appointments.csv");
const USERS_FILE = path.join(DATA_DIR, "users.tsv");

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Could not create DATA_DIR:", err);
  }
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
  try {
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
  } catch (err) {
    console.warn("Could not read users file:", err.message);
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
  try {
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
  } catch (e) {
    console.warn("Could not write users file:", e.message);
  }
}

// Load Appointments
function loadAppointments() {
  if (!fs.existsSync(TSV_FILE)) return;
  try {
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
  } catch (err) {
    console.warn("Could not read appointments file:", err.message);
  }
}

function saveAppointments() {
  try {
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
  } catch (e) {
    console.warn("Could not write appointments file:", e.message);
  }
}

async function generateExcelBuffer(list) {
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
  });

  for (const a of list) {
    const row = sheet.addRow(a);
    row.height = 20;
    row.eachCell(cell => {
      cell.font = { name: "Segoe UI", size: 10 };
    });
  }

  return await workbook.xlsx.writeBuffer();
}

function generateCsvBuffer(list) {
  const headers = [
    "Appointment ID", "Patient Name", "Phone Number", "Email Address",
    "Department", "Doctor Name", "Appointment Date", "Appointment Time",
    "Reason for Visit", "Status", "Booked By Role", "Booked By Account", "Created At"
  ];
  const csvHeaders = headers.map(h => `"${h}"`).join(",");
  const csvRows = list.map(a => [
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

  return Buffer.from([csvHeaders, ...csvRows].join("\r\n"), "utf8");
}

async function saveAppointmentsExcelAndCsv() {
  try {
    const xlsxBuffer = await generateExcelBuffer(appointments);
    fs.writeFileSync(EXCEL_FILE, xlsxBuffer);
    const csvBuffer = generateCsvBuffer(appointments);
    fs.writeFileSync(CSV_FILE, csvBuffer);
  } catch (err) {
    console.warn("Could not save Excel/CSV to disk:", err.message);
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
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  return new Promise((resolve) => {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      if (!body.trim()) return resolve({});
      const contentType = req.headers["content-type"] || "";
      if (contentType.includes("application/json")) {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve({});
        }
      } else {
        const params = new URLSearchParams(body);
        const obj = {};
        for (const [k, v] of params.entries()) obj[k] = v;
        resolve(obj);
      }
    });
  });
}

// Initialize state
loadUsers();
loadAppointments();

// Vercel Serverless Handler
export default async function handler(req, res) {
  const urlObj = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  let pathname = urlObj.pathname;
  const method = req.method.toUpperCase();

  // Strip optional trailing slashes
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }

  try {
    // 1. HEALTH CHECK
    if (pathname === "/api/health" && method === "GET") {
      return sendJson(res, 200, {
        status: "healthy",
        service: "CarePoint Hospital Appointment System",
        environment: process.env.VERCEL ? "vercel-serverless" : "local",
        totalAppointments: appointments.length,
        totalUsers: usersByEmail.size
      });
    }

    // 2. DOCTORS
    if (pathname === "/api/doctors" && method === "GET") {
      return sendJson(res, 200, {
        doctors: DOCTORS,
        departments: DEPARTMENTS,
        doctorDepartments: DOCTOR_DEPARTMENTS
      });
    }

    // 3. AUTH
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
        return sendError(res, 400, "Password must be at least 4 characters.");
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

    // 4. APPOINTMENTS
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
      const user = getAuthUser(req, urlObj.searchParams);
      let listToExport = appointments;
      if (user && user.role === "PATIENT") {
        listToExport = appointments.filter(
          a => a.email.toLowerCase() === user.email.toLowerCase() ||
               a.bookedByEmail.toLowerCase() === user.email.toLowerCase()
        );
      }
      const buffer = await generateExcelBuffer(listToExport);
      res.writeHead(200, {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="carepoint_appointments.xlsx"',
        "Cache-Control": "no-cache, no-store, must-revalidate"
      });
      return res.end(buffer);
    }

    if (pathname === "/api/appointments/export-csv" && method === "GET") {
      const user = getAuthUser(req, urlObj.searchParams);
      let listToExport = appointments;
      if (user && user.role === "PATIENT") {
        listToExport = appointments.filter(
          a => a.email.toLowerCase() === user.email.toLowerCase() ||
               a.bookedByEmail.toLowerCase() === user.email.toLowerCase()
        );
      }
      const buffer = generateCsvBuffer(listToExport);
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="carepoint_appointments.csv"',
        "Cache-Control": "no-cache, no-store, must-revalidate"
      });
      return res.end(buffer);
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

    return sendError(res, 404, `Endpoint not found: ${pathname}`);
  } catch (err) {
    console.error("Vercel Serverless Function Error:", err);
    return sendError(res, 500, "Server error: " + err.message);
  }
}
