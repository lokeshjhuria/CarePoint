# CarePoint Health

A responsive hospital appointment website inspired by the healthcare reference shared for this project. The Vercel version has an image-rich public landing page, search across 20 doctors in 20 specialties/departments, appointment requests, and a password-protected staff appointment panel for administrator Omkar Fandade.

## Deploy to Vercel

### 1. Create the appointment database

1. Create a Supabase project at [supabase.com](https://supabase.com/).
2. In **SQL Editor**, run the contents of [`database/schema.sql`](./database/schema.sql). The schema enables row-level security and makes active doctor/time slots unique.
3. In the Supabase project settings, copy the **Project URL** and **service_role** key. Keep the service-role key secret; it is only used by server-side API functions.

### 2. Add environment variables

In Vercel, open **Project → Settings → Environment Variables** and add these for Preview and Production:

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | Your Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your server-side Supabase service-role key |
| `ADMIN_PASSWORD` | A long, unique staff dashboard password |

`ADMIN_PASSWORD` protects staff access and signs temporary eight-hour sessions. Do not put these secrets in browser code or commit them to source control.

### 3. Deploy

Import this folder as a Vercel project. Choose the **Other** framework preset; no build command or output directory is needed. Deploy the project, then add or verify the environment variables and redeploy.

To use the Vercel CLI instead, install it, set the same environment variables in the Vercel project, then run `vercel` from this folder.

### 4. Try the site

- The home page and doctor search are public.
- Book a visit using a doctor card or the call-to-action near the bottom of the page.
- Reach the front desk at **+91 95799 75307**.
- Use **Staff log in** and the `ADMIN_PASSWORD` to view, update, and delete appointment requests.
- Appointment requests are stored in Supabase; the Vercel serverless functions use the service-role key, while unauthenticated visitors cannot read the appointment list.

## Local Java version

The original standalone Java appointment dashboard remains available. It uses only JDK 17+ and stores local data in `data\appointments.tsv`.

1. Double-click [`run.bat`](./run.bat) or run `.\run.bat` in PowerShell.
2. Visit [http://localhost:8080](http://localhost:8080).
3. Stop the server with Ctrl+C.

The local Java app is separate from the Vercel version; Vercel does not provide a native Java serverless runtime. The deployable API therefore uses native JavaScript Vercel Functions.

## Project files

- `index.html`, `styles.css`, `app.js` — responsive public site, search, booking, and staff UI.
- `api/` — Vercel API functions, validation, Supabase access, and staff sessions.
- `database/schema.sql` — Supabase table, row-level security, and unique appointment slot index.
- `vercel.json` — function and response-header configuration.
- `src/main/` and `run.bat` — standalone Java version for local coursework demos.

The doctor and patient images are served by Unsplash, and the fonts are served by Google Fonts; the deployed site needs an internet connection to load them. This is a college-project demonstration, not production healthcare software. Do not submit real patient or medical information.
