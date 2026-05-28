import { type Page } from "@playwright/test";
import Env from "env/env.global";

export class LoginPage {
  elements = {
    // Inputs
    emailInput: () =>
      this.page.getByRole("textbox", { name: "Email address or username" }),
    redeemCourseIdInput: () =>
      this.page
        .locator(
          "#code-entry, #accessCode, #accesscode, #redeemCodeInput, div.redeem-section-myevolve input[type='text'], input[name='codeEntry'], input[placeholder*='Redeem an Access Code' i], input[placeholder*='Enter an Evolve Course ID' i], input[name*='redeem' i]",
        )
        .first(),
    otpInput: () =>
      this.page.getByRole("textbox", { name: "Enter one-time code" }),
    passwordInput: () =>
      this.page
        .locator(
          "input[type='password'], #password, input[name='password'], input[placeholder='Password']",
        )
        .first(),

    // Buttons
    headerSignInButton: () => this.page.locator("#loginNav"),
    signInButton: () => this.page.locator("#loginButton"),
    redeemButton: () =>
      this.page
        .locator(
          "#btnRedeem, #redeemButton, div:has(> ep-button[ep-text='Submit']) button, button#btnRedeem, button:has-text('Submit'), button:has-text('Redeem')",
        )
        .first(),
    redeemAccessLink: () =>
      this.page
        .locator(
          "#redeemNav, ep-button[ng-click='openRedeemAccessCodeModal()'] button, a:has-text('Redeem'), button:has-text('Redeem Access Code'), button:has-text('Redeem')",
        )
        .first(),
    closeButton: () =>
      this.page.getByRole("button", { name: "Toggle Sign-in Close" }),
    getAOneTimeCodeButton: () =>
      this.page.getByRole("button", { name: "Get a one-time code" }),
    signInWithPasswordButton: () =>
      this.page.getByRole("button", { name: "Sign in with password" }),
    forgotUserNameOrPasswordButton: () =>
      this.page.getByRole("button", { name: "Forgot username or password?" }),
    enterPasswordButton: () =>
      this.page.getByRole("button", { name: "Enter password" }),
    tryAgainButton: () =>
      this.page.getByRole("button", { name: "Try again, Resend passcode" }),
    sendAnotherButton: () =>
      this.page.getByRole("button", { name: "Send another, Resend passcode" }),
    loginWithPasswordFromGateButton: () =>
      this.page
        .locator(
          "button:has-text('Login with password'), a:has-text('Login with password'), button:has-text('Sign in with password'), a:has-text('Sign in with password'), button:has-text('Enter password'), a:has-text('Enter password')",
        )
        .first(),
    createAccountFromGateButton: () =>
      this.page
        .locator(
          "div[role='dialog']:has-text('You must log in to view this content') a:has-text('Create an account'), div[role='dialog']:has-text('You must log in to view this content') button:has-text('Create an account'), .modal-dialog:has-text('You must log in to view this content') a:has-text('Create an account'), .modal-dialog:has-text('You must log in to view this content') button:has-text('Create an account'), .modal-content:has-text('You must log in to view this content') a:has-text('Create an account'), .modal-content:has-text('You must log in to view this content') button:has-text('Create an account')",
        )
        .first(),
    signInGateEntryPoint: () =>
      this.page.locator("#loginNav, #footer-submenu-link-sign-in").first(),

    // Links
    createAccountLink: () =>
      this.page.locator('#createAccountNav, a[href="/cs/register"]').first(),
    studentButton: () =>
      this.page.getByRole("button", { name: "I'm a Student" }),
    acceptCookiesButton: () =>
      this.page.getByRole("button", { name: /Accept all cookies/i }),

    // Static text
    newToEvolveText: () => this.page.getByText(/^New to Evolve\?$/),
    otpSentMessage: () =>
      this.page.getByText("We sent a 6-digit code to your email address."),
    didntReceiveIt: () => this.page.getByText("Didn't receive an email?"),
    loginRequiredMessage: () =>
      this.page.getByText(/You must log in to view this content/i),
    pendoTextContainer: () =>
      this.page.locator("._pendo-text, .pendo-text, [class*='pendo-text'], #pendo-guide-container, #pendo-base").first(),
  };

  constructor(protected page: Page) {}

  // ── Navigation ──────────────────────────────────────────────────────────────

  async goToEvolveLoginPage(baseURL = Env.EVOLVE_WEB_URL): Promise<void> {
    await this.page.goto(`${baseURL}/cs/login`);
  }

  async goToEvolveHomePage(baseURL = Env.EVOLVE_WEB_URL): Promise<void> {
    await this.page.goto(`${baseURL}/cs/`);
  }

  // ── Tier-1 action methods ───────────────────────────────────────────────────

  /** Clicks the Sign In button in the page header to open the login modal. */
  async clickHeaderSignIn(): Promise<void> {
    await this.elements.headerSignInButton().click();
  }

  /** @param email - Email address or username */
  async fillEmail(email: string): Promise<void> {
    await this.elements.emailInput().fill(email);
  }

  async clickGetAOneTimeCode(): Promise<void> {
    await this.elements.getAOneTimeCodeButton().click();
  }

