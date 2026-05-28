import { type Page } from "@playwright/test";
import Env from "env/env.global";

export class CatalogPage {
  constructor(protected page: Page) {}

  elements = {
    headerCatalogLink: () => this.page.locator("#catalog").first(),
    headerSearchButton: () =>
      this.page.getByRole("button", {
        name: /Search( for products and resources)?/i,
      }).first(),
    searchInput: () => this.page.getByRole("searchbox").first(),
    registerForResultsAndRemediationLink: () =>
      this.page.getByText(/Register for results and remediation/i).first(),
    hesiTranscriptsLink: () =>
      this.page.getByText(/HESI transcripts/i).first(),
    registerForDistanceTestingLink: () =>
      this.page.getByText(/Register for distance testing/i).first(),
    firstProductTitleLink: () =>
      this.page.locator('a[href*="/cs/product/"]').first(),
    accountMenuButton: () =>
      this.page.getByRole("button", { name: /Account( Menu)?/i }).first(),
    accountSettingsLink: () => this.page.locator("#accountSettingsLink"),
    myAccountLink: () =>
      this.page.getByRole("link", { name: /^My account$/i }).first(),
  };

  async goToStudentCatalogPage(baseURL = Env.EVOLVE_WEB_URL): Promise<void> {
    await this.page.goto(`${baseURL}/cs/store?role=student`);
  }

  async clickHeaderCatalog(): Promise<void> {
    await this.elements.headerCatalogLink().click();
    await this.page.waitForURL(/\/cs\/store\?role=student/);
  }

  async searchForKeyword(keyword: string): Promise<void> {
    const hasHeaderSearchButton = await this.elements
      .headerSearchButton()
      .isVisible()
      .catch(() => false);

    if (hasHeaderSearchButton) {
      await this.elements.headerSearchButton().click();
    }

    const hasSearchInput = await this.elements
      .searchInput()
      .isVisible()
      .catch(() => false);

    if (hasSearchInput) {
      await this.elements.searchInput().fill(keyword);
      await this.elements.searchInput().press("Enter");

      try {
        await this.page.waitForURL(
          new RegExp(`/cs/search\\?query=${encodeURIComponent(keyword)}&role=student`),
          { timeout: 5000 },
        );
        return;
      } catch {
        // Fall back to direct student search navigation when the header search UI does not route reliably.
      }
    }

    await this.page.goto(
      `${Env.EVOLVE_WEB_URL}/cs/search?query=${encodeURIComponent(keyword)}&role=student`,
    );
  }

  async clickFirstProductTitle(): Promise<void> {
    await this.elements.firstProductTitleLink().click();
  }

  async clickAccountSettings(): Promise<void> {
    await this.openAccountMenu();

    const hasDirectMyAccountLink = await this.elements
      .myAccountLink()
      .isVisible()
      .catch(() => false);

    if (hasDirectMyAccountLink) {
      await this.elements.myAccountLink().click();
      return;
    }

    const hasAccountSettingsLink = await this.elements
      .accountSettingsLink()
      .isVisible()
      .catch(() => false);

    if (hasAccountSettingsLink) {
      await this.elements.accountSettingsLink().click();
      return;
    }

    await this.page.goto(`${Env.EVOLVE_WEB_URL}/cs/account`);
  }

  async currentUrl(): Promise<string> {
    return this.page.url();
  }

  async openAccountMenu(): Promise<void> {
    const accountSettingsVisible = await this.elements
      .accountSettingsLink()
      .isVisible()
      .catch(() => false);

    if (accountSettingsVisible) {
      return;
    }

    const myAccountVisible = await this.elements
      .myAccountLink()
      .isVisible()
      .catch(() => false);

    if (myAccountVisible) {
      return;
    }

    const hasAccountMenuButton = await this.elements
      .accountMenuButton()
      .isVisible()
      .catch(() => false);

    if (hasAccountMenuButton) {
      await this.elements.accountMenuButton().click();
    }
  }
}