# Chopi Workspace

- [x] Requirements: Hebrew RTL UI, ILS, two-person income/expense tracking, private Google Sheets storage. App name: Chopi, in English.
- [x] Scaffold: Vite, React, JavaScript, npm, Oxlint. No additional editor extensions required.
- [x] Customize: dashboard, activity, metrics, transaction CRUD, personal/custom/shared splits, repayments and Google OAuth/Sheets adapter.
- [x] Compile: production build and focused unit tests pass.
- [x] Browser verification: phone/desktop workflows pass, including mocked Google authorization.
- [x] Local launch: VS Code task Chopi: Local Preview runs at http://localhost:5173.
- [x] Documentation: README covers Google setup, privacy, free hosting, storage and accounting rules.

## Engineering Rules

- Keep financial arithmetic in integer agorot; format ILS only at display boundaries.
- Preserve Hebrew RTL layouts and usable phone controls. Keep Chopi in English.
- Income, expenses and repayments are distinct. Repayments never inflate income or spending.
- Use Google OAuth with the current user's Sheet permissions. Never add a public owner-privileged write endpoint or persist access tokens.
- Keep local preview data separate from live Sheet data. Never copy samples into a connected Sheet.
- The Sheet is an append-only event log. Do not change row ordering, headers or authoritative JSON without a migration.
- Run `npm test`, `npm run lint`, `npm run build` and `npm run test:e2e` for relevant changes.
