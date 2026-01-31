import { expect, test } from "@playwright/test";

test.describe("Network Graph", () => {
  test("should display graph when artist is selected", async ({ page }) => {
    await page.goto("/explore");

    // Search for an artist
    const searchInput = page.getByPlaceholder("アーティスト名を検索...");
    await searchInput.fill("Radiohead");
    await page.getByRole("button", { name: "検索" }).click();

    // Wait for search results
    await expect(page.getByRole("listitem").first()).toBeVisible({ timeout: 10000 });

    // Click on the artist
    await page.getByText("Radiohead").first().click();

    // Check that either loading state or graph appears (loading may be too fast)
    await expect(
      page
        .getByText("グラフを読み込み中...")
        .or(page.locator(".border.rounded-lg.bg-white"))
        .or(page.locator("#cy")),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should display graph container after loading", async ({ page }) => {
    await page.goto("/explore");

    // Search and select artist
    const searchInput = page.getByPlaceholder("アーティスト名を検索...");
    await searchInput.fill("The Beatles");
    await searchInput.press("Enter");

    // Wait for results and click
    await expect(page.getByRole("listitem").first()).toBeVisible({ timeout: 10000 });
    await page.getByText("The Beatles").first().click();

    // Wait for graph to appear (canvas or container)
    await expect(page.locator(".border.rounded-lg.bg-white").or(page.locator("#cy"))).toBeVisible({
      timeout: 15000,
    });
  });

  test("should clear empty state after selecting artist", async ({ page }) => {
    await page.goto("/explore");

    // Verify empty state initially
    await expect(
      page.getByText("アーティストを検索して、関連ネットワークを探索しましょう"),
    ).toBeVisible();

    // Search and select artist
    const searchInput = page.getByPlaceholder("アーティスト名を検索...");
    await searchInput.fill("Nirvana");
    await searchInput.press("Enter");

    await expect(page.getByRole("listitem").first()).toBeVisible({ timeout: 10000 });
    await page.getByText("Nirvana").first().click();

    // Empty state should disappear
    await expect(
      page.getByText("アーティストを検索して、関連ネットワークを探索しましょう"),
    ).not.toBeVisible({ timeout: 10000 });
  });

  test("should display page title", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.getByRole("heading", { name: "Music Explorer" })).toBeVisible();
  });

  test("should have home link", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.getByRole("link", { name: "ホームに戻る" })).toBeVisible();
  });
});
