package com.college.hospital;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

public class ExcelManager {

    private static final String[] HEADERS = {
            "Appointment ID",
            "Patient Name",
            "Phone Number",
            "Email Address",
            "Department",
            "Doctor Name",
            "Appointment Date",
            "Appointment Time",
            "Reason for Visit",
            "Status",
            "Booked By Role",
            "Booked By Account",
            "Created At"
    };

    public static byte[] generateAppointmentsXlsxBytes(List<Appointment> appointments) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            // 1. [Content_Types].xml
            addZipEntry(zos, "[Content_Types].xml", """
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
                      <Default Extension="xml" ContentType="application/xml"/>
                      <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
                      <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
                      <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
                    </Types>
                    """);

            // 2. _rels/.rels
            addZipEntry(zos, "_rels/.rels", """
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
                    </Relationships>
                    """);

            // 3. xl/_rels/workbook.xml.rels
            addZipEntry(zos, "xl/_rels/workbook.xml.rels", """
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
                      <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
                    </Relationships>
                    """);

            // 4. xl/workbook.xml
            addZipEntry(zos, "xl/workbook.xml", """
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
                      <sheets>
                        <sheet name="Appointments" sheetId="1" r:id="rId1"/>
                      </sheets>
                    </workbook>
                    """);

            // 5. xl/styles.xml
            addZipEntry(zos, "xl/styles.xml", """
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                      <fonts count="2">
                        <font><sz val="10"/><name val="Segoe UI"/></font>
                        <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Segoe UI"/></font>
                      </fonts>
                      <fills count="3">
                        <fill><patternFill patternType="none"/></fill>
                        <fill><patternFill patternType="gray125"/></fill>
                        <fill><patternFill patternType="solid"><fgColor rgb="FF2563EB"/></patternFill></fill>
                      </fills>
                      <borders count="2">
                        <border><left/><right/><top/><bottom/></border>
                        <border>
                          <left style="thin"><color rgb="FFD1D5DB"/></left>
                          <right style="thin"><color rgb="FFD1D5DB"/></right>
                          <top style="thin"><color rgb="FFD1D5DB"/></top>
                          <bottom style="thin"><color rgb="FFD1D5DB"/></bottom>
                        </border>
                      </borders>
                      <cellStyleXfs count="1">
                        <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
                      </cellStyleXfs>
                      <cellXfs count="3">
                        <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
                        <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
                        <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
                      </cellXfs>
                    </styleSheet>
                    """);

            // 6. xl/worksheets/sheet1.xml
            StringBuilder sheetXml = new StringBuilder();
            sheetXml.append("""
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                      <cols>
                        <col min="1" max="1" width="14" customWidth="1"/>
                        <col min="2" max="2" width="22" customWidth="1"/>
                        <col min="3" max="3" width="18" customWidth="1"/>
                        <col min="4" max="4" width="26" customWidth="1"/>
                        <col min="5" max="5" width="20" customWidth="1"/>
                        <col min="6" max="6" width="22" customWidth="1"/>
                        <col min="7" max="7" width="15" customWidth="1"/>
                        <col min="8" max="8" width="14" customWidth="1"/>
                        <col min="9" max="9" width="32" customWidth="1"/>
                        <col min="10" max="10" width="14" customWidth="1"/>
                        <col min="11" max="11" width="16" customWidth="1"/>
                        <col min="12" max="12" width="24" customWidth="1"/>
                        <col min="13" max="13" width="20" customWidth="1"/>
                      </cols>
                      <sheetData>
                    """);

            // Header row
            sheetXml.append("    <row r=\"1\">\n");
            for (int i = 0; i < HEADERS.length; i++) {
                String colRef = getColName(i + 1) + "1";
                sheetXml.append("      <c r=\"").append(colRef).append("\" t=\"inlineStr\" s=\"1\"><is><t>")
                        .append(escapeXml(HEADERS[i])).append("</t></is></c>\n");
            }
            sheetXml.append("    </row>\n");

