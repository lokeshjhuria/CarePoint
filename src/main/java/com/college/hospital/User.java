package com.college.hospital;

public class User {
    private final int id;
    private final String name;
    private final String email;
    private final String phone;
    private final String role; // "STAFF" or "PATIENT"
    private final String department; // e.g. "General Medicine", "Administration", "Cardiology", or "N/A" for patient
    private final String passwordHash;
    private final String salt;
    private final String createdAt;

    public User(int id, String name, String email, String phone, String role, String department,
                String passwordHash, String salt, String createdAt) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.role = role.toUpperCase();
        this.department = department != null && !department.isBlank() ? department : "General";
        this.passwordHash = passwordHash;
        this.salt = salt;
        this.createdAt = createdAt;
    }

    public int getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getRole() { return role; }
    public String getDepartment() { return department; }
    public String getPasswordHash() { return passwordHash; }
    public String getSalt() { return salt; }
    public String getCreatedAt() { return createdAt; }

    public boolean isStaff() {
        return "STAFF".equalsIgnoreCase(role) || "ADMIN".equalsIgnoreCase(role);
    }

    public boolean isPatient() {
        return "PATIENT".equalsIgnoreCase(role);
    }

    public String toJsonWithoutSecret() {
        return "{\"id\":" + id +
                ",\"name\":" + quote(name) +
                ",\"email\":" + quote(email) +
                ",\"phone\":" + quote(phone) +
                ",\"role\":" + quote(role) +
                ",\"department\":" + quote(department) +
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