  async dismissPendoGuideIfPresent(): Promise<void> {
    if (this.page.isClosed()) {
      return;
    }

    const hasPendoGuide = await this.page
      .locator("#pendo-base, #pendo-guide-container")
      .first()
      .isVisible()
      .catch(() => false);

    if (hasPendoGuide) {
      await this.page.keyboard.press("Escape").catch(() => undefined);
    }

    await this.page
      .locator("[id^='pendo-close-guide'], #pendo-close-guide, #pendo-guide-container [aria-label='Close']")
      .first()
      .click({ force: true, timeout: 1000 })
      .catch(() => undefined);

    await this.page
      .locator("#pendo-base button:has-text('Next'), #pendo-guide-container button:has-text('Next')")
      .first()
      .click({ force: true, timeout: 1000 })
      .catch(() => undefined);

    await this.page
      .evaluate(() => {
        document.querySelector("#pendo-base")?.remove();
        document.querySelector("#pendo-guide-container")?.remove();
        document
          .querySelectorAll(".pendo-guide-overlay, ._pendo-guide-walkthrough_")
          .forEach((el) => el.remove());
      })
      .catch(() => undefined);
  }

  async clickLoginWithPassword(): Promise<void> {
    await this.dismissPendoGuideIfPresent();

    const isPasswordInputVisible = await this.elements
      .passwordInput()
      .isVisible()
      .catch(() => false);

    if (isPasswordInputVisible) {
      return;
    }

    const isStandaloneLogin = await this.elements
      .enterPasswordButton()
      .isVisible()
      .catch(() => false);

    if (isStandaloneLogin) {
      await this.elements.enterPasswordButton().click();
    } else {
      const hasSignInWithPassword = await this.elements
        .signInWithPasswordButton()
        .isVisible()
        .catch(() => false);

      if (hasSignInWithPassword) {
        await this.elements.signInWithPasswordButton().click();
      }
    }

    // Wait for password input to appear after switching to password login
    await this.elements.passwordInput().waitFor({
      state: "visible",
      timeout: 10000,
    });
  }

  /** @param password - Account password */
  async fillPassword(password: string): Promise<void> {
    const isPasswordInputVisible = await this.elements
      .passwordInput()
      .isVisible()
      .catch(() => false);

    if (!isPasswordInputVisible) {
      await this.clickLoginWithPassword();
    }

    await this.elements.passwordInput().fill(password);
  }

  async clickSignIn(): Promise<void> {
    await this.elements.signInButton().click();
  }

  async clickCreateAccount(): Promise<void> {
    await this.elements.createAccountLink().click();
  }

  async acceptCookiesIfPresent(): Promise<void> {
    const hasCookieBanner = await this.elements
      .acceptCookiesButton()
      .isVisible()
      .catch(() => false);

    if (hasCookieBanner) {
      await this.elements.acceptCookiesButton().click({ force: true });
    }

    const hasPreferenceCenterOverlay = await this.page
      .locator("#onetrust-consent-sdk, .onetrust-pc-dark-filter")
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasPreferenceCenterOverlay) {
      return;
    }

    await this.page
      .locator(".onetrust-close-btn-handler, #onetrust-close-btn-container button")
      .first()
      .click({ force: true })
      .catch(() => undefined);

    await this.page.evaluate(() => {
      const sdk = document.querySelector("#onetrust-consent-sdk");
      if (sdk) {
        sdk.remove();
      }
      document
        .querySelectorAll(".onetrust-pc-dark-filter")
        .forEach((el) => el.remove());
    });
  }

  async clickStudentButton(): Promise<void> {
    await this.acceptCookiesIfPresent();
    await this.page
      .locator("els-page-loader .c-els-page-loader, .c-els-page-loader")
      .first()
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => undefined);
    await this.elements.studentButton().click({ force: true });
    await this.page.waitForURL(/\/cs\/store\?role=student/);
  }

  /** @param courseId - Valid Evolve course ID */
  async redeemCourseId(courseId: string): Promise<void> {
    const isRedeemInputVisible = await this.elements
      .redeemCourseIdInput()
      .isVisible()
      .catch(() => false);

    if (!isRedeemInputVisible) {
      const hasRedeemEntryPoint = await this.elements
        .redeemAccessLink()
        .isVisible()
        .catch(() => false);

      if (hasRedeemEntryPoint) {
        await this.elements.redeemAccessLink().click();
      } else {
        // Fallback: open My Evolve where redeem dialog entry point is consistently available.
        await this.page.goto(`${Env.EVOLVE_WEB_URL}/cs/myEvolve`);
        await this.elements.redeemAccessLink().click();
      }
    }

    await this.elements.redeemCourseIdInput().waitFor({
      state: "visible",
      timeout: 10000,
    });
    await this.elements.redeemCourseIdInput().fill(courseId);
    await this.elements.redeemButton().click();
  }

  async clickLoginWithPasswordFromGate(): Promise<void> {
    const hasDirectGateAction = await this.elements
      .loginWithPasswordFromGateButton()
      .isVisible()
      .catch(() => false);

    if (hasDirectGateAction) {
      await this.elements.loginWithPasswordFromGateButton().click({ force: true });
    } else {
      const hasSignInEntryPoint = await this.elements
        .signInGateEntryPoint()
        .isVisible()
        .catch(() => false);

      if (hasSignInEntryPoint) {
        await this.elements.signInGateEntryPoint().click({ force: true });
      }
    }
  }

  async clickCreateAccountFromGate(): Promise<void> {
    await this.dismissPendoGuideIfPresent();

    const hasCreateAccountAction = await this.elements
      .createAccountFromGateButton()
      .isVisible()
      .catch(() => false);

    if (hasCreateAccountAction) {
      await this.elements.createAccountFromGateButton().click({ force: true });
      return;
    }

    await this.clickCreateAccount();
  }

  // ── Compound methods ────────────────────────────────────────────────────────

  /**
   * Completes the password-based login flow end-to-end.
   * @param email - Email address or username
   * @param password - Account password
   */
  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.clickLoginWithPassword();
    await this.fillPassword(password);
    await this.clickSignIn();
  }
}
