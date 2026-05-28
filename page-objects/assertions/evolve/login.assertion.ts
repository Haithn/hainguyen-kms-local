import { expect } from "@playwright/test";
import { LoginPage } from "page-objects/pages/evolve/login.page";

export class LoginAssertion {
  private readonly loginPage: LoginPage;

  constructor(pages: { LoginPage: LoginPage }) {
    this.loginPage = pages.LoginPage;
  }

  /**
   * Verifies initial sign-in state.
   * @param emailHasValue - pass true when the email field already contains text
   *   so the Send Passcode button is expected to be enabled.
   * @param checkCloseButton - pass false when testing the standalone login page
   *   (/cs/login) which has no modal close button.
   */
  async verifyInitialState(
    emailHasValue = false,
    checkCloseButton = true,
  ): Promise<void> {
    await expect(this.loginPage.elements.emailInput()).toBeEnabled();

    if (emailHasValue) {
      await expect(
        this.loginPage.elements.getAOneTimeCodeButton(),
      ).toBeEnabled();
    } else {
      await expect(
        this.loginPage.elements.getAOneTimeCodeButton(),
      ).toBeDisabled();
    }

    await expect(
      this.loginPage.elements.forgotUserNameOrPasswordButton(),
    ).toBeVisible();
    await expect(this.loginPage.elements.newToEvolveText()).toBeVisible();
    await expect(this.loginPage.elements.createAccountLink()).toBeVisible();
    if (checkCloseButton) {
      await expect(this.loginPage.elements.closeButton()).toBeVisible();
    }
  }

  /**
   * Verifies one-time passcode sent state.
   * @param checkCloseButton - pass false when testing the standalone login page
   *   (/cs/login) which has no modal close button.
   */
  async verifyOtpSentState(checkCloseButton = true): Promise<void> {
    await expect(this.loginPage.elements.emailInput()).toBeEnabled();
    await expect(this.loginPage.elements.otpSentMessage()).toBeVisible();
    await expect(this.loginPage.elements.otpInput()).toBeEnabled();
    await expect(this.loginPage.elements.didntReceiveIt()).toBeVisible();
    await expect(this.loginPage.elements.tryAgainButton()).toBeVisible();
    await expect(this.loginPage.elements.signInButton()).toBeDisabled();
    await expect(
      this.loginPage.elements.signInWithPasswordButton(),
    ).toBeVisible();
    await expect(
      this.loginPage.elements.forgotUserNameOrPasswordButton(),
    ).toBeVisible();
    await expect(this.loginPage.elements.newToEvolveText()).toBeVisible();
    await expect(this.loginPage.elements.createAccountLink()).toBeVisible();
    if (checkCloseButton) {
      await expect(this.loginPage.elements.closeButton()).toBeVisible();
    }
  }

  /**
   * Verifies password login state.
   * @param checkCloseButton - pass false when testing the standalone login page
   *   (/cs/login) which has no modal close button.
   */
  async verifyPasswordLoginState(checkCloseButton = true): Promise<void> {
    await expect(this.loginPage.elements.emailInput()).toBeEnabled();
    // Wait for password input to be visible before checking if it's enabled
    await expect(this.loginPage.elements.passwordInput()).toBeVisible({
      timeout: 10000,
    });
    await expect(this.loginPage.elements.passwordInput()).toBeEnabled();
    await expect(this.loginPage.elements.signInButton()).toBeDisabled();
    await expect(this.loginPage.elements.getAOneTimeCodeButton()).toBeVisible();
    await expect(
      this.loginPage.elements.forgotUserNameOrPasswordButton(),
    ).toBeVisible();
    await expect(this.loginPage.elements.newToEvolveText()).toBeVisible();
    await expect(this.loginPage.elements.createAccountLink()).toBeVisible();
    if (checkCloseButton) {
      await expect(this.loginPage.elements.closeButton()).toBeVisible();
    }
  }
}
