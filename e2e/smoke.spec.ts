import { expect, test } from "@playwright/test";

// The evaluator-journey smoke suite (CLAUDE.md §17): small on purpose.
// It enters exactly the way an evaluator does — through the demo button —
// and exercises the scripted fixture loop deterministically (CI is keyless).

test("home offers one input, one button, and the demo path — no clutter", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /great teacher/i }),
  ).toBeVisible();
  await expect(page.getByLabel("GitHub repository")).toHaveAttribute(
    "placeholder",
    "github.com/owner/repository",
  );
  await expect(
    page.getByRole("button", { name: "Learn this repo" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /try the demo/i })).toBeVisible();
  // question style moved to onboarding; no seeded journeys in the sidebar
  await expect(page.getByText("How should we test you?")).toHaveCount(0);
  await expect(page.getByText("Nothing yet — try the demo.")).toBeVisible();
});

test("blank submit guides to the demo instead of guessing a repo", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Learn this repo" }).click();
  await expect(
    page.getByText("Paste a GitHub repository URL, or try the demo below."),
  ).toBeVisible();
});

test("wrong answer visibly adapts the path and moves coverage", async ({
  page,
}) => {
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

test.describe("iPhone viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("sidebar is an off-canvas drawer with a working toggle", async ({
    page,
  }) => {
    await page.goto("/");
    // Content is full-width; the drawer toggle floats top-left.
    const toggle = page.getByRole("button", { name: "Open navigation" });
    await expect(toggle).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Recent journeys" }),
    ).not.toBeInViewport();

    await toggle.click();
    await expect(
      page.getByRole("navigation", { name: "Recent journeys" }),
    ).toBeInViewport();

    await page.getByRole("button", { name: "Close navigation" }).click();
    await expect(
      page.getByRole("navigation", { name: "Recent journeys" }),
    ).not.toBeInViewport();
  });
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
