import { type FrameLocator, type Page } from "@playwright/test";

import { type CreateStudentTestData } from "utils/helpers/create-student-testdata";

export class CreateAccountPage {
  private readonly captchaFrame: FrameLocator;

  constructor(protected page: Page) {
    this.captchaFrame = this.page.frameLocator(
      'iframe[src*="recaptcha/api2/anchor"]',
    );
  }

  elements = {
    studentRoleRadio: () => this.page.getByRole("radio", { name: "Student" }),
    studentRoleLabel: () => this.page.locator('label[for="student"]'),
    firstNameInput: () => this.page.getByRole("textbox", { name: "First name" }),
    lastNameInput: () => this.page.getByRole("textbox", { name: "Last name" }),
    emailAddressInput: () => this.page.locator("#emailAddress"),
    confirmEmailAddressInput: () => this.page.locator("#confirmEmail"),
    phoneInput: () => this.page.locator("#phone"),
    passwordInput: () => this.page.locator("#passwordField"),
    confirmPasswordInput: () => this.page.locator("#confirm-Password"),
    institutionCountryDropdown: () => this.page.locator("#institutionCountry"),
    institutionStateDropdown: () => this.page.locator("#institutionState"),
    institutionNameInput: () => this.page.locator("#institutionName"),
    programTypeDropdown: () => this.page.locator("#institutionProgramType"),
    graduationYearDropdown: () =>
      this.page.locator("#institutionGraduationYear"),
    captchaCheckbox: () =>
      this.captchaFrame.getByRole("checkbox", { name: "I'm not a robot" }),
    registrationForm: () => this.page.locator("#registrationForm"),
    submitButton: () => this.page.getByRole("button", { name: "Submit" }),
    signedUpDialog: () => this.page.getByRole("dialog"),
    validationErrorAlert: () => this.page.getByRole("alert"),
    errorSummaryText: () => this.page.getByText(/\d+ error should be corrected\./i),
    continueButton: () => this.page.getByRole("button", { name: /Continue/i }),
  };

  async selectStudentRole(): Promise<void> {
    const hasEmailField = await this.elements
      .emailAddressInput()
      .isVisible()
      .catch(() => false);

    if (hasEmailField) {
      return;
    }

    const hasStudentRoleRadio = await this.elements
      .studentRoleRadio()
      .isVisible()
      .catch(() => false);

    if (hasStudentRoleRadio) {
      await this.elements.studentRoleRadio().check({ force: true });
    } else {
      await this.elements.studentRoleLabel().click({ force: true });
    }

    await this.elements.emailAddressInput().waitFor({ state: "visible" });
  }

  async fillRequiredStudentFields(
    student: CreateStudentTestData,
  ): Promise<void> {
    await this.elements.firstNameInput().fill(student.firstName);
    await this.elements.lastNameInput().fill(student.lastName);
    await this.elements.emailAddressInput().fill(student.email);
    await this.elements.confirmEmailAddressInput().fill(student.email);

    const hasPhoneField = await this.elements
      .phoneInput()
      .isVisible()
      .catch(() => false);

    if (hasPhoneField) {
      await this.elements.phoneInput().fill(this.getPhoneDigits(student.phone));
    }

    await this.elements.passwordInput().fill(student.password);
    await this.elements.confirmPasswordInput().fill(
      student.confirmationPassword,
    );
    await this.elements
      .institutionCountryDropdown()
      .selectOption({ label: student.institutionCountry });
    await this.elements
      .institutionStateDropdown()
      .selectOption({ label: student.institutionState });
    await this.selectInstitutionName(student.institutionName);
    await this.elements
      .programTypeDropdown()
      .selectOption({ label: student.programType });
    await this.elements
      .graduationYearDropdown()
      .selectOption(student.graduationYear);
  }

  async clickCaptchaCheckbox(): Promise<void> {
    await this.elements.captchaCheckbox().click();
    await this.waitForRecaptchaValidation();
  }

  async clickSubmit(): Promise<void> {
    await this.assertNoVisibleValidationErrors();
    await this.elements.submitButton().click();
  }

  async clickContinueInSignedUpDialog(): Promise<void> {
    await this.elements.continueButton().waitFor({ state: "visible" });
    await this.elements.continueButton().click();
  }

  private async selectInstitutionName(institutionName: string): Promise<void> {
    await this.elements
      .institutionNameInput()
      .fill(this.getInstitutionSearchPrefix(institutionName));

    const institutionInput = this.elements.institutionNameInput();
    // This Angular typeahead only commits a valid institution after an option is selected.
    const activeOptionId = await this.waitForInstitutionSuggestion();
    await this.page.locator(`#${activeOptionId}`).click();
    await institutionInput.evaluate((input) => input.blur());
  }

  private getInstitutionSearchPrefix(institutionName: string): string {
    return institutionName.slice(0, 4);
  }

  private async waitForInstitutionSuggestion(): Promise<string> {
    await this.page
      .waitForFunction(
        () => {
          const input = document.querySelector("#institutionName");

          if (!(input instanceof HTMLInputElement)) {
            return false;
          }

          return Boolean(input.getAttribute("aria-activedescendant"));
        },
        { timeout: 5000 },
      )
      .catch(() => {
        throw new Error("Institution dropdown option did not appear.");
      });

    const activeOptionId = await this.elements
      .institutionNameInput()
      .getAttribute("aria-activedescendant");

    if (!activeOptionId) {
      throw new Error("Institution dropdown option did not appear.");
    }

    return activeOptionId;
  }

  private async assertNoVisibleValidationErrors(): Promise<void> {
    await this.page
      .waitForFunction(
        () => {
          const bodyText = document.body?.innerText ?? "";

          return !/error should be corrected\.|please select a valid institution name/i.test(
            bodyText,
          );
        },
        { timeout: 5000 },
      )
      .catch(() => {
        throw new Error("Create account form still shows validation errors.");
      });
  }

  private async waitForRecaptchaValidation(): Promise<void> {
    // The checkbox can be checked before Angular clears ng-invalid-recaptcha on the form.
    await this.page
      .waitForFunction(
        () => {
          const form = document.querySelector("#registrationForm");

          if (!(form instanceof HTMLFormElement)) {
            return false;
          }

          return !form.className.includes("ng-invalid-recaptcha");
        },
        { timeout: 15000 },
      )
      .catch(() => {
        throw new Error("reCAPTCHA validation did not complete.");
      });
  }

  private getPhoneDigits(phone: string): string {
    return phone.replace(/\D/g, "").slice(-10);
  }
}