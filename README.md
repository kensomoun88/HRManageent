# Daymark HR Attendance

A bilingual Khmer/English attendance dashboard built with React, TypeScript, and Vite.

## Features

- Staff directory with employee creation and search
- Optional JPEG, PNG, or WebP employee photos (up to 2 MB), stored in the shared database and included in backups
- Manual staff records with employment start and resignation dates, editable after creation
- Staff form calculates live service duration in years, months, and days from the start date through today, regardless of resignation date
- Staff directory displays each employee's service duration from their start date through today, including resigned employees
- Leave requests for annual, sick, personal, holiday, and other leave
- Every employee receives 18 leave days per calendar year; all leave types count, calendar days include weekends, and pending requests reserve days until approved or rejected
- Staff can request leave for their assigned employee, while administrators approve or reject requests; remaining, approved, and pending day balances are shown by year
- Approved leave automatically appears in daily attendance without clock-in/out times; clock-in and manual attendance are blocked for approved leave dates
- Administrators can delete attendance entries and leave requests; deleting an approved leave releases its reserved days. Deleting an employee permanently removes their attendance and leave requests and unassigns (but does not delete) linked user accounts.
- Active, future-starting, and resigned employee status tracking
- Daily clock-in and clock-out records
- Manual attendance entry with employee ID, date, clock-in, and clock-out fields
- Late arrival calculation using a configurable start time and grace period
- Early departure calculation using a configurable end time, shown in daily attendance and monthly reports
- Monthly attendance and late-time summaries with CSV export
- Monthly on-time percentage is calculated as on-time attendance days divided by recorded attendance days; total late time is shown in hours and minutes
- Administrator account management with employee assignment, account activation, and password resets
- Attendance manager accounts can record and correct attendance for all employees without access to account management, staff edits, settings, or backups
- Assigned staff accounts can view, enter, and correct attendance only for their own employee record, including manual date and clock-time entry, and use server-timed clock-in/clock-out; manager/admin attendance entry can cover any employee
- Logout invalidates the current server session
- Responsive dashboard for desktop and mobile

## Run on a shared office computer

```sh
npm install
npm run dev
```

Run `npm run dev` on the office computer that will host the shared data. On first start, create an administrator account; the staff and attendance data in that browser will be imported into the shared database. Keep this computer running while staff use the app.

Other computers on the office network can open `http://OFFICE-COMPUTER-IP:5173`. Find the office computer's local IP with `ipconfig` in PowerShell. Windows may ask to allow Node.js through the firewall; allow it only on trusted private networks.

For production mode, run `npm run build` and then `npm start`; clients connect to `http://OFFICE-COMPUTER-IP:3001`.

For remote locations, first connect each device and the office computer to the same private VPN, then use the office computer's VPN address with the relevant port. Do not set up router port forwarding or expose the app/database directly to the public internet. VPN service fees, if any, depend on the VPN provider.

## Optional Cloudflare deployment

The local Node.js/SQLite setup above remains available. Cloudflare support uses a separate Worker and D1 database; deploying it creates a separate cloud copy and does not change `data/hr.sqlite`.

Cloudflare's free quotas and terms can change, and usage above the free limits may incur charges. Check the current Cloudflare pricing and limits before deployment. HR data is sensitive: do not upload existing records unless you intentionally choose to transfer them and have an approved backup.

### Prepare a Cloudflare account

1. Install dependencies with `npm install`, then authenticate Wrangler in your own terminal with `npx wrangler login`. Do not share account passwords or API tokens in chat.
2. Create the D1 database with `npx wrangler d1 create daymark-hr`. Copy the returned database ID into `wrangler.jsonc`, replacing `REPLACE_WITH_D1_DATABASE_ID`.
3. Generate a strong setup token locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Configure it as a Worker secret using `npx wrangler secret put ADMIN_SETUP_TOKEN`; paste the generated token into Wrangler's local prompt, not into source code or chat.
4. For local testing, create the ignored `.dev.vars` file with `ADMIN_SETUP_TOKEN=your-local-test-token` and run `npm run cf:migrate:local`, followed by `npm run cf:dev`. Open the local Wrangler address and use that token to create the first administrator. Local D1 data is separate from the remote database.
5. To prepare production, apply the schema using `npm run cf:migrate:remote`, then deploy with `npm run cf:deploy`. These commands change your Cloudflare account; do not run them until you have reviewed the database name, account, and intended data handling.

