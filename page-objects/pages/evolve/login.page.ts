import { type Page } from "@playwright/test";
import Env from "env/env.global";
import { waitForAngularLoad } from "utils/helpers/wait-for-angular";

export class LoginPage {
  elements = {
    // Inputs
    emailInput: () =>
      this.page.getByRole("textbox", { name: "Email address or username" }),
    otpInput: () =>
      this.page.getByRole("textbox", { name: "Enter one-time code" }),
    passwordInput: () => this.page.getByRole("textbox", { name: "Password" }),

    // Buttons
    headerSignInButton: () => this.page.locator("#loginNav"),
    signInButton: () => this.page.locator("#loginButton"),
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

    // Links
    createAccountLink: () =>
      this.page.getByRole("link", { name: "Create an account" }),

    // Static text
    newToEvolveText: () => this.page.getByText(/^New to Evolve\?$/),
    otpSentMessage: () =>
      this.page.getByText("We sent a 6-digit code to your email address."),
    didntReceiveIt: () => this.page.getByText("Didn't receive an email?"),
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

  async clickLoginWithPassword(): Promise<void> {
    await this.elements.signInWithPasswordButton().click();
  }

  /** @param password - Account password */
  async fillPassword(password: string): Promise<void> {
    await this.elements.passwordInput().fill(password);
  }

  async clickSignIn(): Promise<void> {
    await this.elements.signInButton().click();
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
