let currentUser = null;
let authToken = localStorage.getItem("carepoint_token") || "";
let appointments = [];
let doctors = [];
let doctorDepartments = {};

// DOM Elements
const authScreen = document.querySelector("#auth-screen");
const appShell = document.querySelector("#app-shell");

const tabLogin = document.querySelector("#tab-login");
const tabRegister = document.querySelector("#tab-register");
const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");
const loginMessage = document.querySelector("#login-message");
const registerMessage = document.querySelector("#register-message");

const demoStaffBtn = document.querySelector("#demo-staff-btn");
const demoPatientBtn = document.querySelector("#demo-patient-btn");

const roleChoicePatient = document.querySelector("#role-choice-patient");
const roleChoiceStaff = document.querySelector("#role-choice-staff");
const staffFields = document.querySelector("#staff-fields");

const form = document.querySelector("#appointment-form");
const rows = document.querySelector("#appointment-rows");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#search-input");
const statusFilter = document.querySelector("#status-filter");
const formMessage = document.querySelector("#form-message");
const refreshBtn = document.querySelector("#refresh-button");
const logoutBtn = document.querySelector("#logout-button");
const topbarLogoutBtn = document.querySelector("#topbar-logout-btn");

// Initialize date displays
const today = new Date();
const todayFormatted = new Intl.DateTimeFormat("en", {
  weekday: "short", month: "short", day: "numeric", year: "numeric"
}).format(today);
const todayLabel = document.querySelector("#today-label");
if (todayLabel) todayLabel.textContent = todayFormatted;

const dateInput = document.querySelector("#date-input");
if (dateInput) {
  dateInput.min = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 10);
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

async function request(url, options = {}) {
  const headers = options.headers || {};
  if (authToken && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  options.headers = headers;

  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "An error occurred. Please try again.");
  }
  return data;
}

// -----------------------------------------------------------------------------
// AUTHENTICATION & SESSIONS
// -----------------------------------------------------------------------------

