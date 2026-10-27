package com.college.hospital;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;

public class HospitalAppointmentServer {
    private static final int PORT = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
    private static final Path DATA_DIR = Path.of("data");
    private static final Path DATA_TSV_FILE = DATA_DIR.resolve("appointments.tsv");
    private static final Path DATA_EXCEL_FILE = DATA_DIR.resolve("appointments.xlsx");
    private static final Path DATA_CSV_FILE = DATA_DIR.resolve("appointments.csv");
    private static final Path USERS_TSV_FILE = DATA_DIR.resolve("users.tsv");

    private static final List<String> DOCTORS = List.of(
            "Dr. Ananya Sharma", "Dr. Rohan Mehta", "Dr. Priya Nair", "Dr. Arjun Patel",
            "Dr. Meera Iyer", "Dr. Vikram Desai", "Dr. Kavita Rao", "Dr. Aisha Khan",
            "Dr. Rahul Verma", "Dr. Neha Kulkarni", "Dr. Sanjay Joshi", "Dr. Isha Deshmukh",
            "Dr. Dev Malhotra", "Dr. Pooja Menon", "Dr. Karan Shah", "Dr. Maya Banerjee",
            "Dr. Nikhil Sinha", "Dr. Simran Gill", "Dr. Farhan Ali", "Dr. Tara Kapoor"
    );

    private static final List<String> DEPARTMENTS = List.of(
            "Cardiology", "Dermatology", "Pediatrics", "General Medicine", "Orthopedics",
            "Neurology", "Oncology", "Gynecology", "Ophthalmology", "ENT",
            "Gastroenterology", "Endocrinology", "Psychiatry", "Pulmonology", "Urology",
            "Nephrology", "Rheumatology", "Radiology", "Dentistry", "Physiotherapy"
    );

    private static final Map<String, String> DOCTOR_DEPARTMENTS = Map.ofEntries(
            Map.entry("Dr. Ananya Sharma", "Cardiology"),
            Map.entry("Dr. Rohan Mehta", "Dermatology"),
            Map.entry("Dr. Priya Nair", "Pediatrics"),
            Map.entry("Dr. Arjun Patel", "General Medicine"),
            Map.entry("Dr. Meera Iyer", "Orthopedics"),
            Map.entry("Dr. Vikram Desai", "Neurology"),
            Map.entry("Dr. Kavita Rao", "Oncology"),
            Map.entry("Dr. Aisha Khan", "Gynecology"),
            Map.entry("Dr. Rahul Verma", "Ophthalmology"),
            Map.entry("Dr. Neha Kulkarni", "ENT"),
            Map.entry("Dr. Sanjay Joshi", "Gastroenterology"),
            Map.entry("Dr. Isha Deshmukh", "Endocrinology"),
            Map.entry("Dr. Dev Malhotra", "Psychiatry"),
            Map.entry("Dr. Pooja Menon", "Pulmonology"),
            Map.entry("Dr. Karan Shah", "Urology"),
            Map.entry("Dr. Maya Banerjee", "Nephrology"),
            Map.entry("Dr. Nikhil Sinha", "Rheumatology"),
            Map.entry("Dr. Simran Gill", "Radiology"),
            Map.entry("Dr. Farhan Ali", "Dentistry"),
            Map.entry("Dr. Tara Kapoor", "Physiotherapy")
    );

    private static final List<Appointment> appointments = new ArrayList<>();
    private static final Map<String, User> usersByEmail = new ConcurrentHashMap<>();
    private static final Map<String, UserSession> sessions = new ConcurrentHashMap<>();
    private static int nextAppointmentId = 1;
    private static int nextUserId = 1;

    private static class UserSession {
        final User user;
        final long expiresAt;

        UserSession(User user, long expiresAt) {
            this.user = user;
            this.expiresAt = expiresAt;
        }
    }

