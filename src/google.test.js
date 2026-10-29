import { test } from "node:test";
import assert from "node:assert/strict";
import {
  authorize,
  disconnectGoogle,
  connectSheet,
  appendChange,
  readSheet,
  headers,
} from "./google.js";

const transaction = {
  id: "one",
  type: "expense",
  title: "=not a formula",
  date: "2026-10-10",
  amount: 12550,
  person: "a",
  category: "groceries",
  shareA: 50,
};

test("Sheets auth, initialization, RAW append, replay and permission errors", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const requests = [];
  globalThis.window = {
    google: {
      accounts: {
        oauth2: {
          hasGrantedAllScopes: () => true,
          initTokenClient: (config) => ({
            requestAccessToken: () =>
              config.callback({ access_token: "mock-token", expires_in: 3600 }),
          }),
        },
      },
    },
  };
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    let data = {};
    if (url.endsWith("?fields=sheets.properties")) data = { sheets: [] };
    else if (!options.method)
      data = {
        values: [
          headers,
          ["evt", "one", "save", "", JSON.stringify(transaction)],
        ],
      };
    return { ok: true, json: async () => data };
  };
  try {
    await assert.rejects(() => readSheet("sheet"), /Google/);
    await authorize("client");
    assert.deepEqual(await connectSheet("sheet"), [transaction]);
    assert.equal(requests[1].options.method, "POST");
    const initialization = JSON.parse(requests[1].options.body).requests;
    assert.equal(initialization.length, 2);
    assert.equal(
      initialization[0].addSheet.properties.sheetId,
      initialization[1].updateCells.start.sheetId,
    );
    assert.equal(
      initialization[1].updateCells.rows[0].values[0].userEnteredValue
        .stringValue,
      "event_id",
    );
    await appendChange("sheet", transaction);
    assert.match(requests.at(-1).url, /valueInputOption=RAW/);
    assert.equal(
      JSON.parse(requests.at(-1).options.body).values[0][10],
      "=not a formula",
    );
    assert.equal(
      requests.at(-1).options.headers.Authorization,
      "Bearer mock-token",
    );
    globalThis.fetch = async () => ({ ok: false, status: 403 });
    await assert.rejects(() => readSheet("sheet"), /אין גישה/);
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ values: [["wrong"]] }),
    });
    await assert.rejects(() => readSheet("sheet"), /מבנה/);
    globalThis.fetch = async () => ({ ok: false, status: 401 });
    await assert.rejects(() => readSheet("sheet"), /פג תוקף/);
    await assert.rejects(() => readSheet("sheet"), /פג תוקף/);
  } finally {
    disconnectGoogle();
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
});
