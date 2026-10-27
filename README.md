# CarePoint Health - Hospital Appointment Management System

A Java-based Hospital Appointment Management System with user authentication (Staff & Patient roles) and automated Excel sheet (`.xlsx`) data storage.

---

## 🌟 Key Features

1. **Authentication & Roles**:
   - **Login Page & Create Account Page** with role-based routing.
   - **🧑‍⚕️ Staff Role**: Full hospital dashboard, view all appointments, filter/search visits, change appointment status (Scheduled, Completed, Cancelled), delete appointments, schedule walk-ins, and export Excel reports.
   - **👤 Patient Role**: Dedicated patient portal, book doctor appointments across 20 specialties, view personal booked appointments, cancel visits, and export personal appointments.

2. **📊 Real-time Excel Sheet Data Storage**:
   - Every appointment booked, updated, or cancelled is **automatically saved into Microsoft Excel format**: `data/appointments.xlsx`.
   - Also automatically generates a comma-separated `data/appointments.csv` file.
   - Excel export headers include: `Appointment ID`, `Patient Name`, `Phone Number`, `Email Address`, `Department`, `Doctor Name`, `Appointment Date`, `Appointment Time`, `Reason for Visit`, `Status`, `Booked By Role`, `Booked By Account`, and `Created At`.
   - **Direct Browser Download**: Click the **Download Excel (.xlsx)** button in the top bar or dashboard to download the live spreadsheet anytime.

3. **Pre-configured Demo Accounts**:
   - **Staff / Administrator**:
     - Email: `staff@carepoint.com`
     - Password: `admin123`
     - Role: `STAFF` (Administration)
   - **Patient**:
     - Email: `patient@carepoint.com`
     - Password: `patient123`
     - Role: `PATIENT`
   - *You can also create new accounts directly via the **Create Account** tab!*

---

## 🚀 How to Run the Java Application

### Prerequisites
- Java JDK 17 or higher (tested with Java 26 / JDK 21+).

### Steps
1. Open PowerShell or Command Prompt.
2. Navigate to the project directory:
   ```powershell
   cd "C:\Users\lokes\Downloads\oops java\CarePoint"
   ```
3. Run `run.bat`:
   ```cmd
   .\run.bat
   ```
   *Or simply double-click `run.bat` in Windows File Explorer.*
4. Open your browser and visit:
   [http://localhost:8080](http://localhost:8080)
5. Log in using a demo account or click **Create Account** to register as either a Patient or Staff.

---

## 📁 Project Architecture (Object-Oriented Java)

```
CarePoint/
├── run.bat                          # One-click compilation and execution script
├── data/
│   ├── appointments.xlsx            # Real-time Microsoft Excel spreadsheet of all appointments
│   ├── appointments.csv             # CSV version of appointments
│   ├── appointments.tsv             # Local appointment storage
│   └── users.tsv                    # Registered user accounts storage
├── src/
│   └── main/
│       ├── java/com/college/hospital/
│       │   ├── HospitalAppointmentServer.java   # HTTP server & routing controller
│       │   ├── Appointment.java                 # Appointment entity model
│       │   ├── User.java                        # User account & authentication model
│       │   └── ExcelManager.java                # Pure Java Excel (.xlsx) generator using OpenXML
│       └── resources/static/
│           ├── index.html                       # Login, Create Account & Dashboard UI
│           ├── app.js                           # Frontend controller & API client
│           └── styles.css                       # Responsive healthcare styling
```
