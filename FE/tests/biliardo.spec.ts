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
  await expect(page.locator(".table-bottom")).not.toContainText(/Tiro 1\b/, {
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
  await expect(page.locator(".table-bottom")).not.toContainText(/Tiro [12]\b/, {
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

test("frecce, mira fine e Spazio; input e finestre non avviano tiri", async ({
  page,
}) => {
  await page.goto("/");
  const canvas = page.locator("canvas"),
    angle = page.getByLabel("Regola la mira");
  await canvas.focus();
  await page.keyboard.press("ArrowRight");
  await expect(angle).toHaveValue("1");
  await page.keyboard.press("ArrowUp");
  await expect(angle).toHaveValue("2");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowLeft");
  await expect(angle).toHaveValue("0");
  await page.keyboard.press("Shift+ArrowRight");
  expect(Number(await angle.inputValue())).toBeGreaterThan(0);
  expect(Number(await angle.inputValue())).toBeLessThan(1);
  await angle.fill("10");
  await angle.press("ArrowUp");
  await expect(angle).toHaveValue("10.5");
  await angle.press("Space");
  await expect(page.getByRole("button", { name: "Spacca!" })).toBeEnabled();
  await page.getByRole("button", { name: "Come si gioca" }).click();
  await page.keyboard.press("Space");
  await expect(page.locator(".table-bottom")).toContainText("Tiro 1");
  await page.keyboard.press("Escape");
  await angle.fill("0");
  await canvas.focus();
  await page.keyboard.press("Space");
  await expect(page.locator(".shoot-button")).toBeDisabled();
  await expect(page.locator(".table-bottom")).not.toContainText(/Tiro 1\b/, {
    timeout: 25000,
  });
});

test("trascinare la stecca carica potenza, Esc annulla e il rilascio tira", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Vista 3D" }).click();
  const rect = (await page.locator("canvas").boundingBox())!;
  const x = rect.x + rect.width * 0.29,
    y = rect.y + rect.height * 0.5;
  await page.mouse.move(rect.x + rect.width * 0.78, y);
  await page.mouse.move(x, y, { steps: 40 });
  await expect(page.getByLabel("Regola la mira")).toHaveValue("0");
  await page.mouse.down();
  await page.mouse.move(x - rect.width * 0.12, y, { steps: 8 });
  await expect(page.getByRole("status")).toContainText("Rilascia per tirare");
  const charged = Number(await page.locator("#power").inputValue());
  expect(charged).toBeGreaterThan(50);
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("Regola la mira")).toHaveValue("0");
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.getByRole("status")).not.toContainText(
    "Rilascia per tirare",
  );
  await expect(page.getByRole("button", { name: "Spacca!" })).toBeEnabled();
  // Il reset via tastiera deve invalidare una carica anche prima del primo tiro.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - rect.width * 0.12, y, { steps: 8 });
  await expect(page.getByRole("status")).toContainText("Rilascia per tirare");
  await page
    .getByRole("button", { name: "Nuova partita", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).not.toContainText(
    "Rilascia per tirare",
  );
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Spacca!" })).toBeEnabled();
  // Un clic senza trascinamento non esegue un colpo.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Spacca!" })).toBeEnabled();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(rect.x - 20, y, { steps: 8 });
  await expect(page.locator("#power")).toHaveValue("100");
  await page.mouse.up();
  await expect(page.locator(".shoot-button")).toBeDisabled();
  await expect(page.locator(".table-bottom")).not.toContainText(/Tiro 1\b/, {
    timeout: 25000,
  });
});

test.describe("comandi touch", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("trascinamento sul telefono, annullamento touch e tiro al rilascio", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Vista 3D" }).click();
    const rect = (await page.locator("canvas").boundingBox())!;
    const start = {
      x: rect.x + rect.width * 0.29,
      y: rect.y + rect.height * 0.5,
    };
    const end = { x: start.x - rect.width * 0.12, y: start.y };
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: string, point?: { x: number; y: number }) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: point ? [{ ...point, id: 1 }] : [],
      });
    await touch("touchStart", start);
    await touch("touchMove", end);
    await expect(page.getByRole("status")).toContainText("Rilascia per tirare");
    await touch("touchCancel");
    await expect(page.getByRole("button", { name: "Spacca!" })).toBeEnabled();
    await touch("touchStart", start);
    await touch("touchMove", end);
    await touch("touchEnd");
    await expect(page.locator(".shoot-button")).toBeDisabled();
    await expect(page.locator(".table-bottom")).not.toContainText(/Tiro 1\b/, {
      timeout: 25000,
    });
  });
});
