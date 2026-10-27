package com.college.hospital;

public class Appointment {
    private final int id;
    private final String patient;
    private final String phone;
    private final String email;
    private final String doctor;
    private final String department;
    private final String date;
    private final String time;
    private final String reason;
    private String status;
    private final String bookedByRole; // "PATIENT" or "STAFF"
    private final String bookedByEmail;
    private final String createdAt;

    public Appointment(int id, String patient, String phone, String email, String doctor,
                       String department, String date, String time, String reason, String status,
                       String bookedByRole, String bookedByEmail, String createdAt) {
        this.id = id;
        this.patient = patient;
        this.phone = phone;
        this.email = email;
        this.doctor = doctor;
        this.department = department;
        this.date = date;
        this.time = time;
        this.reason = reason;
        this.status = status;
        this.bookedByRole = bookedByRole != null && !bookedByRole.isBlank() ? bookedByRole : "PATIENT";
        this.bookedByEmail = bookedByEmail != null && !bookedByEmail.isBlank() ? bookedByEmail : email;
        this.createdAt = createdAt != null && !createdAt.isBlank() ? createdAt : date + " " + time;
    }

    public int getId() { return id; }
    public String getPatient() { return patient; }
    public String getPhone() { return phone; }
    public String getEmail() { return email; }
    public String getDoctor() { return doctor; }
    public String getDepartment() { return department; }
    public String getDate() { return date; }
    public String getTime() { return time; }
    public String getReason() { return reason; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getBookedByRole() { return bookedByRole; }
    public String getBookedByEmail() { return bookedByEmail; }
    public String getCreatedAt() { return createdAt; }

    public String toJson() {
        return "{\"id\":" + id +
                ",\"patient\":" + quote(patient) +
                ",\"phone\":" + quote(phone) +
                ",\"email\":" + quote(email) +
                ",\"doctor\":" + quote(doctor) +
                ",\"department\":" + quote(department) +
                ",\"date\":" + quote(date) +
                ",\"time\":" + quote(time) +
                ",\"reason\":" + quote(reason) +
                ",\"status\":" + quote(status) +
                ",\"bookedByRole\":" + quote(bookedByRole) +
                ",\"bookedByEmail\":" + quote(bookedByEmail) +
                ",\"createdAt\":" + quote(createdAt) + "}";
    }

    private static String quote(String value) {
        if (value == null) return "\"\"";
        StringBuilder sb = new StringBuilder("\"");
        for (char c : value.toCharArray()) {
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\b' -> sb.append("\\b");
                case '\f' -> sb.append("\\f");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
                }
            }
        }
        return sb.append('"').toString();
    }
}
