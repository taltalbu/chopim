import { applyEvents, validateTransaction } from "./finance.js";

const scope = "https://www.googleapis.com/auth/spreadsheets";
export const headers = [
  "event_id",
  "record_id",
  "action",
  "recorded_at",
  "transaction_json",
  "date",
  "type",
  "amount_ils",
  "person",
  "category",
  "description",
  "share_a_percent",
];
let token = "";
let expiresAt = 0;

export function disconnectGoogle() {
  token = "";
  expiresAt = 0;
}

export function authorize(clientId) {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2)
      return reject(
        new Error("שירות Google עדיין לא נטען. יש לבדוק את החיבור ולנסות שוב"),
      );
    window.google.accounts.oauth2
      .initTokenClient({
        client_id: clientId,
        scope,
        callback: (response) => {
          if (
            response.error ||
            !response.access_token ||
            !window.google.accounts.oauth2.hasGrantedAllScopes(response, scope)
          )
            return reject(new Error("לא ניתנה הרשאת גישה לגיליון"));
          token = response.access_token;
          expiresAt = Date.now() + Number(response.expires_in) * 1000 - 30000;
          resolve();
        },
        error_callback: () =>
          reject(
            new Error(
              "ההתחברות נסגרה או נחסמה. יש לאפשר חלונות קופצים ולנסות שוב",
            ),
          ),
      })
      .requestAccessToken({ prompt: "select_account" });
  });
}

export async function sheetRequest(sheetId, path, options = {}) {
  if (!token || Date.now() >= expiresAt)
    throw new Error("פג תוקף החיבור. יש להתחבר מחדש ל-Google דרך ההגדרות");
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}${path}`,
    {
      ...options,
      signal: AbortSignal.timeout(20000),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (!response.ok) {
    if (response.status === 401) {
      disconnectGoogle();
      throw new Error("פג תוקף החיבור. יש להתחבר מחדש ל-Google דרך ההגדרות");
    }
    if ([403, 404].includes(response.status))
      throw new Error(
        "אין גישה לגיליון. יש לבדוק את מזהה הגיליון, הרשאת העריכה והפעלת Sheets API",
      );
    if (response.status === 429)
      throw new Error("יותר מדי בקשות ל-Google. יש לנסות שוב בעוד רגע");
    throw new Error(
      "הבקשה ל-Google נכשלה. לפני ניסיון שמירה נוסף יש לרענן ולבדוק אם התנועה נשמרה",
    );
  }
  return response.json();
}

export async function readSheet(sheetId) {
  const result = await sheetRequest(
    sheetId,
    `/values/${encodeURIComponent("'Chopi'!A:L")}`,
  );
  const rows = result.values || [];
  if (JSON.stringify(rows[0]) !== JSON.stringify(headers))
    throw new Error(
      "מבנה לשונית Chopi אינו מתאים. אין לשנות את הכותרות או למיין את יומן השינויים",
    );
  return applyEvents(rows.slice(1));
}

export async function connectSheet(sheetId) {
  const metadata = await sheetRequest(sheetId, "?fields=sheets.properties");
  if (!metadata.sheets?.some((sheet) => sheet.properties.title === "Chopi")) {
    const newSheetId =
      crypto.getRandomValues(new Uint32Array(1))[0] % 2000000000;
    await sheetRequest(sheetId, ":batchUpdate", {
      method: "POST",
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                sheetId: newSheetId,
                title: "Chopi",
                gridProperties: { frozenRowCount: 1 },
              },
            },
          },
          {
            updateCells: {
              start: { sheetId: newSheetId, rowIndex: 0, columnIndex: 0 },
              rows: [
                {
                  values: headers.map((header) => ({
                    userEnteredValue: { stringValue: header },
                  })),
                },
              ],
              fields: "userEnteredValue",
            },
          },
        ],
      }),
    });
  }
  return readSheet(sheetId);
}

export async function appendChange(sheetId, transaction, action = "save") {
  if (!["save", "delete"].includes(action)) throw new Error("פעולה אינה תקינה");
  validateTransaction(transaction);
  const row = [
    crypto.randomUUID(),
    transaction.id,
    action,
    new Date().toISOString(),
    JSON.stringify(transaction),
    transaction.date,
    transaction.type,
    transaction.amount / 100,
    transaction.person,
    transaction.category,
    transaction.title,
    transaction.shareA,
  ];
  await sheetRequest(
    sheetId,
    `/values/${encodeURIComponent("'Chopi'!A:L")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values: [row] }) },
  );
}
