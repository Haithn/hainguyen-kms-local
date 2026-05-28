import { expect } from "@playwright/test";
import { MyEvolvePage } from "page-objects/pages/evolve/my-evolve.page";

export class MyEvolveAssertion {
  private readonly myEvolvePage: MyEvolvePage;

  constructor(pages: { MyEvolvePage: MyEvolvePage }) {
    this.myEvolvePage = pages.MyEvolvePage;
  }

  async verifyProtectedContentVisible(): Promise<void> {
    await expect(this.myEvolvePage.elements.protectedContent()).toBeVisible();
    await expect(this.myEvolvePage.elements.accountMenuTrigger()).toBeVisible();
  }

  async verifyAuthenticatedMyEvolveState(): Promise<void> {
    await expect.poll(() => this.myEvolvePage.currentUrl()).toContain(
      "/cs/myEvolve",
    );
    await this.verifyProtectedContentVisible();
  }

  async verifyAccountMenuOptionsVisible(): Promise<void> {
    await this.myEvolvePage.openAccountMenu();
    await expect(this.myEvolvePage.elements.accountSettingsOption()).toBeVisible();
    await expect(this.myEvolvePage.elements.orderHistoryOption()).toBeVisible();
  }

  async verifyRedirectedOutOfProtectedArea(
    previousUrl: string,
    role = "student",
  ): Promise<void> {
    await expect
      .poll(() => this.myEvolvePage.currentUrl())
      .not.toBe(previousUrl);
    await expect.poll(() => this.myEvolvePage.currentUrl()).toContain(
      `/cs/store?role=${role}`,
    );
    await expect(this.myEvolvePage.elements.accountMenuTrigger()).toBeHidden();
    await expect(this.myEvolvePage.elements.signInEntryPoint()).toBeVisible();
  }

  async verifyAccountSettingsUnavailable(): Promise<void> {
    await expect(this.myEvolvePage.elements.accountSettingsOption()).toBeHidden();
  }

  async verifyOrderHistoryUnavailable(): Promise<void> {
    await expect(this.myEvolvePage.elements.orderHistoryOption()).toBeHidden();
  }
}