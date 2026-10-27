# 🚀 CarePoint Health - Deployment Guide

This Hospital Appointment Management System is 100% complete and ready to deploy to any cloud platform or hosting provider.

Both the frontend and backend are self-contained, with real-time Excel Sheet (`.xlsx`) data persistence.

---

## 🌐 Option 1: Deploy to Render (Recommended, Free & Fast)

[Render](https://render.com) offers free web hosting with built-in Node.js support.

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Hospital Appointment Management System ready for deployment"
   git push origin main
   ```
2. Go to [dashboard.render.com](https://dashboard.render.com/) and click **New +** → **Web Service**.
3. Connect your GitHub repository (`CarePoint`).
4. Configure the service settings:
   - **Name**: `carepoint-hospital`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
5. Click **Deploy Web Service**.
6. Render will build and deploy the application. Your live site will be ready at:
   `https://carepoint-hospital.onrender.com`

*(A pre-configured `render.yaml` blueprint is included in the project for automatic configuration).*

---

## 🚆 Option 2: Deploy to Railway

[Railway](https://railway.app) provides instant deployments with persistent volumes:

1. Push your repository to GitHub.
2. Go to [railway.app](https://railway.app/) → Click **New Project** → **Deploy from GitHub repo**.
3. Select `CarePoint`.
4. Railway automatically detects the Node.js project using [`railway.json`](./railway.json).
5. Click **Deploy**. Your app is live with a public `.up.railway.app` URL!

---

## 🐳 Option 3: Deploy with Docker

You can run this project in any Docker-compatible cloud environment (AWS ECS/App Runner, Google Cloud Run, Azure Container Apps, or your own VPS):

1. **Build the Docker Image**:
   ```bash
   docker build -t carepoint-hospital .
   ```

2. **Run the Container** (mounting the `data/` volume for Excel file storage):
   ```bash
   docker run -d -p 8080:8080 -v carepoint_data:/app/data --name carepoint carepoint-hospital
   ```

3. Open **`http://localhost:8080`** in your browser.

---

## ⚡ Option 4: Deploy to Vercel

1. Install the Vercel CLI or import the repository in [vercel.com](https://vercel.com).
2. Root configuration [`vercel.json`](./vercel.json) is pre-configured.
3. Run:
   ```bash
   vercel
   ```
4. Follow the prompt to complete deployment.

---

## 💻 Running Locally

### Option A: Using Node.js
```bash
npm install
npm run dev
```
Open: [http://localhost:8080](http://localhost:8080)

### Option B: Using Java (OOP Server)
```cmd
.\run.bat
```
Open: [http://localhost:8080](http://localhost:8080)

---

## 🔑 Default Demo Accounts

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Staff / Admin** | `staff@carepoint.com` | `admin123` | Full dashboard, manage all appointments, delete/status updates, export Excel sheet |
| **Patient** | `patient@carepoint.com` | `patient123` | Book doctor appointments, view personal visits, cancel visits, download personal records |
*(You can also click **Create Account** on the live website to register new Patients or Staff members).*

---

## 📊 Live Excel Data Files
All appointment data is saved to disk in:
- `data/appointments.xlsx` (Microsoft Excel OpenXML spreadsheet)
- `data/appointments.csv` (RFC 4180 CSV spreadsheet)
- `data/users.tsv` (Encrypted user credentials and profiles)