            // Data rows
            int rowIdx = 2;
            for (Appointment a : appointments) {
                sheetXml.append("    <row r=\"").append(rowIdx).append("\">\n");

                String[] values = {
                        String.valueOf(a.getId()),
                        a.getPatient(),
                        a.getPhone(),
                        a.getEmail(),
                        a.getDepartment(),
                        a.getDoctor(),
                        a.getDate(),
                        a.getTime(),
                        a.getReason(),
                        a.getStatus(),
                        a.getBookedByRole(),
                        a.getBookedByEmail(),
                        a.getCreatedAt()
                };

                for (int col = 0; col < values.length; col++) {
                    String colRef = getColName(col + 1) + rowIdx;
                    if (col == 0) {
                        // Number
                        sheetXml.append("      <c r=\"").append(colRef).append("\" s=\"2\"><v>")
                                .append(a.getId()).append("</v></c>\n");
                    } else {
                        sheetXml.append("      <c r=\"").append(colRef).append("\" t=\"inlineStr\" s=\"2\"><is><t>")
                                .append(escapeXml(values[col])).append("</t></is></c>\n");
                    }
                }

                sheetXml.append("    </row>\n");
                rowIdx++;
            }

            sheetXml.append("""
                      </sheetData>
                    </worksheet>
                    """);

            addZipEntry(zos, "xl/worksheets/sheet1.xml", sheetXml.toString());
        }
        return baos.toByteArray();
    }

    public static void saveAppointmentsToExcel(List<Appointment> appointments, Path outputPath) throws IOException {
        byte[] bytes = generateAppointmentsXlsxBytes(appointments);
        if (outputPath.getParent() != null) {
            Files.createDirectories(outputPath.getParent());
        }
        Files.write(outputPath, bytes);
    }

    public static byte[] generateAppointmentsCsvBytes(List<Appointment> appointments) {
        StringBuilder csv = new StringBuilder();
        // CSV Header
        for (int i = 0; i < HEADERS.length; i++) {
            if (i > 0) csv.append(",");
            csv.append(escapeCsv(HEADERS[i]));
        }
        csv.append("\r\n");

        // CSV Rows
        for (Appointment a : appointments) {
            String[] values = {
                    String.valueOf(a.getId()),
                    a.getPatient(),
                    a.getPhone(),
                    a.getEmail(),
                    a.getDepartment(),
                    a.getDoctor(),
                    a.getDate(),
                    a.getTime(),
                    a.getReason(),
                    a.getStatus(),
                    a.getBookedByRole(),
                    a.getBookedByEmail(),
                    a.getCreatedAt()
            };
            for (int i = 0; i < values.length; i++) {
                if (i > 0) csv.append(",");
                csv.append(escapeCsv(values[i]));
            }
            csv.append("\r\n");
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    public static void saveAppointmentsToCsv(List<Appointment> appointments, Path outputPath) throws IOException {
        byte[] bytes = generateAppointmentsCsvBytes(appointments);
        if (outputPath.getParent() != null) {
            Files.createDirectories(outputPath.getParent());
        }
        Files.write(outputPath, bytes);
    }

    private static void addZipEntry(ZipOutputStream zos, String name, String content) throws IOException {
        ZipEntry entry = new ZipEntry(name);
        zos.putNextEntry(entry);
        zos.write(content.trim().getBytes(StandardCharsets.UTF_8));
        zos.closeEntry();
    }

    private static String getColName(int colNumber) {
        StringBuilder sb = new StringBuilder();
        while (colNumber > 0) {
            int remainder = (colNumber - 1) % 26;
            sb.insert(0, (char) ('A' + remainder));
            colNumber = (colNumber - 1) / 26;
        }
        return sb.toString();
    }

    private static String escapeXml(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }

    private static String escapeCsv(String value) {
        if (value == null) return "\"\"";
        String escaped = value.replace("\"", "\"\"");
        return "\"" + escaped + "\"";
    }
}
