# Chopi

A Hebrew, right-to-left, phone-first finance app for two people. Shekel amounts are stored as integer agorot. Built with React, Vite, Lucide, Recharts and Google Sheets. No application server or paid database required.

## Local Preview

Requires a current Node.js LTS release (22.12+ or 24+).

```sh
npm install
npm run dev
```

Open the localhost URL printed by Vite. The preview starts with labeled sample data stored only in this browser. You can edit or clear it in settings. This is not shared storage or a private login mode. Avoid entering sensitive real data into the local preview on a shared computer.

## Private Google Setup

Chopi uses Google Identity Services directly instead of Apps Script. Each person grants access with their own account; Google enforces the spreadsheet's permissions. No client secret, service account or owner-privileged public endpoint is used.

1. Create a new Google Sheet. Under **Share**, keep **General access: Restricted**. Add only your partner's Google account as an **Editor**. Do not publish it or enable anyone-with-link access.
2. In [Google Cloud Console](https://console.cloud.google.com/), create a project and enable **Google Sheets API**. Normal usage is free, with quotas; a billing account is not needed for this API.
3. Configure **Google Auth Platform** branding and audience. Choose **External**, keep it in **Testing**, and add both Google accounts as test users. Configure the `https://www.googleapis.com/auth/spreadsheets` data-access scope.
4. Create an OAuth client ID of type **Web application**. Add `http://localhost:5173` to **Authorized JavaScript origins**. If Vite uses a different port, add that exact origin. This token flow does not need a redirect URI or client secret.
5. In Chopi settings, enter the public OAuth client ID and the spreadsheet ID (the part between `/d/` and `/edit` in the Sheet URL). Set the names in the same order on both devices, save, then connect with Google.
6. Chopi creates a dedicated **Chopi** tab on first connection. An existing tab with incompatible headers is rejected rather than overwritten. Preview transactions are never copied to the real Sheet.
7. Use the same client ID, spreadsheet ID and person ordering on both devices. Settings are local to each browser. Tokens are held only in memory. After reloading, reconnect to Google: until connected, the app visibly returns to local preview. Google may also require renewed consent for a testing-mode app. Expired sessions display a reconnect message and never silently save cloud changes locally.

The requested scope permits access to spreadsheets your Google account can access, not only this Sheet. Chopi only requests the configured spreadsheet ID. A narrower `drive.file` flow would need Google Picker integration. Keep this OAuth app limited to the two test users. Never enter a client secret into the app.

## Privacy And Free Hosting

- Access to financial data is enforced by Google's Sheet permissions, not a hidden URL or browser email check. Anyone given access to the Sheet can read its records. Review its sharing settings periodically.
- Connected financial records are not persisted to localStorage; only preview data and configuration are. There is no analytics or application backend. Google serves OAuth and fonts; Unsplash serves a non-financial dashboard photo. External providers receive ordinary request metadata, not transaction payloads from Chopi.
- This is private-access cloud storage, **not end-to-end encryption**. Secure both Google accounts, ideally with two-factor authentication. Disconnecting clears the in-memory token but does not revoke the OAuth grant; revoke it through your Google Account's third-party connections if needed.
- For use from both phones, deploy `dist` to an HTTPS static host. Cloudflare Pages currently has a free tier suitable for a small personal static site: build command `npm run build`, output directory `dist`. Verify current provider terms and limits. A custom domain is optional.
- Add the hosted HTTPS origin to the OAuth client's allowed origins. Open that URL on each phone and configure the connection. `localhost` only works on the computer running the dev server; it is not a public phone URL. Do not use a development server as production hosting.
- The website shell may be public; real finance data still requires a Google account with permission on the private Sheet. No real Google project, Sheet or hosted site is created by the source code alone.

## Publish And Update

The public OAuth client ID is in `.env` (`VITE_GOOGLE_CLIENT_ID`) and is prefilled on new devices. An optional `VITE_GOOGLE_SHEET_ID` can go in the uncommitted `.env.local`. Never put a client secret in either file.

First time: run `npx wrangler login` and approve in the browser, then `npx wrangler pages project create chopi --production-branch=main`. Add the resulting `https://….pages.dev` origin to the OAuth client's Authorized JavaScript origins.

Every update: `npm run deploy`. It runs the unit tests, builds, and uploads only `dist`. Refresh Chopi on each phone afterwards.

## Accounting Rules

- Income belongs to the recipient. Expenses track the payer separately from the beneficiary split. Shared expenses default to 50/50; either person's personal expense and custom whole-percentage splits are supported.
- Monthly income minus monthly expenses is the surplus, not a bank-account balance or investment gain. Repayments are not income or spending.
- The balance between people is **all-time**, independent of the selected month. A positive internal balance means person B owes person A. Odd agorot round to person A and the remainder goes to B, preserving totals.
- Categories: groceries, dates, trips, transport, home, eating out, health, shopping and other.
- Changes appear on manual refresh or returning focus to the app. There is no continuous background polling.

## Storage And Backups

The `Chopi` tab is an **append-only event log**: event ID, transaction ID, action, recorded time, validated transaction JSON, and readable date/type/ILS/payer/category/description/split columns. The JSON is authoritative. All input uses `RAW` mode to avoid spreadsheet formula interpretation.

Do not manually sort, edit, insert blank rows into, or change the headers of this tab. The app replays changes in row order. Use another tab for spreadsheet formulas and analysis. Editing or deleting a transaction adds an event; old versions remain in the Sheet and its history. Delete is not secure erasure.

Appending does not rely on mutable row numbers. If two people edit the same transaction, the last appended change wins. There is no conflict-merge UI. On a network timeout, refresh before retrying: Google may have committed the write even if the response did not arrive. A retry of the same transaction ID is replayed as an update, not a second transaction.

Use the settings JSON export or Google Sheets' download/version history for backups. JSON amounts are in agorot, with an explicit `amountUnit`. Chopi does not currently have a JSON import tool.

## Verification

```sh
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

Unit tests cover splitting, rounding, repayment accounting, monthly filtering, validation, event replay and mocked Sheets requests/permission failures. Browser tests cover phone/desktop layout, transaction CRUD and persistence, filters, settings, exports and mocked Google connections. A real Google authorization and two-account live test require your own Google setup and are not replaced by mocks.
