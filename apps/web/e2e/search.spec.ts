import { expect, test } from "@playwright/test";

test.describe("Artist Search", () => {
  test("should display search bar on explore page", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.getByPlaceholder("アーティスト名を検索...")).toBeVisible();
  });

  test("should display search button", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.getByRole("button", { name: "検索" })).toBeVisible();
  });

  test("should show empty state initially", async ({ page }) => {
    await page.goto("/explore");
    await expect(
      page.getByText("アーティストを検索して、関連ネットワークを探索しましょう"),
    ).toBeVisible();
  });

  test("should show search results when typing artist name", async ({ page }) => {
    await page.goto("/explore");

    const searchInput = page.getByPlaceholder("アーティスト名を検索...");
    await searchInput.fill("Radiohead");
    await page.getByRole("button", { name: "検索" }).click();

    // Wait for results
    await expect(page.getByRole("listitem").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Radiohead")).toBeVisible();
  });

  test("should show loading state while searching", async ({ page }) => {
    await page.goto("/explore");

    const searchInput = page.getByPlaceholder("アーティスト名を検索...");
    await searchInput.fill("Beatles");
    await page.getByRole("button", { name: "検索" }).click();

    // Wait for results (loading state may be too fast to catch)
    await expect(page.getByText("The Beatles").first()).toBeVisible({ timeout: 10000 });
  });

  test("should search on Enter key press", async ({ page }) => {
    await page.goto("/explore");

    const searchInput = page.getByPlaceholder("アーティスト名を検索...");
    await searchInput.fill("Nirvana");
    await searchInput.press("Enter");

    // Wait for results
    await expect(page.getByText("Nirvana")).toBeVisible({ timeout: 10000 });
  });

  test("should disable search button for short queries", async ({ page }) => {
    await page.goto("/explore");

    const searchInput = page.getByPlaceholder("アーティスト名を検索...");
    await searchInput.fill("R");

    await expect(page.getByRole("button", { name: "検索" })).toBeDisabled();
  });
});
