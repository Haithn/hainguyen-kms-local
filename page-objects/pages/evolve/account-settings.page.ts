import { type Page } from "@playwright/test";

export class AccountSettingsPage {
  constructor(protected page: Page) {}

  elements = {
    accountSettingsTitle: () => this.page.locator("#title--account-settings"),
    firstNameInput: () => this.page.locator("#firstName"),
    lastNameInput: () => this.page.locator("#lastName"),
    emailAddressInput: () => this.page.locator("#emailAddress"),
    phoneInput: () => this.page.locator("#phone"),
    shippingPhoneInput: () => this.page.locator("#shipPhone"),
    institutionCountryDropdown: () => this.page.locator("#institutionCountry"),
    institutionStateDropdown: () => this.page.locator("#institutionState"),
    institutionNameInput: () => this.page.locator("#institutionName"),
    programTypeDropdown: () => this.page.locator("#institutionProgramType"),
    graduationYearDropdown: () =>
      this.page.locator("#institutionGraduationYear"),
  };

  async currentUrl(): Promise<string> {
    return this.page.url();
  }

  async getFirstName(): Promise<string> {
    return this.elements.firstNameInput().inputValue();
  }

  async getLastName(): Promise<string> {
    return this.elements.lastNameInput().inputValue();
  }

  async getEmailAddress(): Promise<string> {
    return this.elements.emailAddressInput().inputValue();
  }

  async getShippingPhone(): Promise<string> {
    const hasAccountPhone = await this.elements
      .phoneInput()
      .isVisible()
      .catch(() => false);

    if (hasAccountPhone) {
      const accountPhone = await this.elements.phoneInput().inputValue();

      if (accountPhone.trim()) {
        return accountPhone;
      }
    }

    const hasShippingPhone = await this.elements
      .shippingPhoneInput()
      .isVisible()
      .catch(() => false);

    if (hasShippingPhone) {
      return this.elements.shippingPhoneInput().inputValue();
    }

    return "";
  }

  async getInstitutionCountry(): Promise<string> {
    return this.normalizeSelectValue(
      await this.elements.institutionCountryDropdown().inputValue(),
    );
  }

  async getInstitutionState(): Promise<string> {
    return this.normalizeSelectValue(
      await this.elements.institutionStateDropdown().inputValue(),
    );
  }

  async getInstitutionName(): Promise<string> {
    return this.elements.institutionNameInput().inputValue();
  }

  async getProgramType(): Promise<string> {
    return this.normalizeSelectValue(
      await this.elements.programTypeDropdown().inputValue(),
    );
  }

  async getGraduationYear(): Promise<string> {
    return this.normalizeSelectValue(
      await this.elements.graduationYearDropdown().inputValue(),
    );
  }

  private normalizeSelectValue(value: string): string {
    return value.replace(/^(string|number):/, "");
  }
}