function getInitials(name) {
  if (!name) return "US";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

async function checkAuth() {
  if (!authToken) {
    showAuthScreen();
    return;
  }

  try {
    const res = await request("/api/auth/me");
    currentUser = res.user;
    showAppShell();
    await initializeDashboard();
  } catch (err) {
    console.warn("Session check failed, requiring sign in:", err.message);
    authToken = "";
    localStorage.removeItem("carepoint_token");
    showAuthScreen();
  }
}

function showAuthScreen() {
  authScreen.style.display = "flex";
  appShell.style.display = "none";
}

function showAppShell() {
  authScreen.style.display = "none";
  appShell.style.display = "flex";
  updateExcelLinks();
}

function updateExcelLinks() {
  const tokenParam = authToken ? `?token=${encodeURIComponent(authToken)}` : "";
  const excelLinks = [
    "#header-export-excel",
    "#banner-download-excel",
    "#panel-export-excel",
    "#nav-excel"
  ];
  excelLinks.forEach(selector => {
    const el = document.querySelector(selector);
    if (el) el.href = `/api/appointments/export-excel${tokenParam}`;
  });

  const csvLinks = ["#header-export-csv", "#banner-download-csv"];
  csvLinks.forEach(selector => {
    const el = document.querySelector(selector);
    if (el) el.href = `/api/appointments/export-csv${tokenParam}`;
  });
}

function onAuthSuccess(token, user) {
  authToken = token;
  currentUser = user;
  localStorage.setItem("carepoint_token", token);
  showAppShell();
  initializeDashboard();
}

async function logout() {
  try {
    await request("/api/auth/logout", { method: "POST" });
  } catch (e) {
    // Ignore error
  }
  authToken = "";
  currentUser = null;
  localStorage.removeItem("carepoint_token");
  showAuthScreen();
}

// -----------------------------------------------------------------------------
// UI RENDERING BASED ON USER ROLE (STAFF VS PATIENT)
// -----------------------------------------------------------------------------

function applyRoleTheme() {
  if (!currentUser) return;
  const isStaff = currentUser.role === "STAFF" || currentUser.role === "ADMIN";
  const initials = getInitials(currentUser.name);

  // Avatar and names
  document.querySelector("#user-avatar").textContent = initials;
  document.querySelector("#top-avatar").textContent = initials;
  document.querySelector("#user-name").textContent = currentUser.name;
  document.querySelector("#top-user-name").textContent = currentUser.name;
  document.querySelector("#welcome-user-name").textContent = currentUser.name;

  const roleTag = document.querySelector("#sidebar-role-tag");
  const portalName = document.querySelector("#sidebar-portal-name");
  const userRoleDesc = document.querySelector("#user-role-desc");
  const breadcrumbTitle = document.querySelector("#breadcrumb-title");
  const appointmentsPanelTitle = document.querySelector("#appointments-panel-title");
  const appointmentsPanelDesc = document.querySelector("#appointments-panel-desc");
  const bookingHeading = document.querySelector("#booking-heading");
  const bookingSubheading = document.querySelector("#booking-subheading");
  const navAppointmentsText = document.querySelector("#nav-appointments-text");
  const statLabelTotal = document.querySelector("#stat-label-total");

  if (isStaff) {
    roleTag.textContent = "STAFF";
    roleTag.className = "role-tag";
    portalName.textContent = "Staff Portal";
    userRoleDesc.textContent = `Staff (${currentUser.department || "Admin"})`;
    breadcrumbTitle.textContent = "Staff Dashboard";
    appointmentsPanelTitle.textContent = "Hospital Appointments";
    appointmentsPanelDesc.textContent = "Manage and track all patient visits.";
    bookingHeading.textContent = "Schedule an appointment";
    bookingSubheading.textContent = "Enter patient details for visit.";
    navAppointmentsText.textContent = "All Appointments";
    statLabelTotal.textContent = "Total Appointments";

    // Form can be empty for staff
    document.querySelector("#form-patient").value = "";
    document.querySelector("#form-phone").value = "";
    document.querySelector("#form-email").value = "";
    document.querySelector("#form-patient").readOnly = false;
    document.querySelector("#form-email").readOnly = false;
  } else {
    // Patient Portal
    roleTag.textContent = "PATIENT";
    roleTag.className = "role-tag patient";
    portalName.textContent = "Patient Portal";
    userRoleDesc.textContent = "Patient Account";
    breadcrumbTitle.textContent = "Patient Portal";
    appointmentsPanelTitle.textContent = "My Booked Appointments";
    appointmentsPanelDesc.textContent = "Your booked visits with CarePoint specialists.";
    bookingHeading.textContent = "Book Your Appointment";
    bookingSubheading.textContent = "Select doctor and preferred time slot.";
    navAppointmentsText.textContent = "My Appointments";
    statLabelTotal.textContent = "My Appointments";

    // Pre-fill patient details
    document.querySelector("#form-patient").value = currentUser.name;
    document.querySelector("#form-phone").value = currentUser.phone || "";
    document.querySelector("#form-email").value = currentUser.email;
    document.querySelector("#form-email").readOnly = true;
  }
}

// -----------------------------------------------------------------------------
// APPOINTMENTS & DOCTORS LOGIC
// -----------------------------------------------------------------------------

async function loadDoctors() {
  const data = await request("/api/doctors");
  doctorDepartments = data.doctorDepartments;
  doctors = data.doctors;

  const departmentSelect = document.querySelector("#department-select");
  departmentSelect.replaceChildren(new Option("Select department", ""));
  for (const dept of data.departments) {
    departmentSelect.append(new Option(dept, dept));
  }

  populateDoctors("");

  departmentSelect.addEventListener("change", event => {
    populateDoctors(event.target.value);
  });

  document.querySelector("#doctor-select").addEventListener("change", event => {
    const dept = doctorDepartments[event.target.value];
    if (dept) {
      departmentSelect.value = dept;
      populateDoctors(dept, event.target.value);
    }
  });
}

function populateDoctors(department, selectedDoctor = "") {
  const select = document.querySelector("#doctor-select");
  select.replaceChildren(new Option("Select doctor", ""));
  for (const doctor of doctors) {
    if (!department || doctorDepartments[doctor] === department) {
      select.append(new Option(doctor, doctor));
    }
  }
  if (selectedDoctor) select.value = selectedDoctor;
}

function updateStats() {
  document.querySelector("#stat-total").textContent = appointments.length;
  document.querySelector("#stat-scheduled").textContent =
    appointments.filter(a => a.status === "Scheduled").length;
  document.querySelector("#stat-completed").textContent =
    appointments.filter(a => a.status === "Completed").length;

  const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString().slice(0, 10);
  document.querySelector("#stat-today").textContent =
    appointments.filter(a => a.date === todayStr && a.status !== "Cancelled").length;
}

function renderAppointments() {
  const isStaff = currentUser && (currentUser.role === "STAFF" || currentUser.role === "ADMIN");
  const query = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;

  const filtered = appointments.filter(item => {
    const matchesText = [item.patient, item.doctor, item.department, item.phone, item.email]
      .some(val => val && val.toLowerCase().includes(query));
    return matchesText && (status === "All" || item.status === status);
  }).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  rows.innerHTML = filtered.map(item => {
    const statusClass = item.status.toLowerCase();
    const dateFormatted = new Date(`${item.date}T00:00:00`).toLocaleDateString("en", {
      month: "short", day: "numeric", year: "numeric"
    });
    const timeFormatted = new Date(`2000-01-01T${item.time}`).toLocaleTimeString("en", {
      hour: "numeric", minute: "2-digit"
    });

    let actionsHtml = "";
    if (isStaff) {
      actionsHtml = `
        <select id="status-${item.id}" data-status-id="${item.id}" aria-label="Update status">
          ${["Scheduled", "Completed", "Cancelled"].map(val =>
            `<option${item.status === val ? " selected" : ""}>${val}</option>`).join("")}
        </select>
        <button class="delete-button" type="button" data-delete-id="${item.id}" title="Delete appointment" aria-label="Delete appointment">×</button>
      `;
    } else {
      // Patient action
      if (item.status === "Scheduled") {
        actionsHtml = `
          <button class="cancel-visit-btn" type="button" data-cancel-id="${item.id}">Cancel Visit</button>
        `;
      } else {
        actionsHtml = `<span style="font-size:10px;color:#a0aab5;">—</span>`;
      }
    }

    return `<tr>
      <td>
        <span class="patient-name">${escapeHtml(item.patient)}</span>
        <span class="patient-contact">${escapeHtml(item.phone)}</span>
      </td>
      <td>
        <span class="doctor-name">${escapeHtml(item.doctor)}</span>
        <span class="doctor-department">${escapeHtml(item.department)}</span>
      </td>
      <td>
        ${escapeHtml(dateFormatted)}
        <span class="appointment-time">${escapeHtml(timeFormatted)}</span>
      </td>
      <td><span class="status-pill ${statusClass}">${escapeHtml(item.status)}</span></td>
      <td class="actions">${actionsHtml}</td>
    </tr>`;
  }).join("");

  emptyState.classList.toggle("visible", filtered.length === 0);
  document.querySelector("#results-count").textContent =
    `Showing ${filtered.length} appointment${filtered.length === 1 ? "" : "s"}`;
  updateStats();
}

async function refreshAppointments() {
  try {
    appointments = await request("/api/appointments");
    renderAppointments();
  } catch (err) {
    console.error("Failed to load appointments:", err);
  }
}

async function initializeDashboard() {
  applyRoleTheme();
  await Promise.all([loadDoctors(), refreshAppointments()]);
}

// -----------------------------------------------------------------------------
// EVENT LISTENERS: AUTH SCREEN
// -----------------------------------------------------------------------------

// Tabs: Sign In / Create Account
tabLogin.addEventListener("click", () => {
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
  loginForm.style.display = "grid";
  registerForm.style.display = "none";
  loginMessage.className = "auth-message";
  loginMessage.textContent = "";
});

tabRegister.addEventListener("click", () => {
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");
  registerForm.style.display = "grid";
  loginForm.style.display = "none";
  registerMessage.className = "auth-message";
  registerMessage.textContent = "";
});

// Demo Logins
demoStaffBtn.addEventListener("click", () => {
  tabLogin.click();
  document.querySelector("#login-role-staff").checked = true;
  document.querySelector("#login-email").value = "staff@carepoint.com";
  document.querySelector("#login-password").value = "admin123";
  loginForm.dispatchEvent(new Event("submit"));
});

demoPatientBtn.addEventListener("click", () => {
  tabLogin.click();
  document.querySelector("#login-role-patient").checked = true;
  document.querySelector("#login-email").value = "patient@carepoint.com";
  document.querySelector("#login-password").value = "patient123";
  loginForm.dispatchEvent(new Event("submit"));
});

// Register Role Selection Cards
roleChoicePatient.addEventListener("click", () => {
  roleChoicePatient.classList.add("active");
  roleChoiceStaff.classList.remove("active");
  roleChoicePatient.querySelector("input").checked = true;
  staffFields.style.display = "none";
});

roleChoiceStaff.addEventListener("click", () => {
  roleChoiceStaff.classList.add("active");
  roleChoicePatient.classList.remove("active");
  roleChoiceStaff.querySelector("input").checked = true;
  staffFields.style.display = "block";
});

// Submit Login Form
loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  loginMessage.className = "auth-message";
  loginMessage.textContent = "";
  const submitBtn = document.querySelector("#login-submit-btn");
  submitBtn.disabled = true;

  try {
    const selectedRole = loginForm.querySelector("input[name=loginRole]:checked")?.value || "";
    const email = document.querySelector("#login-email").value.trim();
    const password = document.querySelector("#login-password").value;

    const data = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({ email, password, role: selectedRole })
    });

    onAuthSuccess(data.token, data.user);
  } catch (err) {
    loginMessage.textContent = err.message;
    loginMessage.classList.add("error");
  } finally {
    submitBtn.disabled = false;
  }
});

