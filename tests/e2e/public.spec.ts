import { expect, test } from "@playwright/test";

test("home page leads with a printed book starring your child", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("starring your child");
  await expect(page.locator("#stories .starter-card")).toHaveCount(6);
  await expect(page.getByText("$34.99").first()).toBeVisible();
  const footer = page.locator("footer");
  for (const name of ["Terms", "Privacy", "Content policy"]) await expect(footer.getByRole("link", { name })).toBeVisible();
});

test("pricing shows the three plans and printed-copy prices", async ({ page }) => {
  await page.goto("/pricing");
  for (const name of ["Doodle", "Storyteller", "Publisher"]) await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(page.getByText(/hardcover \$34\.99, paperback \$24\.99/)).toBeVisible();
});

test("legal pages are published", async ({ page }) => {
  for (const [path, title] of [["/terms", "Terms of Service"], ["/privacy", "Privacy Policy"], ["/content-policy", "Content Policy"]]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  }
  await page.goto("/privacy");
  await expect(page.getByText("never used to train AI models")).toBeVisible();
});

test("family links stay out of search engines", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /read/");
  expect(robots).toContain("Disallow: /record/");
  const r = await request.get("/read/not-a-real-token");
  expect(r.headers()["x-robots-tag"]).toContain("noindex");
});

test("signed-out visitors are sent to sign in, and the API answers 401", async ({ page, request }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/sign-in/);
  expect((await request.get("/api/books")).status()).toBe(401);
  expect((await request.post("/api/orders", { data: {} })).status()).toBe(401);
});

test("a turned-off or unknown share link explains itself", async ({ page }) => {
  await page.goto("/read/abcdefghijklmnopqrstuv");
  await expect(page.getByText("This link has been turned off or doesn't exist.")).toBeVisible();
});

test("unknown pages get a friendly 404", async ({ page }) => {
  const r = await page.goto("/this-page-is-not-here");
  expect(r?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "We couldn't find that page." })).toBeVisible();
});
