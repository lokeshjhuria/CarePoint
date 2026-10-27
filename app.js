let currentUser = null;
let authToken = localStorage.getItem("carepoint_token") || "";
let appointments = [];
let doctors = [];
let doctorDepartments = {};

// Doctor image bank for high-quality visuals
const DOCTOR_IMAGES = {
  "Dr. Ananya Sharma": "photo-1559839734-2b71ea197ec2",
  "Dr. Rohan Mehta": "photo-1612349317150-e413f6a5b16d",
  "Dr. Priya Nair": "photo-1594824476967-48c8b964273f",
  "Dr. Arjun Patel": "photo-1622253692010-333f2da6031d",
  "Dr. Meera Iyer": "photo-1582750433449-648ed127bb54",
  "Dr. Vikram Desai": "photo-1576091160399-112ba8d25d1d",
  "Dr. Kavita Rao": "photo-1584982751601-97dcc096659c",
  "Dr. Aisha Khan": "photo-1537368910025-700350fe46c7",
  "Dr. Rahul Verma": "photo-1622902046580-2b47f47f5471",
  "Dr. Neha Kulkarni": "photo-1573496359142-b8d87734a5a2",
  "Dr. Sanjay Joshi": "photo-1551601651-2a8555f1a136",
  "Dr. Isha Deshmukh": "photo-1584515933487-779824d29309",
  "Dr. Dev Malhotra": "photo-1591604021695-0c69b7c05981",
  "Dr. Pooja Menon": "photo-1612531386530-97286d97c2d2",
  "Dr. Karan Shah": "photo-1612277795421-9bc7706a4a34",
  "Dr. Maya Banerjee": "photo-1606811971618-4486d14f3f99",
  "Dr. Nikhil Sinha": "photo-1631815588090-d4bfec5b1ccb",
  "Dr. Simran Gill": "photo-1494790108377-be9c29b29330",
  "Dr. Farhan Ali": "photo-1506794778202-cad84cf45f1d",
  "Dr. Tara Kapoor": "photo-1524504388940-b1c1722653e1"
};

// DOM References
const viewHome = document.querySelector("#view-home");
const viewDashboard = document.querySelector("#view-dashboard");
const authModal = document.querySelector("#auth-modal");

const btnNavHome = document.querySelector("#btn-nav-home");
const btnNavDoctors = document.querySelector("#btn-nav-doctors");
const btnNavFacilities = document.querySelector("#btn-nav-facilities");
const btnNavDashboard = document.querySelector("#btn-nav-dashboard");
const btnBackToHome = document.querySelector("#btn-back-to-home");

const navUserPill = document.querySelector("#nav-user-pill");
const navAuthButtons = document.querySelector("#nav-auth-buttons");
const navAvatar = document.querySelector("#nav-avatar");
const navUserName = document.querySelector("#nav-user-name");
const navUserRole = document.querySelector("#nav-user-role");
const navLogoutBtn = document.querySelector("#nav-logout-btn");

const openLoginBtn = document.querySelector("#open-login-btn");
const openRegisterBtn = document.querySelector("#open-register-btn");
const modalCloseBtn = document.querySelector("#modal-close-btn");
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