    public static void main(String[] args) throws IOException {
        Files.createDirectories(DATA_DIR);
        loadUsers();
        loadAppointments();

        // Ensure Excel and CSV files are immediately created & up-to-date
        saveAppointmentsExcelAndCsv();

        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        server.createContext("/api/health", HospitalAppointmentServer::handleHealth);
        server.createContext("/api/auth", HospitalAppointmentServer::handleAuth);
        server.createContext("/api/appointments", HospitalAppointmentServer::handleAppointments);
        server.createContext("/api/doctors", HospitalAppointmentServer::handleDoctors);
        server.createContext("/", HospitalAppointmentServer::serveStaticFile);
        server.setExecutor(Executors.newCachedThreadPool());
        server.start();

        System.out.println("==================================================================");
        System.out.println(" Hospital Appointment Management System (CarePoint)");
        System.out.println(" Server running at: http://localhost:" + PORT);
        System.out.println(" Excel data file:   " + DATA_EXCEL_FILE.toAbsolutePath());
        System.out.println(" CSV data file:     " + DATA_CSV_FILE.toAbsolutePath());
        System.out.println("==================================================================");
    }

    private static void handleHealth(HttpExchange exchange) throws IOException {
        try {
            sendJson(exchange, 200, "{\"status\":\"healthy\",\"service\":\"CarePoint Hospital Appointment System\"}");
        } finally {
            exchange.close();
        }
    }

    // -------------------------------------------------------------------------
    // DOCTORS ENDPOINT
    // -------------------------------------------------------------------------
    private static void handleDoctors(HttpExchange exchange) throws IOException {
        try {
            sendJson(exchange, 200, "{\"doctors\":" + jsonArray(DOCTORS)
                    + ",\"departments\":" + jsonArray(DEPARTMENTS)
                    + ",\"doctorDepartments\":" + stringMapJson(DOCTOR_DEPARTMENTS) + "}");
        } finally {
            exchange.close();
        }
    }

    // -------------------------------------------------------------------------
    // AUTH ENDPOINT (/api/auth/register, /api/auth/login, /api/auth/me, /api/auth/logout)
    // -------------------------------------------------------------------------
    private static void handleAuth(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();

        try {
            if ("/api/auth/register".equals(path) && "POST".equals(method)) {
                registerUser(exchange);
            } else if ("/api/auth/login".equals(path) && "POST".equals(method)) {
                loginUser(exchange);
            } else if ("/api/auth/me".equals(path) && "GET".equals(method)) {
                getCurrentUser(exchange);
            } else if ("/api/auth/logout".equals(path) && "POST".equals(method)) {
                logoutUser(exchange);
            } else {
                sendError(exchange, 404, "Auth endpoint not found.");
            }
        } catch (IllegalArgumentException ex) {
            sendError(exchange, 400, ex.getMessage());
        } catch (Exception ex) {
            sendError(exchange, 500, "Internal server error: " + ex.getMessage());
        } finally {
            exchange.close();
        }
    }

    private static void registerUser(HttpExchange exchange) throws IOException {
        Map<String, String> form = parseForm(exchange);
        String name = required(form, "name", "Full Name");
        String email = required(form, "email", "Email Address").toLowerCase();
        String phone = required(form, "phone", "Phone Number");
        String role = required(form, "role", "Account Role").toUpperCase();
        String department = form.getOrDefault("department", "General");
        String password = required(form, "password", "Password");

        if (!role.equals("STAFF") && !role.equals("PATIENT")) {
            throw new IllegalArgumentException("Role must be either STAFF or PATIENT.");
        }
        if (password.length() < 4) {
            throw new IllegalArgumentException("Password must be at least 4 characters.");
        }
        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new IllegalArgumentException("Enter a valid email address.");
        }