// Submit Create Account Form
registerForm.addEventListener("submit", async event => {
  event.preventDefault();
  registerMessage.className = "auth-message";
  registerMessage.textContent = "";

  const password = document.querySelector("#reg-password").value;
  const confirmPassword = document.querySelector("#reg-confirm-password").value;

  if (password !== confirmPassword) {
    registerMessage.textContent = "Passwords do not match. Please re-enter.";
    registerMessage.classList.add("error");
    return;
  }

  const submitBtn = document.querySelector("#register-submit-btn");
  submitBtn.disabled = true;

  try {
    const role = registerForm.querySelector("input[name=registerRole]:checked")?.value || "PATIENT";
    const name = document.querySelector("#reg-name").value.trim();
    const email = document.querySelector("#reg-email").value.trim();
    const phone = document.querySelector("#reg-phone").value.trim();
    const department = document.querySelector("#reg-department")?.value || "General";

    const data = await request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({ name, email, phone, role, department, password })
    });

    onAuthSuccess(data.token, data.user);
  } catch (err) {
    registerMessage.textContent = err.message;
    registerMessage.classList.add("error");
  } finally {
    submitBtn.disabled = false;
  }
});

// Logout Buttons
logoutBtn.addEventListener("click", logout);
topbarLogoutBtn.addEventListener("click", logout);

