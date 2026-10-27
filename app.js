const form = document.querySelector("#appointment-form");
const rows = document.querySelector("#appointment-rows");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#search-input");
const statusFilter = document.querySelector("#status-filter");
const formMessage = document.querySelector("#form-message");
let appointments = [];
let doctorDepartments = {};
let doctors = [];

const today = new Date();
document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("en", {
  weekday: "short", month: "short", day: "numeric", year: "numeric"
}).format(today);
document.querySelector("#date-input").min = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
  .toISOString().slice(0, 10);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

async function loadOptions() {
  const data = await request("/api/doctors");
  doctorDepartments = data.doctorDepartments;
  doctors = data.doctors;
  const departmentSelect = document.querySelector("#department-select");
  for (const value of data.departments) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    departmentSelect.append(option);
  }
  populateDoctors("");
  document.querySelector("#department-select").addEventListener("change", event => {
    populateDoctors(event.target.value);
  });
  document.querySelector("#doctor-select").addEventListener("change", event => {
    const department = doctorDepartments[event.target.value];
    if (department) {
      document.querySelector("#department-select").value = department;
      populateDoctors(department, event.target.value);
    }
  });
}

function populateDoctors(department, selectedDoctor = "") {
  const select = document.querySelector("#doctor-select");
  select.replaceChildren(new Option("Select doctor", ""));
  for (const doctor of doctors) {
    if (!department || doctorDepartments[doctor] === department) {
      const option = document.createElement("option");
      option.value = doctor;
      option.textContent = doctor;
      select.append(option);
    }
  }
  if (selectedDoctor) select.value = selectedDoctor;
}

function updateStats() {
  document.querySelector("#stat-total").textContent = appointments.length;
  document.querySelector("#stat-scheduled").textContent = appointments.filter(item => item.status === "Scheduled").length;
  document.querySelector("#stat-completed").textContent = appointments.filter(item => item.status === "Completed").length;
  const date = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  document.querySelector("#stat-today").textContent = appointments.filter(item => item.date === date && item.status !== "Cancelled").length;
}

function renderAppointments() {
  const query = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  const filtered = appointments.filter(item => {
    const matchesText = [item.patient, item.doctor, item.department, item.phone, item.email]
      .some(value => value.toLowerCase().includes(query));
    return matchesText && (status === "All" || item.status === status);
  }).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  rows.innerHTML = filtered.map(item => {
    const statusClass = item.status.toLowerCase();
    const date = new Date(`${item.date}T00:00:00`).toLocaleDateString("en", {
      month: "short", day: "numeric", year: "numeric"
    });
    const time = new Date(`2000-01-01T${item.time}`).toLocaleTimeString("en", {
      hour: "numeric", minute: "2-digit"
    });
    return `<tr>
      <td><span class="patient-name">${escapeHtml(item.patient)}</span><span class="patient-contact">${escapeHtml(item.phone)}</span></td>
      <td><span class="doctor-name">${escapeHtml(item.doctor)}</span><span class="doctor-department">${escapeHtml(item.department)}</span></td>
      <td>${escapeHtml(date)}<span class="appointment-time">${escapeHtml(time)}</span></td>
      <td><span class="status-pill ${statusClass}">${escapeHtml(item.status)}</span></td>
      <td class="actions">
        <label class="sr-only" for="status-${item.id}">Update ${escapeHtml(item.patient)} appointment status</label>
        <select id="status-${item.id}" data-status-id="${item.id}" aria-label="Update appointment status">
          ${["Scheduled", "Completed", "Cancelled"].map(value =>
            `<option${item.status === value ? " selected" : ""}>${value}</option>`).join("")}
        </select>
        <button class="delete-button" type="button" data-delete-id="${item.id}" aria-label="Delete ${escapeHtml(item.patient)} appointment">×</button>
      </td>
    </tr>`;
  }).join("");
  emptyState.classList.toggle("visible", filtered.length === 0);
  document.querySelector("#results-count").textContent =
    `Showing ${filtered.length} appointment${filtered.length === 1 ? "" : "s"}`;
  updateStats();
}

async function refreshAppointments() {
  appointments = await request("/api/appointments");
  renderAppointments();
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  formMessage.textContent = "";
  formMessage.className = "form-message";
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  try {
    await request("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams(new FormData(form))
    });
    form.reset();
    document.querySelector("#date-input").min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString().slice(0, 10);
    formMessage.textContent = "Appointment scheduled successfully.";
    formMessage.classList.add("success");
    await refreshAppointments();
  } catch (error) {
    formMessage.textContent = error.message;
    formMessage.classList.add("error");
  } finally {
    button.disabled = false;
  }
});

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
  } catch (error) {
    window.alert(error.message);
    await refreshAppointments();
  }
});

rows.addEventListener("click", async event => {
  const button = event.target.closest("[data-delete-id]");
  if (!button) return;
  const appointment = appointments.find(item => item.id === Number(button.dataset.deleteId));
  if (!appointment || !window.confirm(`Delete the appointment for ${appointment.patient}?`)) return;
  try {
    await request(`/api/appointments/${appointment.id}`, { method: "DELETE" });
    await refreshAppointments();
  } catch (error) {
    window.alert(error.message);
  }
});

searchInput.addEventListener("input", renderAppointments);
statusFilter.addEventListener("change", renderAppointments);
document.querySelector("#refresh-button").addEventListener("click", async () => {
  try {
    await refreshAppointments();
  } catch (error) {
    window.alert(error.message);
  }
});

Promise.all([loadOptions(), refreshAppointments()]).catch(error => {
  formMessage.textContent = `Could not connect to the server: ${error.message}`;
  formMessage.classList.add("error");
});
