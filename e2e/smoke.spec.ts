import { expect, test, type Page } from "@playwright/test";
import { newDemoJourney } from "../src/lib/engine";

// The evaluator-journey smoke suite (CLAUDE.md §17): small on purpose.
// It protects the core loop, not coverage numbers. The scripted demo journey
// is injected directly (the home page only offers live analysis, which needs
// an API key CI doesn't have); the fixture engine then serves the loop
// deterministically.

async function seedDemoJourney(page: Page) {
  const journey = newDemoJourney(1_757_000_000_000);
  await page.addInitScript((j) => {
    // Init scripts re-run on every navigation — only seed once, or the
    // mid-test reload would wipe the learner's progress.
    if (!window.localStorage.getItem("understory.v0.journeys")) {
      window.localStorage.setItem(
        "understory.v0.journeys",
        JSON.stringify([j]),
      );
    }
  }, journey);
}

test("home is a single clean action: one input, one button, no demo clutter", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /great teacher/i }),
  ).toBeVisible();
  const input = page.getByLabel("GitHub repository");
  await expect(input).toHaveAttribute(
    "placeholder",
    "https://github.com/expressjs/express",
  );
  await expect(
    page.getByRole("button", { name: "Learn this repo" }),
  ).toBeVisible();
  await expect(page.getByText(/try the demo/i)).toHaveCount(0);
  await expect(page.getByText("How should we test you?")).toHaveCount(0);
  await expect(page.getByText("Nothing here yet.")).toBeVisible();
});

test("wrong answer visibly adapts the path and moves coverage", async ({
  page,
}) => {
  await seedDemoJourney(page);
  await page.goto("/j/demo-express");
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
  await seedDemoJourney(page);
  await page.goto("/j/demo-express");
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
