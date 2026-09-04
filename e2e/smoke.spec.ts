import { expect, test } from "@playwright/test";

// The evaluator-journey smoke suite (CLAUDE.md §17): small on purpose.
// It protects the demo path, not coverage numbers.

test("home renders with demo entry and seeded journey history", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /great teacher/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /try the demo/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /fastapi\/fastapi/ })).toBeVisible();
});

test("wrong answer visibly adapts the path and moves coverage", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /try the demo/i }).click();
  await page.getByRole("button", { name: "Start learning" }).click();

  await expect(
    page.getByRole("heading", { name: "One pipeline, many small steps" }),
  ).toBeVisible();
  await page
    .getByRole("radio", { name: /checkpoint every request passes through/i })
    .check();
  await page
    .getByRole("radio", { name: /analyzes what each function does/i })
    .check(); // the deliberate ordering misconception
  await page
    .getByRole("textbox")
    .fill("It can modify the request or send a response itself.");
  await page.getByRole("button", { name: "Check my answers" }).click();

  await expect(page.getByLabel("How your path is adapting")).toBeVisible();
  await expect(page.getByText("10% covered")).toBeVisible();
  await expect(page.getByText(/path grew/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Where order lives/ }),
  ).toBeVisible();
});

test("leaving and returning resumes from persisted state", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /try the demo/i }).click();
  await page.getByRole("button", { name: "Start learning" }).click();
  await page
    .getByRole("radio", { name: /checkpoint every request passes through/i })
    .check();
  await page.getByRole("radio", { name: /registration order/i }).check();
  await page.getByRole("textbox").fill("modify it or respond directly");
  await page.getByRole("button", { name: "Check my answers" }).click();
  await expect(page.getByLabel("How your path is adapting")).toBeVisible();

  // Leave via a full reload (kills all client state except localStorage).
  await page.goto("/");
  await page.getByRole("link", { name: /expressjs\/express/ }).click();

  await expect(page.getByText("Welcome back")).toBeVisible();
  await expect(page.getByText(/11% covered toward/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Continue where I left off/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Review what I've learned/ }),
  ).toBeVisible();
});