        synchronized (HospitalAppointmentServer.class) {
            if (usersByEmail.containsKey(email)) {
                throw new IllegalArgumentException("An account with this email already exists. Please sign in instead.");
            }
            String salt = generateSalt();
            String hash = hashPassword(password, salt);
            String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));

            User user = new User(nextUserId++, name, email, phone, role, department, hash, salt, now);
            usersByEmail.put(email, user);
            saveUsers();

            String token = createSession(user);
            String response = "{\"token\":" + quote(token) + ",\"user\":" + user.toJsonWithoutSecret() + "}";
            sendJson(exchange, 201, response);
        }
    }

    private static void loginUser(HttpExchange exchange) throws IOException {
        Map<String, String> form = parseForm(exchange);
        String email = required(form, "email", "Email Address").toLowerCase();
        String password = required(form, "password", "Password");
        String requestedRole = form.get("role");

        User user = usersByEmail.get(email);
        if (user == null) {
            throw new IllegalArgumentException("Invalid email or password. Please check your credentials.");
        }

        String computedHash = hashPassword(password, user.getSalt());
        if (!computedHash.equals(user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password. Please check your credentials.");
        }

        if (requestedRole != null && !requestedRole.isBlank()) {
            if (!requestedRole.equalsIgnoreCase(user.getRole())) {
                throw new IllegalArgumentException("Account is registered as " + user.getRole() + ", not " + requestedRole.toUpperCase() + ".");
            }
        }

        String token = createSession(user);
        String response = "{\"token\":" + quote(token) + ",\"user\":" + user.toJsonWithoutSecret() + "}";
        sendJson(exchange, 200, response);
    }

    private static void getCurrentUser(HttpExchange exchange) throws IOException {
        User user = getAuthenticatedUser(exchange);
        if (user == null) {
            sendError(exchange, 401, "Not authenticated.");
            return;
        }
        sendJson(exchange, 200, "{\"user\":" + user.toJsonWithoutSecret() + "}");
    }

    private static void logoutUser(HttpExchange exchange) throws IOException {
        String token = extractToken(exchange);
        if (token != null) {
            sessions.remove(token);
        }
        sendJson(exchange, 200, "{\"message\":\"Logged out successfully.\"}");
    }

    private static String createSession(User user) {
        String token = UUID.randomUUID().toString();
        long expiresAt = System.currentTimeMillis() + (7L * 24 * 60 * 60 * 1000); // 7 days
        sessions.put(token, new UserSession(user, expiresAt));
        return token;
    }

    private static User getAuthenticatedUser(HttpExchange exchange) {
        String token = extractToken(exchange);
        if (token == null) return null;
        UserSession session = sessions.get(token);
        if (session == null) return null;
        if (System.currentTimeMillis() > session.expiresAt) {
            sessions.remove(token);
            return null;
        }
        return session.user;
    }

    private static String extractToken(HttpExchange exchange) {
        String authHeader = exchange.getRequestHeaders().getFirst("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7).trim();
        }
        String query = exchange.getRequestURI().getQuery();
        if (query != null) {
            for (String param : query.split("&")) {
                if (param.startsWith("token=")) {
                    return URLDecoder.decode(param.substring(6), StandardCharsets.UTF_8);
                }
            }
        }
        return null;
    }

    // -------------------------------------------------------------------------
    // APPOINTMENTS ENDPOINT
    // -------------------------------------------------------------------------
    private static synchronized void handleAppointments(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();

        try {
            if ("/api/appointments".equals(path) && "GET".equals(method)) {
                listAppointments(exchange);
            } else if ("/api/appointments/export-excel".equals(path) && "GET".equals(method)) {
                exportAppointmentsExcel(exchange);
            } else if ("/api/appointments/export-csv".equals(path) && "GET".equals(method)) {
                exportAppointmentsCsv(exchange);
            } else if ("/api/appointments".equals(path) && "POST".equals(method)) {
                createAppointment(exchange);
            } else if (path.matches("/api/appointments/\\d+") && "PATCH".equals(method)) {
                int id = Integer.parseInt(path.substring(path.lastIndexOf('/') + 1));
                updateStatus(exchange, id);
            } else if (path.matches("/api/appointments/\\d+") && "DELETE".equals(method)) {
                int id = Integer.parseInt(path.substring(path.lastIndexOf('/') + 1));
                deleteAppointment(exchange, id);
            } else {
                sendError(exchange, 404, "The requested appointment endpoint was not found.");
            }
        } catch (IllegalArgumentException ex) {
            sendError(exchange, 400, ex.getMessage());
        } catch (Exception ex) {
            sendError(exchange, 500, "Error: " + ex.getMessage());
            ex.printStackTrace();
        } finally {
            exchange.close();
        }
    }

    private static void listAppointments(HttpExchange exchange) throws IOException {
        User user = getAuthenticatedUser(exchange);
        List<Appointment> filteredList;

        if (user != null && user.isPatient()) {
            // Patient sees only their appointments
            String email = user.getEmail().toLowerCase();
            filteredList = appointments.stream()
                    .filter(a -> a.getEmail().equalsIgnoreCase(email) || a.getBookedByEmail().equalsIgnoreCase(email))
                    .toList();
        } else {
            // Staff or unauthenticated see all
            filteredList = appointments;
        }

        sendJson(exchange, 200, appointmentsJson(filteredList));
    }

    private static void exportAppointmentsExcel(HttpExchange exchange) throws IOException {
        User user = getAuthenticatedUser(exchange);
        List<Appointment> listToExport;
        if (user != null && user.isPatient()) {
            String email = user.getEmail().toLowerCase();
            listToExport = appointments.stream()
                    .filter(a -> a.getEmail().equalsIgnoreCase(email) || a.getBookedByEmail().equalsIgnoreCase(email))
                    .toList();
        } else {
            listToExport = appointments;
        }

        byte[] xlsxBytes = ExcelManager.generateAppointmentsXlsxBytes(listToExport);
        exchange.getResponseHeaders().set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        exchange.getResponseHeaders().set("Content-Disposition", "attachment; filename=\"carepoint_appointments.xlsx\"");
        exchange.getResponseHeaders().set("Cache-Control", "no-cache, no-store, must-revalidate");
        exchange.sendResponseHeaders(200, xlsxBytes.length);
        exchange.getResponseBody().write(xlsxBytes);
    }

    private static void exportAppointmentsCsv(HttpExchange exchange) throws IOException {
        User user = getAuthenticatedUser(exchange);
        List<Appointment> listToExport;
        if (user != null && user.isPatient()) {
            String email = user.getEmail().toLowerCase();
            listToExport = appointments.stream()
                    .filter(a -> a.getEmail().equalsIgnoreCase(email) || a.getBookedByEmail().equalsIgnoreCase(email))
                    .toList();
        } else {
            listToExport = appointments;
        }

        byte[] csvBytes = ExcelManager.generateAppointmentsCsvBytes(listToExport);
        exchange.getResponseHeaders().set("Content-Type", "text/csv; charset=utf-8");
        exchange.getResponseHeaders().set("Content-Disposition", "attachment; filename=\"carepoint_appointments.csv\"");
        exchange.getResponseHeaders().set("Cache-Control", "no-cache, no-store, must-revalidate");
        exchange.sendResponseHeaders(200, csvBytes.length);
        exchange.getResponseBody().write(csvBytes);
    }

    private static void createAppointment(HttpExchange exchange) throws IOException {
        Map<String, String> form = parseForm(exchange);
        String patient = required(form, "patient", "Patient name");
        String phone = required(form, "phone", "Phone number");
        String email = required(form, "email", "Email address");
        String doctor = required(form, "doctor", "Doctor");
        String department = required(form, "department", "Department");
        String date = required(form, "date", "Appointment date");
        String time = required(form, "time", "Appointment time");
        String reason = required(form, "reason", "Reason for visit");

        if (patient.length() > 80 || reason.length() > 300) {
            throw new IllegalArgumentException("Patient name must be 80 characters or fewer and reason 300 characters or fewer.");
        }
        if (!phone.matches("[+0-9() .-]{7,20}")) {
            throw new IllegalArgumentException("Enter a valid phone number (7–20 characters).");
        }
        if (email.length() > 120 || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new IllegalArgumentException("Enter a valid email address.");
        }
        if (!DOCTORS.contains(doctor) || !DEPARTMENTS.contains(department)) {
            throw new IllegalArgumentException("Select a doctor and department from the available options.");
        }
        if (!department.equals(DOCTOR_DEPARTMENTS.get(doctor))) {
            throw new IllegalArgumentException("The selected doctor does not belong to that department.");
        }
        try {
            if (LocalDate.parse(date).isBefore(LocalDate.now())) {
                throw new IllegalArgumentException("Appointment date cannot be in the past.");
            }
            LocalTime.parse(time);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Enter a valid appointment date and time.");
        }

        User authUser = getAuthenticatedUser(exchange);
        String bookedByRole = authUser != null ? authUser.getRole() : "PATIENT";
        String bookedByEmail = authUser != null ? authUser.getEmail() : email;
        String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));

        synchronized (HospitalAppointmentServer.class) {
            for (Appointment existing : appointments) {
                if (existing.getDoctor().equals(doctor) && existing.getDate().equals(date)
                        && existing.getTime().equals(time) && !"Cancelled".equals(existing.getStatus())) {
                    throw new IllegalArgumentException("This doctor already has an appointment at " + time + " on " + date + ". Please choose another slot.");
                }
            }

            Appointment appointment = new Appointment(
                    nextAppointmentId++, patient, phone, email, doctor,
                    department, date, time, reason, "Scheduled",
                    bookedByRole, bookedByEmail, now
            );
            appointments.add(appointment);

            // Persist to TSV and simultaneously update Excel (.xlsx) and CSV
            saveAppointments();
            saveAppointmentsExcelAndCsv();

            System.out.println("New Appointment booked: ID=" + appointment.getId() + " Patient=" + patient + " Doctor=" + doctor);
            System.out.println("Excel file updated: " + DATA_EXCEL_FILE.toAbsolutePath());

            sendJson(exchange, 201, appointment.toJson());
        }
    }

    private static void updateStatus(HttpExchange exchange, int id) throws IOException {
        Map<String, String> form = parseForm(exchange);
        String status = form.get("status");
        if (!List.of("Scheduled", "Completed", "Cancelled").contains(status)) {
            throw new IllegalArgumentException("Status must be Scheduled, Completed, or Cancelled.");
        }

        User user = getAuthenticatedUser(exchange);
        synchronized (HospitalAppointmentServer.class) {
            Appointment appointment = findAppointment(id);
            if (appointment == null) {
                sendError(exchange, 404, "Appointment not found.");
                return;
            }

            // Patients can only cancel their own appointment
            if (user != null && user.isPatient()) {
                if (!appointment.getEmail().equalsIgnoreCase(user.getEmail()) &&
                    !appointment.getBookedByEmail().equalsIgnoreCase(user.getEmail())) {
                    sendError(exchange, 403, "You can only modify your own appointments.");
                    return;
                }
                if (!"Cancelled".equals(status)) {
                    sendError(exchange, 403, "Patients can only cancel appointments.");
                    return;
                }
            }

            appointment.setStatus(status);
            saveAppointments();
            saveAppointmentsExcelAndCsv();

            System.out.println("Appointment ID " + id + " status changed to: " + status);
            sendJson(exchange, 200, appointment.toJson());
        }
    }

    private static void deleteAppointment(HttpExchange exchange, int id) throws IOException {
        User user = getAuthenticatedUser(exchange);
        if (user != null && user.isPatient()) {
            sendError(exchange, 403, "Only staff can delete appointment records.");
            return;
        }

        synchronized (HospitalAppointmentServer.class) {
            boolean removed = appointments.removeIf(a -> a.getId() == id);
            if (!removed) {
                sendError(exchange, 404, "Appointment not found.");
                return;
            }
            saveAppointments();
            saveAppointmentsExcelAndCsv();

            System.out.println("Appointment ID " + id + " deleted.");
            sendJson(exchange, 200, "{\"message\":\"Appointment deleted.\"}");
        }
    }

    private static Appointment findAppointment(int id) {
        return appointments.stream().filter(a -> a.getId() == id).findFirst().orElse(null);
    }

    // -------------------------------------------------------------------------
    // FORM PARSER & UTILS
    // -------------------------------------------------------------------------
    private static Map<String, String> parseForm(HttpExchange exchange) throws IOException {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, String> values = new HashMap<>();
        if (body.isBlank()) return values;

        for (String pair : body.split("&")) {
            if (pair.isEmpty()) continue;
            String[] parts = pair.split("=", 2);
            String key = URLDecoder.decode(parts[0], StandardCharsets.UTF_8);
            String value = parts.length > 1 ? URLDecoder.decode(parts[1], StandardCharsets.UTF_8) : "";
            values.put(key, value.trim());
        }
        return values;
    }

    private static String required(Map<String, String> form, String key, String label) {
        String value = form.get(key);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(label + " is required.");
        }
        return value;
    }

    private static synchronized String appointmentsJson(List<Appointment> list) {
        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) json.append(',');
            json.append(list.get(i).toJson());
        }
        return json.append(']').toString();
    }

    private static String stringMapJson(Map<String, String> values) {
        StringBuilder json = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, String> entry : values.entrySet()) {
            if (!first) json.append(',');
            first = false;
            json.append(quote(entry.getKey())).append(':').append(quote(entry.getValue()));
        }
        return json.append('}').toString();
    }

    private static String jsonArray(List<String> values) {
        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < values.size(); i++) {
            if (i > 0) json.append(',');
            json.append(quote(values.get(i)));
        }
        return json.append(']').toString();
    }

    private static String quote(String value) {
        if (value == null) return "\"\"";
        StringBuilder escaped = new StringBuilder("\"");
        for (char c : value.toCharArray()) {
            switch (c) {
                case '"' -> escaped.append("\\\"");
                case '\\' -> escaped.append("\\\\");
                case '\b' -> escaped.append("\\b");
                case '\f' -> escaped.append("\\f");
                case '\n' -> escaped.append("\\n");
                case '\r' -> escaped.append("\\r");
                case '\t' -> escaped.append("\\t");
                default -> {
                    if (c < 0x20) escaped.append(String.format("\\u%04x", (int) c));
                    else escaped.append(c);
                }
            }
        }
        return escaped.append('"').toString();
    }

    private static void sendJson(HttpExchange exchange, int status, String body) throws IOException {
        byte[] response = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.getResponseHeaders().set("Cache-Control", "no-store");
        exchange.getResponseHeaders().set("X-Content-Type-Options", "nosniff");
        exchange.sendResponseHeaders(status, response.length);
        exchange.getResponseBody().write(response);
    }

    private static void sendError(HttpExchange exchange, int status, String message) throws IOException {
        sendJson(exchange, status, "{\"error\":" + quote(message) + "}");
    }

    // -------------------------------------------------------------------------
    // STATIC FILE SERVER
    // -------------------------------------------------------------------------
    private static void serveStaticFile(HttpExchange exchange) throws IOException {
        String requestPath = exchange.getRequestURI().getPath();
        if ("/".equals(requestPath) || "".equals(requestPath)) requestPath = "/index.html";

        Path root = Path.of("src", "main", "resources", "static").toAbsolutePath().normalize();
        Path file = root.resolve(requestPath.startsWith("/") ? requestPath.substring(1) : requestPath).normalize();

        if (!file.startsWith(root) || !Files.isRegularFile(file)) {
            // Check fallback if running from parent directory
            root = Path.of("CarePoint", "src", "main", "resources", "static").toAbsolutePath().normalize();
            file = root.resolve(requestPath.startsWith("/") ? requestPath.substring(1) : requestPath).normalize();
        }

        if (!Files.isRegularFile(file)) {
            exchange.sendResponseHeaders(404, -1);
            exchange.close();
            return;
        }

        String fileName = file.getFileName().toString();
        String extension = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
        String contentType = switch (extension) {
            case "html" -> "text/html; charset=utf-8";
            case "css" -> "text/css; charset=utf-8";
            case "js" -> "text/javascript; charset=utf-8";
            case "json" -> "application/json; charset=utf-8";
            case "svg" -> "image/svg+xml";
            case "png" -> "image/png";
            case "ico" -> "image/x-icon";
            case "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case "csv" -> "text/csv; charset=utf-8";
            default -> "application/octet-stream";
        };

        byte[] content = Files.readAllBytes(file);
        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.getResponseHeaders().set("X-Content-Type-Options", "nosniff");
        exchange.sendResponseHeaders(200, content.length);
        exchange.getResponseBody().write(content);
        exchange.close();
    }

    // -------------------------------------------------------------------------
    // FILE STORAGE (TSV, EXCEL .xlsx, and CSV)
    // -------------------------------------------------------------------------
    private static void loadAppointments() throws IOException {
        if (!Files.exists(DATA_TSV_FILE)) return;
        List<String> lines = Files.readAllLines(DATA_TSV_FILE, StandardCharsets.UTF_8);
        for (String line : lines) {
            if (line.isBlank()) continue;
            String[] fields = line.split("\t", -1);
            if (fields.length < 10) continue;
            try {
                int id = Integer.parseInt(fields[0]);
                String patient = decode(fields[1]);
                String phone = decode(fields[2]);
                String email = decode(fields[3]);
                String doctor = decode(fields[4]);
                String department = decode(fields[5]);
                String date = decode(fields[6]);
                String time = decode(fields[7]);
                String reason = decode(fields[8]);
                String status = decode(fields[9]);
                String bookedByRole = fields.length > 10 ? decode(fields[10]) : "PATIENT";
                String bookedByEmail = fields.length > 11 ? decode(fields[11]) : email;
                String createdAt = fields.length > 12 ? decode(fields[12]) : date + " " + time;

                Appointment a = new Appointment(id, patient, phone, email, doctor, department,
                        date, time, reason, status, bookedByRole, bookedByEmail, createdAt);
                appointments.add(a);
                nextAppointmentId = Math.max(nextAppointmentId, id + 1);
            } catch (Exception ex) {
                System.err.println("Skipping malformed appointment row: " + ex.getMessage());
            }
        }
    }

    private static void saveAppointments() throws IOException {
        Files.createDirectories(DATA_TSV_FILE.getParent());
        List<String> rows = new ArrayList<>();
        for (Appointment a : appointments) {
            rows.add(a.getId() + "\t" + encode(a.getPatient()) + "\t" + encode(a.getPhone())
                    + "\t" + encode(a.getEmail()) + "\t" + encode(a.getDoctor())
                    + "\t" + encode(a.getDepartment()) + "\t" + encode(a.getDate())
                    + "\t" + encode(a.getTime()) + "\t" + encode(a.getReason())
                    + "\t" + encode(a.getStatus()) + "\t" + encode(a.getBookedByRole())
                    + "\t" + encode(a.getBookedByEmail()) + "\t" + encode(a.getCreatedAt()));
        }
        Files.write(DATA_TSV_FILE, rows, StandardCharsets.UTF_8);
    }

    private static void saveAppointmentsExcelAndCsv() {
        try {
            ExcelManager.saveAppointmentsToExcel(appointments, DATA_EXCEL_FILE);
            ExcelManager.saveAppointmentsToCsv(appointments, DATA_CSV_FILE);
        } catch (Exception ex) {
            System.err.println("Warning: Could not save appointments Excel file: " + ex.getMessage());
        }
    }

    private static void loadUsers() throws IOException {
        if (!Files.exists(USERS_TSV_FILE)) {
            // Seed default staff and patient accounts for easy testing out-of-the-box
            seedDefaultAccounts();
            return;
        }

        List<String> lines = Files.readAllLines(USERS_TSV_FILE, StandardCharsets.UTF_8);
        for (String line : lines) {
            if (line.isBlank()) continue;
            String[] fields = line.split("\t", -1);
            if (fields.length < 9) continue;
            try {
                int id = Integer.parseInt(fields[0]);
                String name = decode(fields[1]);
                String email = decode(fields[2]);
                String phone = decode(fields[3]);
                String role = decode(fields[4]);
                String department = decode(fields[5]);
                String passHash = decode(fields[6]);
                String salt = decode(fields[7]);
                String createdAt = decode(fields[8]);

                User user = new User(id, name, email, phone, role, department, passHash, salt, createdAt);
                usersByEmail.put(email.toLowerCase(), user);
                nextUserId = Math.max(nextUserId, id + 1);
            } catch (Exception ex) {
                System.err.println("Skipping malformed user row: " + ex.getMessage());
            }
        }

        // If files were empty or corrupted, ensure at least default accounts exist
        if (usersByEmail.isEmpty()) {
            seedDefaultAccounts();
        }
    }

    private static void seedDefaultAccounts() throws IOException {
        String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));

        // Default Staff Account: staff@carepoint.com / admin123
        String staffSalt = generateSalt();
        User defaultStaff = new User(
                nextUserId++, "Omkar Fandade", "staff@carepoint.com", "+91 95799 75307",
                "STAFF", "Administration", hashPassword("admin123", staffSalt), staffSalt, now
        );
        usersByEmail.put(defaultStaff.getEmail().toLowerCase(), defaultStaff);

        // Default Patient Account: patient@carepoint.com / patient123
        String patientSalt = generateSalt();
        User defaultPatient = new User(
                nextUserId++, "Alex Morgan", "patient@carepoint.com", "+91 98765 43210",
                "PATIENT", "General", hashPassword("patient123", patientSalt), patientSalt, now
        );
        usersByEmail.put(defaultPatient.getEmail().toLowerCase(), defaultPatient);

        saveUsers();
    }

    private static void saveUsers() throws IOException {
        Files.createDirectories(USERS_TSV_FILE.getParent());
        List<String> rows = new ArrayList<>();
        for (User u : usersByEmail.values()) {
            rows.add(u.getId() + "\t" + encode(u.getName()) + "\t" + encode(u.getEmail())
                    + "\t" + encode(u.getPhone()) + "\t" + encode(u.getRole())
                    + "\t" + encode(u.getDepartment()) + "\t" + encode(u.getPasswordHash())
                    + "\t" + encode(u.getSalt()) + "\t" + encode(u.getCreatedAt()));
        }
        Files.write(USERS_TSV_FILE, rows, StandardCharsets.UTF_8);
    }

    private static String encode(String value) {
        if (value == null) return "";
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private static String decode(String value) {
        if (value == null || value.isEmpty()) return "";
        return new String(Base64.getUrlDecoder().decode(value), StandardCharsets.UTF_8);
    }

    private static String generateSalt() {
        byte[] salt = new byte[16];
        new SecureRandom().nextBytes(salt);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(salt);
    }

    private static String hashPassword(String password, String salt) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(salt.getBytes(StandardCharsets.UTF_8));
            byte[] hashed = md.digest(password.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