// Helpers
function escapeHtml(val) {
  if (val === null || val === undefined) return "";
  return String(val).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

function getInitials(name) {
  if (!name) return "CP";
  const p = name.trim().split(" ");
  if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

async function request(url, options = {}) {
  const headers = options.headers || {};
  if (authToken && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  options.headers = headers;
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "An error occurred. Please try again.");
  return data;
}

// -----------------------------------------------------------------------------
// VIEW SWITCHING
// -----------------------------------------------------------------------------
function showView(viewName) {
  if (viewName === "dashboard") {
    if (!currentUser) {
      openAuthModal("login");
      return;
    }
    viewHome.style.display = "none";
    viewDashboard.style.display = "block";
    btnNavDashboard.classList.add("active");
    btnNavHome.classList.remove("active");
    btnNavDoctors.classList.remove("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
    refreshAppointments();
  } else {
    viewDashboard.style.display = "none";
    viewHome.style.display = "block";
    btnNavHome.classList.add("active");
    btnNavDashboard.classList.remove("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// -----------------------------------------------------------------------------
// AUTHENTICATION MODAL LOGIC
// -----------------------------------------------------------------------------
function openAuthModal(tab = "login") {
  authModal.style.display = "flex";
  if (tab === "register") {
    tabRegister.click();
  } else {
    tabLogin.click();
  }
}

function closeAuthModal() {
  authModal.style.display = "none";
  loginMessage.className = "form-feedback";
  loginMessage.textContent = "";
  registerMessage.className = "form-feedback";
  registerMessage.textContent = "";
}

async function checkAuth() {
  if (!authToken) {
    updateNavAuthState();
    return;
  }
  try {
    const data = await request("/api/auth/me");
    currentUser = data.user;
    updateNavAuthState();
    applyRoleTheme();
  } catch {
    authToken = "";
    currentUser = null;
    localStorage.removeItem("carepoint_token");
    updateNavAuthState();
  }
}

function updateNavAuthState() {
  updateExcelLinks();
  if (currentUser) {
    navAuthButtons.style.display = "none";
    navUserPill.style.display = "flex";
    navAvatar.textContent = getInitials(currentUser.name);
    navUserName.textContent = currentUser.name;
    navUserRole.textContent = currentUser.role === "STAFF" ? "Staff" : "Patient";
    document.querySelector("#nav-dash-text").textContent =
      currentUser.role === "STAFF" ? "Staff Dashboard" : "My Appointments";
  } else {
    navAuthButtons.style.display = "flex";
    navUserPill.style.display = "none";
    document.querySelector("#nav-dash-text").textContent = "Appointments Dashboard";
  }
}

function updateExcelLinks() {
  const tokenParam = authToken ? `?token=${encodeURIComponent(authToken)}` : "";
  const selectors = [
    "#nav-excel-download",
    "#dash-btn-excel"
  ];
  selectors.forEach(sel => {
    const el = document.querySelector(sel);
    if (el) el.href = `/api/appointments/export-excel${tokenParam}`;
  });
  const csvEl = document.querySelector("#dash-btn-csv");
  if (csvEl) csvEl.href = `/api/appointments/export-csv${tokenParam}`;
}

async function logout() {
  try {
    await request("/api/auth/logout", { method: "POST" });
  } catch {}
  authToken = "";
  currentUser = null;
  localStorage.removeItem("carepoint_token");
  updateNavAuthState();
  showView("home");
}

function onAuthSuccess(token, user) {
  authToken = token;
  currentUser = user;
  localStorage.setItem("carepoint_token", token);
  closeAuthModal();
  updateNavAuthState();
  applyRoleTheme();
  showView("dashboard");
}

// Role adaptation in Dashboard
function applyRoleTheme() {
  if (!currentUser) return;
  const isStaff = currentUser.role === "STAFF" || currentUser.role === "ADMIN";

  const greeting = document.querySelector("#dash-greeting");
  const subtitle = document.querySelector("#dash-subtitle");
  const rolePill = document.querySelector("#dash-role-pill");
  const portalSub = document.querySelector("#dash-portal-subtext");
  const apptTitle = document.querySelector("#appointments-title");
  const apptDesc = document.querySelector("#appointments-desc");
  const labelTotal = document.querySelector("#label-stat-total");
  const bookingHeading = document.querySelector("#booking-heading");
  const bookingSubheading = document.querySelector("#booking-subheading");

  if (isStaff) {
    rolePill.textContent = "STAFF DASHBOARD";
    rolePill.className = "role-pill-indicator";
    portalSub.textContent = `Hospital Administration • ${currentUser.department || "General"}`;
    greeting.innerHTML = `Good day, ${escapeHtml(currentUser.name)} <span class="wave">✦</span>`;
    subtitle.textContent = "Complete hospital appointments directory with live Excel sheet integration.";
    apptTitle.textContent = "Hospital Appointments Directory";
    apptDesc.textContent = "Manage, verify and update patient consultations.";
    labelTotal.textContent = "Total Appointments";
    bookingHeading.textContent = "Schedule Walk-In / Visit";
    bookingSubheading.textContent = "Book appointment on behalf of any patient.";

    document.querySelector("#form-patient").value = "";
    document.querySelector("#form-phone").value = "";
    document.querySelector("#form-email").value = "";
    document.querySelector("#form-patient").readOnly = false;
    document.querySelector("#form-email").readOnly = false;
  } else {
    rolePill.textContent = "PATIENT PORTAL";
    rolePill.className = "role-pill-indicator patient";
    portalSub.textContent = "Personal Health Account";
    greeting.innerHTML = `Welcome back, ${escapeHtml(currentUser.name)} <span class="wave">✦</span>`;
    subtitle.textContent = "Manage your booked appointments and schedule new specialist visits.";
    apptTitle.textContent = "My Booked Appointments";
    apptDesc.textContent = "List of your upcoming and past doctor visits.";
    labelTotal.textContent = "My Appointments";
    bookingHeading.textContent = "Book Your Appointment";
    bookingSubheading.textContent = "Select specialist and choose your preferred slot.";

    document.querySelector("#form-patient").value = currentUser.name;
    document.querySelector("#form-phone").value = currentUser.phone || "";
    document.querySelector("#form-email").value = currentUser.email;
    document.querySelector("#form-email").readOnly = true;
  }
}

// -----------------------------------------------------------------------------
// PUBLIC HOME: DOCTORS DIRECTORY & SEARCH
// -----------------------------------------------------------------------------
async function loadDoctorsData() {
  const data = await request("/api/doctors");
  doctors = data.doctors;
  doctorDepartments = data.doctorDepartments;

  // Populate booking form departments
  const deptSelect = document.querySelector("#department-select");
  deptSelect.replaceChildren(new Option("Select Department", ""));
  for (const dept of data.departments) {
    deptSelect.append(new Option(dept, dept));
  }
  populateFormDoctors("");

  deptSelect.addEventListener("change", e => populateFormDoctors(e.target.value));
  document.querySelector("#doctor-select").addEventListener("change", e => {
    const dept = doctorDepartments[e.target.value];
    if (dept) {
      deptSelect.value = dept;
      populateFormDoctors(dept, e.target.value);
    }
  });

  // Populate public home department chips
  const chipsContainer = document.querySelector("#department-chips");
  for (const dept of data.departments) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dept-chip";
    btn.dataset.dept = dept;
    btn.textContent = dept;
    chipsContainer.append(btn);
  }

  // Render Doctor Cards on Home
  renderDoctorCards("All", "");
}

function renderDoctorCards(filterDept = "All", searchQuery = "") {
  const container = document.querySelector("#doctor-cards-container");
  container.innerHTML = "";

  const query = searchQuery.trim().toLowerCase();

  const filtered = doctors.filter(name => {
    const dept = doctorDepartments[name] || "Specialist";
    const matchDept = (filterDept === "All" || dept.toLowerCase() === filterDept.toLowerCase());
    const matchQuery = !query || name.toLowerCase().includes(query) || dept.toLowerCase().includes(query);
    return matchDept && matchQuery;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#64748b;padding:30px;">No specialists found matching your search. Try another department.</p>`;
    return;
  }

  container.innerHTML = filtered.map(name => {
    const dept = doctorDepartments[name] || "General";
    const imgId = DOCTOR_IMAGES[name] || "photo-1559839734-2b71ea197ec2";
    const imgUrl = `https://images.unsplash.com/${imgId}?auto=format&fit=crop&w=150&h=150&q=80`;

    return `
      <article class="doctor-card">
        <div class="doc-top">
          <img class="doc-img" src="${imgUrl}" alt="${escapeHtml(name)}">
          <div>
            <h3 class="doc-name">${escapeHtml(name)}</h3>
            <p class="doc-spec">${escapeHtml(dept)} Specialist</p>
          </div>
        </div>
        <div class="doc-meta">
          <span class="doc-dept-badge">${escapeHtml(dept)}</span>
          <button type="button" class="doc-book-btn" data-doc="${escapeHtml(name)}" data-dept="${escapeHtml(dept)}">
            Book Visit ↗
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function populateFormDoctors(department, selectedDoctor = "") {
  const select = document.querySelector("#doctor-select");
  select.replaceChildren(new Option("Select Doctor", ""));
  for (const doc of doctors) {
    if (!department || doctorDepartments[doc] === department) {
      select.append(new Option(doc, doc));
    }
  }
  if (selectedDoctor) select.value = selectedDoctor;
}

// -----------------------------------------------------------------------------
// DASHBOARD: APPOINTMENTS CRUD & EXCEL SYNC
// -----------------------------------------------------------------------------
async function refreshAppointments() {
  try {
    appointments = await request("/api/appointments");
    renderAppointmentsTable();
  } catch (err) {
    console.error("Appointments fetch error:", err);
  }
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

function renderAppointmentsTable() {
  const isStaff = currentUser && (currentUser.role === "STAFF" || currentUser.role === "ADMIN");
  const query = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;

  const filtered = appointments.filter(a => {
    const textMatch = [a.patient, a.doctor, a.department, a.phone, a.email]
      .some(val => val && val.toLowerCase().includes(query));
    return textMatch && (status === "All" || a.status === status);
  }).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  rows.innerHTML = filtered.map(item => {
    const statusClass = item.status.toLowerCase();
    const dateFormatted = new Date(`${item.date}T00:00:00`).toLocaleDateString("en", {
      month: "short", day: "numeric", year: "numeric"
    });
    const timeFormatted = new Date(`2000-01-01T${item.time}`).toLocaleTimeString("en", {
      hour: "numeric", minute: "2-digit"
    });

    let actionMarkup = "";
    if (isStaff) {
      actionMarkup = `
        <select class="action-select" data-status-id="${item.id}" aria-label="Update status">
          ${["Scheduled", "Completed", "Cancelled"].map(val =>
            `<option${item.status === val ? " selected" : ""}>${val}</option>`).join("")}
        </select>
        <button class="btn-del" type="button" data-delete-id="${item.id}" title="Delete record">×</button>
      `;
    } else {
      if (item.status === "Scheduled") {
        actionMarkup = `<button type="button" class="btn-cancel-appt" data-cancel-id="${item.id}">Cancel Visit</button>`;
      } else {
        actionMarkup = `<span style="color:#94a3b8;font-size:10px;">—</span>`;
      }
    }

    return `<tr>
      <td class="patient-cell">
        <strong>${escapeHtml(item.patient)}</strong>
        <small>${escapeHtml(item.phone)} • ${escapeHtml(item.email)}</small>
      </td>
      <td class="doc-cell">
        <strong>${escapeHtml(item.doctor)}</strong>
        <small>${escapeHtml(item.department)}</small>
      </td>
      <td class="time-cell">
        <strong>${escapeHtml(dateFormatted)}</strong>
        <small>${escapeHtml(timeFormatted)}</small>
      </td>
      <td>
        <span class="status-tag ${statusClass}">${escapeHtml(item.status)}</span>
      </td>
      <td>${actionMarkup}</td>
    </tr>`;
  }).join("");

  emptyState.classList.toggle("visible", filtered.length === 0);
  document.querySelector("#results-count").textContent =
    `Showing ${filtered.length} appointment${filtered.length === 1 ? "" : "s"}`;
  updateStats();
}

// -----------------------------------------------------------------------------
// EVENT LISTENERS
// -----------------------------------------------------------------------------

// Nav Links
btnNavHome.addEventListener("click", e => { e.preventDefault(); showView("home"); });
btnNavDoctors.addEventListener("click", e => {
  e.preventDefault();
  showView("home");
  document.querySelector("#specialists").scrollIntoView({ behavior: "smooth" });
});
btnNavFacilities.addEventListener("click", e => {
  e.preventDefault();
  showView("home");
  document.querySelector("#facilities").scrollIntoView({ behavior: "smooth" });
});
btnNavDashboard.addEventListener("click", e => { e.preventDefault(); showView("dashboard"); });
btnBackToHome.addEventListener("click", () => showView("home"));

// Auth Modal Open/Close
openLoginBtn.addEventListener("click", () => openAuthModal("login"));
openRegisterBtn.addEventListener("click", () => openAuthModal("register"));
document.querySelector("#btn-hero-book")?.addEventListener("click", () => {
  if (currentUser) showView("dashboard");
  else openAuthModal("register");
});
modalCloseBtn.addEventListener("click", closeAuthModal);
authModal.addEventListener("click", e => {
  if (e.target === authModal) closeAuthModal();
});
navLogoutBtn.addEventListener("click", logout);

// Tabs in Auth Modal
tabLogin.addEventListener("click", () => {
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
  loginForm.style.display = "grid";
  registerForm.style.display = "none";
  loginMessage.className = "form-feedback";
  loginMessage.textContent = "";
});

tabRegister.addEventListener("click", () => {
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");
  registerForm.style.display = "grid";
  loginForm.style.display = "none";
  registerMessage.className = "form-feedback";
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

// Register Role Selection
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

// Submit Login
loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  loginMessage.className = "form-feedback";
  loginMessage.textContent = "";
  const btn = document.querySelector("#login-submit-btn");
  btn.disabled = true;

  try {
    const role = loginForm.querySelector("input[name=loginRole]:checked")?.value || "";
    const email = document.querySelector("#login-email").value.trim();
    const password = document.querySelector("#login-password").value;

    const data = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({ email, password, role })
    });
    onAuthSuccess(data.token, data.user);
  } catch (err) {
    loginMessage.textContent = err.message;
    loginMessage.classList.add("error");
  } finally {
    btn.disabled = false;
  }
});

// Submit Register
registerForm.addEventListener("submit", async e => {
  e.preventDefault();
  registerMessage.className = "form-feedback";
  registerMessage.textContent = "";

  const password = document.querySelector("#reg-password").value;
  const confirmPassword = document.querySelector("#reg-confirm-password").value;

  if (password !== confirmPassword) {
    registerMessage.textContent = "Passwords do not match. Please re-enter.";
    registerMessage.classList.add("error");
    return;
  }

  const btn = document.querySelector("#register-submit-btn");
  btn.disabled = true;

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
    btn.disabled = false;
  }
});

// Home page doctor search
document.querySelector("#hero-doctor-search").addEventListener("submit", e => {
  e.preventDefault();
  const q = document.querySelector("#hero-search-input").value;
  document.querySelector("#specialists").scrollIntoView({ behavior: "smooth" });
  renderDoctorCards("All", q);
});

document.querySelector("#hero-search-input").addEventListener("input", e => {
  renderDoctorCards("All", e.target.value);
});

// Quick specialty tags in hero
document.querySelectorAll(".tag-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    const spec = chip.dataset.specialty;
    document.querySelector("#specialists").scrollIntoView({ behavior: "smooth" });
    document.querySelectorAll(".dept-chip").forEach(c => c.classList.toggle("active", c.dataset.dept === spec));
    renderDoctorCards(spec, "");
  });
});

// Department chips in Specialists section
document.querySelector("#department-chips").addEventListener("click", e => {
  const chip = e.target.closest(".dept-chip");
  if (!chip) return;
  document.querySelectorAll(".dept-chip").forEach(c => c.classList.remove("active"));
  chip.classList.add("active");
  renderDoctorCards(chip.dataset.dept, "");
});

// Doctor card Book Visit click
document.querySelector("#doctor-cards-container").addEventListener("click", e => {
  const btn = e.target.closest(".doc-book-btn");
  if (!btn) return;
  const doc = btn.dataset.doc;
  const dept = btn.dataset.dept;

  if (!currentUser) {
    openAuthModal("login");
    return;
  }

  showView("dashboard");
  document.querySelector("#department-select").value = dept;
  populateFormDoctors(dept, doc);
  document.querySelector("#book-form").scrollIntoView({ behavior: "smooth" });
});

// Booking form submit
form.addEventListener("submit", async e => {
  e.preventDefault();
  formMessage.className = "form-feedback";
  formMessage.textContent = "";
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

    formMessage.textContent = "Appointment scheduled successfully and saved to Excel sheet (appointments.xlsx)!";
    formMessage.classList.add("success");
    await refreshAppointments();
  } catch (err) {
    formMessage.textContent = err.message;
    formMessage.classList.add("error");
  } finally {
    submitBtn.disabled = false;
  }
});

// Staff updates appointment status dropdown
rows.addEventListener("change", async e => {
  const id = e.target.dataset.statusId;
  if (!id) return;
  try {
    await request(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({ status: e.target.value })
    });
    await refreshAppointments();
  } catch (err) {
    window.alert(err.message);
    await refreshAppointments();
  }
});

// Staff deletes OR Patient cancels appointment
rows.addEventListener("click", async e => {
  const delBtn = e.target.closest("[data-delete-id]");
  if (delBtn) {
    const id = Number(delBtn.dataset.deleteId);
    if (!window.confirm("Are you sure you want to delete this appointment record?")) return;
    try {
      await request(`/api/appointments/${id}`, { method: "DELETE" });
      await refreshAppointments();
    } catch (err) {
      window.alert(err.message);
    }
    return;
  }

  const cancelBtn = e.target.closest("[data-cancel-id]");
  if (cancelBtn) {
    const id = Number(cancelBtn.dataset.cancelId);
    if (!window.confirm("Are you sure you want to cancel your scheduled appointment visit?")) return;
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

// Search & Status filters in Dashboard
searchInput.addEventListener("input", renderAppointmentsTable);
statusFilter.addEventListener("change", renderAppointmentsTable);
refreshBtn.addEventListener("click", refreshAppointments);

// Date min attribute setup
const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  .toISOString().slice(0, 10);
const datePicker = document.querySelector("#date-input");
if (datePicker) datePicker.min = todayStr;

// Initialize Application
Promise.all([checkAuth(), loadDoctorsData()]).catch(console.error);
