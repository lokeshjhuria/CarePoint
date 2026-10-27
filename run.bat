@echo off
setlocal
cd /d "%~dp0"
if not exist "out" mkdir "out"
echo Compiling Hospital Appointment Management System (CarePoint)...
javac -encoding UTF-8 -d out src\main\java\com\college\hospital\*.java
if errorlevel 1 (
    echo.
    echo Compilation failed. Make sure a JDK is installed and javac is available.
    pause
    exit /b 1
)
echo.
echo Starting CarePoint Hospital Appointment Server...
echo Open http://localhost:8080 in your browser.
echo Press Ctrl+C to stop the server.
java -cp out com.college.hospital.HospitalAppointmentServer
