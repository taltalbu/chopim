import { test, expect } from "@playwright/test";
import { headers } from "../src/google.js";

const visibleButton = (page, name) =>
  page.getByRole("button", { name, exact: true }).filter({ visible: true });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("Hebrew dashboard and screens fit small phones and desktop", async ({
  page,
}) => {
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator(".metrics")).toContainText("25,500");
  await expect(page.locator(".metrics")).toContainText("9,270.90");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of ["מבט משותף", "התנועות שלנו", "לאן הכסף הולך"]) {
      await visibleButton(page, name).click();
      if (name === "לאן הכסף הולך")
        await expect(page.locator(".recharts-surface").first()).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
});

test("add, edit, reload, search and delete an expense", async ({ page }) => {
  await visibleButton(page, "תנועה חדשה").click();
  await page.getByRole("spinbutton", { name: "סכום בשקלים" }).fill("100.25");
  await page.getByLabel("תיאור", { exact: true }).fill("בדיקת קניות");
  await visibleButton(page, "שמירת תנועה").click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await visibleButton(page, "התנועות שלנו").click();
  await page.getByRole("textbox", { name: "חיפוש תנועה" }).fill("בדיקת קניות");
  await visibleButton(page, "עריכת בדיקת קניות").click();
  await page.getByRole("spinbutton", { name: "סכום בשקלים" }).fill("120.50");
  await visibleButton(page, "שמירת תנועה").click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await visibleButton(page, "התנועות שלנו").click();
  await page.getByRole("textbox", { name: "חיפוש תנועה" }).fill("בדיקת קניות");
  await expect(visibleButton(page, "עריכת בדיקת קניות")).toContainText(
    "120.50",
  );
  await visibleButton(page, "עריכת בדיקת קניות").click();
  await visibleButton(page, "מחיקה").click();
  await visibleButton(page, "כן, למחוק").click();
  await expect(
    page.getByText("אין תנועות להצגה", { exact: true }),
  ).toBeVisible();
});

test("settling a balance does not count as spending or income", async ({
  page,
}) => {
  const before = await page.locator(".metrics").innerText();
  await visibleButton(page, "החזר").click();
  await expect(
    page.getByRole("heading", { name: "מה חדש אצלנו?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "מחיקה", exact: true }),
  ).not.toBeVisible();
  await visibleButton(page, "שמירת תנועה").click();
  await expect(page.getByText("אנחנו מאוזנים", { exact: true })).toBeVisible();
  expect(await page.locator(".metrics").innerText()).toBe(before);
});

test("filters and month navigation show the correct empty states", async ({
  page,
}) => {
  await visibleButton(page, "התנועות שלנו").click();
  await page
    .getByRole("combobox", { name: "סינון לפי סוג" })
    .selectOption("income");
  await expect(page.locator(".transaction-row")).toHaveCount(2);
  await page
    .getByRole("combobox", { name: "סינון לפי קטגוריה" })
    .selectOption("dates");
  await expect(page.locator(".transaction-row")).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "סינון לפי סוג" })
    .selectOption("all");
  await expect(page.locator(".transaction-row")).toHaveCount(1);
  await visibleButton(page, "החודש הקודם").click();
  await expect(
    page.getByText("אין תנועות להצגה", { exact: true }),
  ).toBeVisible();
});

test("settings persist names and export valid financial JSON", async ({
  page,
}) => {
  await visibleButton(page, "הגדרות").click();
  await page.getByLabel("שם ראשון", { exact: true }).fill("טל");
  await page.getByLabel("שם שני", { exact: true }).fill("דנה");
  await visibleButton(page, "שמירת הגדרות").click();
  await page.reload();
  await visibleButton(page, "הגדרות").click();
  await expect(page.getByLabel("שם ראשון", { exact: true })).toHaveValue("טל");
  const downloadPromise = page.waitForEvent("download");
  await visibleButton(page, "ייצוא כל התנועות (JSON)").click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const data = JSON.parse(Buffer.concat(chunks).toString());
  expect(data.currency).toBe("ILS");
  expect(data.amountUnit).toBe("agorot");
  expect(data.people).toEqual({ a: "טל", b: "דנה" });
  expect(data.transactions).toHaveLength(9);
});

test("mocked Google connection isolates live data and appends RAW events", async ({
  page,
}) => {
  const rows = [headers];
  let denied = false;
  await page.route("https://accounts.google.com/gsi/client", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.google={accounts:{oauth2:{hasGrantedAllScopes:()=>true,initTokenClient:config=>({requestAccessToken:()=>config.callback({access_token:'test-only-token',expires_in:3600})})}}};`,
    }),
  );
  await page.route("https://sheets.googleapis.com/**", async (route) => {
    if (denied)
      return route.fulfill({
        status: 403,
        json: { error: { message: "denied" } },
      });
    const request = route.request();
    expect(request.headers().authorization).toBe("Bearer test-only-token");
    if (request.method() === "POST" && request.url().includes(":append")) {
      expect(request.url()).toContain("valueInputOption=RAW");
      rows.push(...request.postDataJSON().values);
      return route.fulfill({ json: { updates: { updatedRows: 1 } } });
    }
    return route.fulfill({
      json: request.url().includes("fields=")
        ? { sheets: [{ properties: { title: "Chopi" } }] }
        : { values: rows },
    });
  });
  await page.reload();
  await visibleButton(page, "הגדרות").click();
  await page
    .getByLabel("מזהה לקוח Google (Client ID)", { exact: true })
    .fill("test.apps.googleusercontent.com");
  await page
    .getByLabel("מזהה הגיליון (Spreadsheet ID)", { exact: true })
    .fill("private_sheet_id_12345");
  await visibleButton(page, "שמירת הגדרות").click();
  await page.getByRole("button", { name: /חיבור עם Google/ }).click();
  await expect(page.locator(".connection-status")).toHaveText("Google Sheets");
  await expect(page.locator(".transaction-row")).toHaveCount(0);
  await visibleButton(page, "תנועה חדשה").click();
  await page.getByRole("spinbutton", { name: "סכום בשקלים" }).fill("99.90");
  await page.getByLabel("תיאור", { exact: true }).fill("=SAFE_TITLE");
  await visibleButton(page, "שמירת תנועה").click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(visibleButton(page, "עריכת =SAFE_TITLE")).toBeVisible();
  expect(rows).toHaveLength(2);
  expect(JSON.parse(rows[1][4]).amount).toBe(9990);
  denied = true;
  await visibleButton(page, "רענון מהגיליון").click();
  await expect(page.getByRole("alert")).toContainText("אין גישה לגיליון");
});
