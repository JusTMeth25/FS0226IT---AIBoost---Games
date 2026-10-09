import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const url =
  process.argv[2] ?? "https://justmeth25.github.io/FS0226IT---AIBoost---Games/";
const origin = new URL(url).origin;
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (new URL(r.url()).origin === origin && r.status() >= 400)
      errors.push(`${r.status()} ${r.url()}`);
  });
  const response = await page.goto(url, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  assert.equal(response.status(), 200);
  await expect(page).toHaveTitle(/Micio Club/);
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".webgl-error")).toHaveCount(0);
  await page.getByRole("button", { name: "Luna Medio" }).click();
  await page.getByLabel("Regola la mira").fill("180");
  await page.locator("#power").fill("8");
  const worker = page.waitForResponse(
    (r) => r.url().includes("/assets/bot.worker-"),
    { timeout: 30000 },
  );
  await page.getByRole("button", { name: "Spacca!" }).click();
  assert(
    (await worker).ok(),
    "Il worker deve essere servito sotto il prefisso del repository",
  );
  await expect(page.locator(".table-bottom")).not.toContainText(/Tiro [12]\b/, {
    timeout: 45000,
  });
  await expect(page.locator(".bot-error")).toHaveCount(0);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      url,
      status: 200,
      title: await page.title(),
      tavolo3D: true,
      botWorker: true,
      errors: 0,
    }),
  );
} finally {
  await browser.close();
}
