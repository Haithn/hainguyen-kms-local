import { type Locator, type Page } from "@playwright/test";
import Env from "env/env.global";

export class MyEvolvePage {
  constructor(protected page: Page) {}

  elements = {
    protectedContent: () => this.page.getByRole("main").first(),
    myEvolveHeading: () =>
      this.page.getByRole("link", { name: "My Evolve" }).first(),
    signInEntryPoint: () =>
      this.page.locator('#loginNav, a:has-text("Sign in")').first(),
    accountMenuTrigger: () => this.page.locator("#accountNav"),
    accountSettingsOption: () => this.page.locator("#accountSettingsLink"),
    orderHistoryOption: () => this.page.locator("#orderHistoryLink"),
    administrationPortalOption: () =>
      this.page
        .locator('#adminPortalLink, a:has-text("Administration Portal")')
        .first(),
    enrolledSuccessDialog: () =>
      this.page.getByText(/You're Enrolled!/i).first(),
    enrolledContinueButton: () =>
      this.page.getByRole("button", { name: /^Continue$/i }).first(),
    instructorLedCoursesTab: () =>
      this.page
        .locator(
          "[role='tab']:has-text('Instructor-Led Courses'), button:has-text('Instructor-Led Courses'), a:has-text('Instructor-Led Courses')",
        )
        .first(),
    instructorLedCoursesTabSelected: () =>
      this.page
        .locator(
          "[role='tab'][aria-selected='true']:has-text('Instructor-Led Courses'), .active:has-text('Instructor-Led Courses'), .is-active:has-text('Instructor-Led Courses'), .selected:has-text('Instructor-Led Courses')",
        )
        .first(),
    termsAndConditionsAgreeButton: () =>
      this.page
        .locator(
          "button:has-text('I agree'), button:has-text('I Agree'), input[value='I agree'], input[value='I Agree']",
        )
        .first(),
    redeemPurchaseCollectionItem: () =>
      this.page
        .locator(
          "li[ng-repeat='collection in collectionList track by collection'], li[data-ng-repeat='collection in collectionList track by collection']",
        )
        .first(),
    logoutOption: () => this.page.locator("#logoutLink"),
  };

  async goToMyEvolvePage(baseURL = Env.EVOLVE_WEB_URL): Promise<void> {
    await this.page.goto(`${baseURL}/cs/myEvolve`);
  }

  async currentUrl(): Promise<string> {
    return this.page.url();
  }

  async openAccountMenu(): Promise<void> {
    if (await this.elements.accountSettingsOption().isVisible().catch(() => false)) {
      return;
    }

    await this.elements.accountMenuTrigger().click();
  }

  async logout(): Promise<void> {
    await this.openAccountMenu();
    await this.elements.logoutOption().click();
  }

  async clickAdministrationPortal(): Promise<void> {
    await this.openAccountMenu();
    await this.elements.administrationPortalOption().click();
  }

  courseIdInMyEvolve(courseId: string): Locator {
    return this.page.getByText(courseId, { exact: false }).first();
  }

  courseIdLabelInMyEvolve(courseId: string): Locator {
    return this.page
      .getByText(new RegExp(`Course ID:\\s*${MyEvolvePage.escapeRegExp(courseId)}`, "i"))
      .first();
  }

  courseCardByCourseId(courseId: string): Locator {
    return this.courseIdLabelInMyEvolve(courseId)
      .locator("xpath=ancestor::*[self::article or self::li or self::section or self::div][1]")
      .first();
  }

  courseCardThumbnail(courseId: string): Locator {
    return this.courseIdLabelInMyEvolve(courseId).locator("xpath=preceding::img[1]").first();
  }

  courseCardProductType(courseId: string, productType: string): Locator {
    const productTypePattern = productType.trim()
      ? new RegExp(productType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      : /Instructor-Led Course/i;

    return this.courseIdLabelInMyEvolve(courseId)
      .locator("xpath=preceding::*[contains(normalize-space(),'Instructor-Led Course')][1]")
      .or(this.courseCardByCourseId(courseId).getByText(productTypePattern).first())
      .first();
  }

  courseCardTitleLink(courseId: string): Locator {
    return this.courseIdLabelInMyEvolve(courseId)
      .locator("xpath=preceding::a[1]")
      .first();
  }

  courseCardAuthor(courseId: string): Locator {
    return this.courseIdLabelInMyEvolve(courseId)
      .locator("xpath=preceding::*[contains(normalize-space(),'By ')][1]")
      .or(this.courseCardByCourseId(courseId).getByText(/Author\s*:|^By\s+/i).first())
      .first();
  }

  courseCardIsbn(courseId: string): Locator {
    return this.courseIdLabelInMyEvolve(courseId)
      .locator("xpath=preceding::*[contains(normalize-space(),'ISBN:')][1]")
      .or(this.courseCardByCourseId(courseId).getByText(/ISBN\s*:/i).first())
      .first();
  }

  courseCardId(courseId: string): Locator {
    return this.courseIdLabelInMyEvolve(courseId);
  }

  courseCardInstructor(courseId: string): Locator {
    return this.courseIdLabelInMyEvolve(courseId)
      .locator("xpath=following::*[contains(normalize-space(),'Instructor:')][1]")
      .or(this.courseCardByCourseId(courseId).getByText(/Instructor\s*:/i).first())
      .first();
  }

  courseCardAccessEndDate(courseId: string): Locator {
    return this.courseCardByCourseId(courseId).getByText(/Access\s*(end\s*date|ends?)/i);
  }

  async clickContinueOnEnrolledDialog(): Promise<void> {
    await this.elements.enrolledContinueButton().click();
  }

  async openInstructorLedCoursesTab(): Promise<void> {
    const isSelected = await this.isInstructorLedCoursesTabSelected();
    if (isSelected) {
      return;
    }

    await this.elements.instructorLedCoursesTab().click();
  }

  async isInstructorLedCoursesTabSelected(): Promise<boolean> {
    return this.elements
      .instructorLedCoursesTabSelected()
      .isVisible()
      .catch(() => false);
  }

  async clickCourseTitleInMyEvolve(courseId: string): Promise<void> {
    await this.courseCardTitleLink(courseId).click();
  }

  async agreeTermsAndConditionsIfPresent(): Promise<void> {
    const isTermsPage = /\/cs\/termsAndConditions/i.test(await this.currentUrl());

    if (!isTermsPage) {
      return;
    }

    await this.elements.termsAndConditionsAgreeButton().click();
  }

  async getRedeemPurchaseCollectionText(): Promise<string> {
    return this.elements.redeemPurchaseCollectionItem().innerText();
  }

  async getRedeemPurchaseCollectionIsbnDigits(): Promise<string> {
    const collectionText = await this.getRedeemPurchaseCollectionText();
    return collectionText.replace(/\D/g, "");
  }

  private static escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}