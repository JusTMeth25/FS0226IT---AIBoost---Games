import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { calcolaAnteprima } from "../src/giochi/biliardo/anteprima";
import { creaStato } from "../src/giochi/biliardo/regole";

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
  await expect(angle).toHaveValue("0.25");
  await page.keyboard.down("Shift");
  await expect(page.locator(".fine-aim")).toContainText("Mira fine attiva");
  await page.keyboard.up("Shift");
  await page.keyboard.press("s");
  await expect(page.locator("#power")).toHaveValue("91");
  await page.keyboard.press("w");
  await expect(page.locator("#power")).toHaveValue("96");
  await page.keyboard.press("Shift+s");
  await expect(page.locator("#power")).toHaveValue("95");
  await page.keyboard.press("+");
  await expect(page.locator("#power")).toHaveValue("100");
  await page.keyboard.press("-");
  await expect(page.locator("#power")).toHaveValue("95");
  await page.locator("#power").fill("96");
  await angle.fill("10");
  await angle.press("ArrowUp");
  await expect(angle).toHaveValue("10.25");
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

test("camera libera: trascinamento, zoom e spostamento non cambiano mira o tirano", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Muovi vista" }).click();
  const canvas = page.locator("canvas");
  const rect = (await canvas.boundingBox())!;
  const original = await canvas.screenshot();
  await page.mouse.move(rect.x + rect.width * 0.6, rect.y + rect.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(
    rect.x + rect.width * 0.4,
    rect.y + rect.height * 0.55,
    { steps: 12 },
  );
  await page.mouse.up();
  const rotated = await canvas.screenshot();
  expect(rotated.equals(original)).toBe(false);
  await expect(page.getByLabel("Regola la mira")).toHaveValue("0");
  await expect(page.locator(".table-bottom")).toContainText("Tiro 1");
  await page.mouse.down({ button: "right" });
  await page.mouse.move(
    rect.x + rect.width * 0.5,
    rect.y + rect.height * 0.55,
    { steps: 8 },
  );
  await page.mouse.up({ button: "right" });
  const panned = await canvas.screenshot();
  expect(panned.equals(rotated)).toBe(false);
  await page.mouse.wheel(0, -180);
  const zoomed = await canvas.screenshot();
  expect(zoomed.equals(panned)).toBe(false);
  await page.getByRole("button", { name: "Reset vista" }).click();
  const reset = await canvas.screenshot();
  expect(reset.equals(zoomed)).toBe(false);
  await page.getByRole("button", { name: "Avvicina vista" }).click();
  await page.getByRole("button", { name: "Torna alla mira" }).click();
  await expect(page.getByRole("button", { name: "Spacca!" })).toBeEnabled();
  await page.keyboard.press("s"); // funziona anche dopo aver premuto un pulsante
  await expect(page.locator("#power")).toHaveValue("91");
});

test("anteprima completa: arrivi coerenti con la simulazione e potenza aggiornata", async ({
  page,
}) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  const initial = await canvas.screenshot();
  await page.getByRole("button", { name: "Traiettoria completa" }).click();
  const endpoint = (power: number) =>
    calcolaAnteprima(creaStato(), { angle: 0, power });
  const label = (p: { x: number; z: number }) =>
    `X ${p.x.toFixed(2)} · Z ${p.z.toFixed(2)}`;
  const expected = endpoint(0.96);
  await expect(page.locator(".preview-white")).toContainText(
    label(expected.white.final),
  );
  await expect(page.locator(".preview-target")).toContainText(
    `Palla ${expected.target!.id}: ${label(expected.target!.final)}`,
  );
  const predicted = await canvas.screenshot();
  expect(predicted.equals(initial)).toBe(false);
  await page.keyboard.press("s");
  await expect(page.locator("#power")).toHaveValue("91");
  const next = endpoint(0.91);
  await expect(page.locator(".preview-white")).toContainText(
    label(next.white.final),
  );
  await expect(page.locator(".preview-target")).toContainText(
    `Palla ${next.target!.id}: ${label(next.target!.final)}`,
  );
  await page.getByRole("button", { name: "Traiettoria completa" }).click();
  await expect(page.locator(".preview-summary")).toHaveCount(0);
});

test("trascinare la stecca carica potenza, Esc annulla e il rilascio tira", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Vista 3D" }).click();
  const canvas = page.locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  let rect = (await canvas.boundingBox())!;
  let x = rect.x + rect.width * 0.29,
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
  // Il focus sul pulsante Reset può aver spostato lo scroll della pagina.
  await canvas.scrollIntoViewIfNeeded();
  rect = (await canvas.boundingBox())!;
  x = rect.x + rect.width * 0.29;
  y = rect.y + rect.height * 0.5;
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
  test("camera touch ruota il tavolo senza modificare il tiro", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Muovi vista" }).click();
    const canvas = page.locator("canvas");
    await canvas.scrollIntoViewIfNeeded();
    const rect = (await canvas.boundingBox())!;
    const initial = await canvas.screenshot();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        {
          x: rect.x + rect.width * 0.65,
          y: rect.y + rect.height * 0.45,
          id: 1,
        },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: rect.x + rect.width * 0.4, y: rect.y + rect.height * 0.55, id: 1 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    expect((await canvas.screenshot()).equals(initial)).toBe(false);
    await expect(page.getByLabel("Regola la mira")).toHaveValue("0");
    await expect(page.locator(".table-bottom")).toContainText("Tiro 1");
    await page.getByRole("button", { name: "Torna alla mira" }).click();
    await expect(page.getByRole("button", { name: "Spacca!" })).toBeEnabled();
  });
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