The setup screen requires the configured token to limit public first-admin creation. The browser-data checkbox is opt-in and transfers only the employee and attendance data currently held by that browser plus its work schedule. It does **not** copy the local Node server's SQLite database, user accounts/passwords, or leave requests. Leave the checkbox unchecked for a blank cloud setup. For an existing business, plan and verify a separate migration before sending any live HR data; create accounts and set new passwords in Cloudflare rather than assuming local password hashes can be reused.

Cloud backups are stored in the same D1 database (daily, up to 30 snapshots); download manual backups regularly and keep a protected offsite copy. D1 storage is not a substitute for an independent backup. Restoring replaces employee, attendance, leave, and schedule data but leaves Cloudflare user accounts in place. The Worker uses Cambodia time for staff clock-in/out.

### Host the frontend on Vercel with GitHub

The repository includes Vercel configuration for the Vite frontend and a same-origin API proxy. Keep the Cloudflare Worker and D1 database as the backend; do not deploy the local Node/SQLite server to Vercel.

1. Deploy the Cloudflare Worker and D1 database using the steps above. Replace the placeholder D1 ID in `wrangler.jsonc`, apply `npm run cf:migrate:remote`, then deploy with `npm run cf:deploy`. Copy the Worker base URL ending in `.workers.dev`.
2. Generate a long random secret locally. Configure that same value as the Worker secret with `npx wrangler secret put VERCEL_PROXY_SECRET` and as a Vercel environment variable named `VERCEL_PROXY_SECRET`. Never put the secret in source code or send it in chat. The proxy uses it to authorize forwarding the client IP needed by office-network attendance checks.
3. Push this repository to a private GitHub repository and import it into Vercel. Vercel uses `npm run build` and `dist` from `vercel.json`.
4. In Vercel Project Settings, add `CLOUDFLARE_WORKER_URL` with the Worker base URL and `VERCEL_PROXY_SECRET` with the same secret. Add both to Production; add them to Preview only if preview deployments should use the production HR database. Redeploy after setting variables.
5. Open the Vercel HTTPS URL and create the first administrator using the `ADMIN_SETUP_TOKEN` Worker secret. The Vercel proxy keeps API requests and login cookies on the Vercel origin; phone GPS permissions work on the HTTPS site.

The Vercel frontend and Cloudflare Worker/D1 are separate services. Applying remote migrations or deploying the Worker changes the Cloudflare account, and connecting GitHub deploys application code; review each target before proceeding. Use a private repository and restrict access to the Vercel project because this application handles sensitive HR data.

## Shared data and security

- Staff, attendance, and schedule settings are stored in the central SQLite database at `data/hr.sqlite` on the office computer.
- The first administrator account is created during initial setup and is preserved as an administrator when upgrading an existing database. Administrators can add user accounts from User accounts, assign staff accounts to an employee, create attendance managers, reset passwords, and deactivate accounts. Attendance managers can view and enter attendance for all employees but cannot manage accounts, employee records, settings, or backups. Leave the password field blank when creating an account to generate a secure random temporary password; share it securely with that user. Every signed-in user can change their own password from the sidebar after confirming their current password. Staff accounts can view and add/correct attendance only for their assigned employee record and use clock-in/clock-out; they cannot access other staff attendance, staff records, settings, backups, or accounts.
- Leave is allotted as 18 calendar days per employee per calendar year. All leave categories share the same allowance and weekends count as leave days. Pending requests reserve days; only an administrator can approve or reject requests. Staff submit requests for their own assigned employee, and managers/admins may submit requests on behalf of an employee.
- Share the administrator login only with trusted managers. Give each employee a separate account and never share passwords. Deactivated users are immediately denied access and their active sessions are invalidated.
- The app checks for shared data updates every 10 seconds.
- A daily JSON backup is saved automatically to `data/backups` on the host computer, retaining the 30 most recent backups. Create a manual backup from Settings to download an extra copy to your computer.
- Restore a JSON backup from Settings. The server validates its contents and first saves the current data as a backup before replacing staff, attendance, and work settings. User accounts and passwords are not changed by restore.
- Copy downloaded backups to a separate, access-controlled drive or device; the automatic host backups alone do not protect against host computer loss. Treat backup files as sensitive HR data.
- The SQLite database and backups are ignored by Git.
- Use only on a trusted office network or through a private VPN. This local HTTP setup does not provide TLS; do not use it over untrusted networks or expose it directly to the public internet.

Run `npm run build` to type-check and create a production build, or `npm run lint` to lint the source. Node.js 24 or newer is required for the built-in SQLite database.