// -----------------------------------------------------------------------------
// EVENT LISTENERS: APPOINTMENT ACTIONS
// -----------------------------------------------------------------------------

// Submit Appointment Form
form.addEventListener("submit", async event => {
  event.preventDefault();
  formMessage.textContent = "";
  formMessage.className = "form-message";
  const submitBtn = document.querySelector("#submit-appointment-btn");
  submitBtn.disabled = true;

  try {
    await request("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams(new FormData(form))
    });

    const isStaff = currentUser && (currentUser.role === "STAFF" || currentUser.role === "ADMIN");
    if (isStaff) {
      form.reset();
    } else {
      document.querySelector("#form-reason").value = "";
      document.querySelector("#department-select").value = "";
      document.querySelector("#doctor-select").value = "";
      document.querySelector("#date-input").value = "";
      document.querySelector("#time-select").value = "";
    }

    formMessage.textContent = "Appointment scheduled successfully and recorded in Excel!";
    formMessage.classList.add("success");
    await refreshAppointments();
  } catch (err) {
    formMessage.textContent = err.message;
    formMessage.classList.add("error");
  } finally {
    submitBtn.disabled = false;
  }
});

// Staff updates status dropdown
rows.addEventListener("change", async event => {
  const id = event.target.dataset.statusId;
  if (!id) return;
  try {
    await request(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({ status: event.target.value })
    });
    await refreshAppointments();
  } catch (err) {
    window.alert(err.message);
    await refreshAppointments();
  }
});

// Staff deletes appointment OR Patient cancels visit
rows.addEventListener("click", async event => {
  // Staff Delete
  const deleteBtn = event.target.closest("[data-delete-id]");
  if (deleteBtn) {
    const id = Number(deleteBtn.dataset.deleteId);
    const appointment = appointments.find(item => item.id === id);
    if (!appointment || !window.confirm(`Delete the appointment for ${appointment.patient}?`)) return;
    try {
      await request(`/api/appointments/${id}`, { method: "DELETE" });
      await refreshAppointments();
    } catch (err) {
      window.alert(err.message);
    }
    return;
  }

  // Patient Cancel Visit
  const cancelBtn = event.target.closest("[data-cancel-id]");
  if (cancelBtn) {
    const id = Number(cancelBtn.dataset.cancelId);
    if (!window.confirm("Are you sure you want to cancel this appointment visit?")) return;
    try {
      await request(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams({ status: "Cancelled" })
      });
      await refreshAppointments();
    } catch (err) {
      window.alert(err.message);
    }
  }
});

// Search & Filter
searchInput.addEventListener("input", renderAppointments);
statusFilter.addEventListener("change", renderAppointments);
refreshBtn.addEventListener("click", refreshAppointments);

// Start app
checkAuth();
