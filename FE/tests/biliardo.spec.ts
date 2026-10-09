import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

test("desktop: tavolo 3D, controlli, personalizzazione e ciclo umano/bot", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Una partita. Nove vite." }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  mkdirSync(".impeccable/review", { recursive: true });
  await page.screenshot({
    path: ".impeccable/review/desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Come si gioca" }).click();
  await expect(page.getByRole("dialog")).toContainText("La 8 arriva alla fine");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Personalizza la stecca" }).click();
  await page.getByRole("button", { name: /Notte felina Verde/ }).click();
  await page.getByRole("button", { name: "Torna al tavolo" }).click();
  await expect(page.locator(".cue-name")).toHaveText("Notte felina");
  await page.getByRole("button", { name: "Vista 3D" }).click();
  await expect(
    page.getByRole("button", { name: "Vista dall’alto" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Luna Medio" }).click();
  await expect(page.locator(".opponent-score")).toContainText("Luna");
  await page.getByRole("button", { name: "Nero Difficile" }).click();
  await expect(page.locator(".opponent-score")).toContainText("Nero");
  await page.getByRole("button", { name: "Spacca!" }).click();
  await expect(page.locator(".shoot-button")).toBeDisabled();
  await expect(page.locator(".table-bottom")).not.toContainText("Tiro 1·", {
    timeout: 25000,
  });
  await expect(page.locator(".shoot-button")).toBeEnabled({ timeout: 45000 });
  await page.getByText("Cronaca del tavolo").click();
  await expect(page.locator(".match-log li").first()).toBeVisible();
  await page
    .getByRole("button", { name: "Nuova partita", exact: true })
    .click();
  await page.getByRole("button", { name: "Continua questa" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Nuova partita", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Nuova partita" })
    .click();
  await expect(page.getByRole("button", { name: "Spacca!" })).toBeEnabled();
  await expect(page.locator(".bot-error")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("mobile: nessun overflow, stecca e difficoltà accessibili", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: ".impeccable/review/mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Luna Medio" }).click();
  await expect(page.locator(".opponent-option.chosen")).toContainText("Luna");
  await page.getByRole("button", { name: "Personalizza la stecca" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByLabel("Regola la mira").fill("12");
  await expect(page.getByLabel("Regola la mira")).toHaveValue("12");
});

test("un fallo passa al worker del bot e il cambio partita annulla il lavoro", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Luna Medio" }).click();
  await page.getByLabel("Regola la mira").fill("180");
  await page.locator("#power").fill("8");
  await page.getByRole("button", { name: "Spacca!" }).click();
  await expect(page.locator(".match-log")).toContainText("fallo", {
    timeout: 15000,
  });
  await expect(page.locator(".table-bottom")).not.toContainText("Tiro 2·", {
    timeout: 30000,
  });
  await page
    .getByRole("button", { name: "Nuova partita", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Nuova partita" })
    .click();
  await expect(page.getByRole("button", { name: "Spacca!" })).toBeEnabled();
  await expect(page.locator(".table-bottom")).toContainText("Tiro 1");
});
