import {
  ApiError,
  handleError,
  requestBody,
  requireAdmin,
  requireMethod,
  sendJson,
  supabaseRequest
} from "./_lib.js";
import { doctors } from "./_doctors.js";

const departmentsByDoctor = new Map(doctors.map(doctor => [doctor.name, doctor.department]));
const availableTimes = new Set([
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"
]);

function validateAppointment(input) {
  const fields = ["patient", "phone", "email", "doctor", "department", "date", "time", "reason"];
  for (const field of fields) {
    if (typeof input[field] !== "string" || !input[field].trim()) {
      throw new ApiError(400, `${field.charAt(0).toUpperCase() + field.slice(1)} is required.`);
    }
  }
  const patient = input.patient.trim();
  const phone = input.phone.trim();
  const email = input.email.trim();
  const doctor = input.doctor.trim();
  const department = input.department.trim();
  const date = input.date.trim();
  const time = input.time.trim();
  const reason = input.reason.trim();
  if (patient.length > 80 || reason.length > 300) {
    throw new ApiError(400, "Name must be 80 characters or fewer and visit note 300 characters or fewer.");
  }
  if (!/^[+0-9() .-]{7,20}$/.test(phone)) {
    throw new ApiError(400, "Enter a valid phone number (7–20 characters).");
  }
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, "Enter a valid email address.");
  }
  if (departmentsByDoctor.get(doctor) !== department) {
    throw new ApiError(400, "Choose a doctor from the selected specialty.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)
      || Number.isNaN(Date.parse(`${date}T00:00:00Z`))
      || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new ApiError(400, "Enter a valid appointment date.");
  }
  if (date < new Date().toISOString().slice(0, 10)) {
    throw new ApiError(400, "Appointment date cannot be in the past.");
  }
  if (!availableTimes.has(time)) {
    throw new ApiError(400, "Select an available appointment time.");
  }
  return { patient, phone, email, doctor, department, date, time, reason, status: "Scheduled" };
}

export default async function handler(req, res) {
  try {
    requireMethod(req, ["GET", "POST"]);
    if (req.method === "GET") {
      requireAdmin(req);
      const appointments = await supabaseRequest(
        "appointments?select=*&order=appointment_date.asc,appointment_time.asc"
      );
      return sendJson(res, 200, appointments.map(appointment => ({
        id: appointment.id,
        patient: appointment.patient_name,
        phone: appointment.phone,
        email: appointment.email,
        doctor: appointment.doctor,
        department: appointment.department,
        date: appointment.appointment_date,
        time: appointment.appointment_time.slice(0, 5),
        reason: appointment.reason,
        status: appointment.status
      })));
    }
    const body = validateAppointment(requestBody(req));
    const [appointment] = await supabaseRequest("appointments", {
      method: "POST",
      prefer: "return=representation",
      body: {
        patient_name: body.patient,
        phone: body.phone,
        email: body.email,
        doctor: body.doctor,
        department: body.department,
        appointment_date: body.date,
        appointment_time: body.time,
        reason: body.reason,
        status: body.status
      }
    });
    return sendJson(res, 201, { id: appointment.id, status: appointment.status });
  } catch (error) {
    return handleError(res, error);
  }
}
