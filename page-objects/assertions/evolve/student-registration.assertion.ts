import { expect } from "@playwright/test";

import { type AccountSettingsPage } from "page-objects/pages/evolve/account-settings.page";
import { type CatalogPage } from "page-objects/pages/evolve/catalog.page";
import { type CreateStudentTestData } from "utils/helpers/create-student-testdata";

export class StudentRegistrationAssertion {
  private static readonly normalizedLocationValues: Record<string, string> = {
    us: "united states",
    "united states": "united states",
    tn: "tennessee",
    tennessee: "tennessee",
  };

  private readonly catalogPage: CatalogPage;
  private readonly accountSettingsPage: AccountSettingsPage;

  constructor(pages: {
    CatalogPage: CatalogPage;
    AccountSettingsPage: AccountSettingsPage;
  }) {
    this.catalogPage = pages.CatalogPage;
    this.accountSettingsPage = pages.AccountSettingsPage;
  }

  async verifyStudentCatalogUrl(): Promise<void> {
    await expect.poll(() => this.catalogPage.currentUrl()).toContain(
      "/cs/store?role=student",
    );
  }

  async verifyStudentRoleLinks(): Promise<void> {
    await expect(
      this.catalogPage.elements.registerForResultsAndRemediationLink(),
    ).toBeVisible();
    await expect(this.catalogPage.elements.hesiTranscriptsLink()).toBeVisible();
    await expect(
      this.catalogPage.elements.registerForDistanceTestingLink(),
    ).toBeVisible();
  }

  async verifyStudentSearchResultUrl(keyword: string): Promise<void> {
    await expect.poll(() => this.catalogPage.currentUrl()).toContain(
      `/cs/search?query=${keyword}&role=student`,
    );
  }

  async verifyStudentProductDetailsUrl(): Promise<void> {
    await expect.poll(() => this.catalogPage.currentUrl()).toMatch(
      /\/cs\/product\/[^?]+\?role=student$/,
    );
  }

  async verifyStudentAccountSettings(
    student: CreateStudentTestData,
  ): Promise<void> {
    // await expect.poll(() => this.accountSettingsPage.currentUrl()).toContain(
    //   "/cs/account",
    // );
    await expect(this.accountSettingsPage.elements.firstNameInput()).toBeVisible();
    await expect
      .poll(() => this.accountSettingsPage.getFirstName())
      .toBe(student.firstName);
    await expect
      .poll(() => this.accountSettingsPage.getLastName())
      .toBe(student.lastName);
    await expect
      .poll(() => this.accountSettingsPage.getEmailAddress())
      .toBe(student.email);
    await expect
      .poll(() => this.normalizeLocationValue(this.accountSettingsPage.getInstitutionCountry()))
      .toBe(this.normalizeLocationValue(student.institutionCountry));
    await expect
      .poll(() => this.normalizeLocationValue(this.accountSettingsPage.getInstitutionState()))
      .toBe(this.normalizeLocationValue(student.institutionState));
    await expect
      .poll(() => this.accountSettingsPage.getInstitutionName())
      .toBe(student.institutionName);
    await expect
      .poll(() => this.accountSettingsPage.getProgramType())
      .toBe(student.programType);
    await expect
      .poll(() => this.accountSettingsPage.getGraduationYear())
      .toBe(student.graduationYear);
    await expect
      .poll(async () =>
        this.normalizePhoneValue(await this.accountSettingsPage.getShippingPhone()),
      )
      .toBe(this.normalizePhoneValue(student.phone));
  }

  async verifyStudentIdentityAccountSettings(
    student: CreateStudentTestData,
    options: { expectPhone?: boolean } = {},
  ): Promise<void> {
    const { expectPhone = true } = options;

    await expect(this.accountSettingsPage.elements.firstNameInput()).toBeVisible();
    await expect
      .poll(() => this.accountSettingsPage.getFirstName())
      .toBe(student.firstName);
    await expect
      .poll(() => this.accountSettingsPage.getLastName())
      .toBe(student.lastName);
    await expect
      .poll(() => this.accountSettingsPage.getEmailAddress())
      .toBe(student.email);

    if (!expectPhone) {
      return;
    }

    await expect
      .poll(async () =>
        this.normalizePhoneValue(await this.accountSettingsPage.getShippingPhone()),
      )
      .toBe(this.normalizePhoneValue(student.phone));
  }

  private normalizeLocationValue(value: string | Promise<string>): Promise<string> | string {
    if (value instanceof Promise) {
      return value.then((resolvedValue) => this.normalizeLocationValue(resolvedValue));
    }

    const normalizedValue = value.trim().toLowerCase();
    return StudentRegistrationAssertion.normalizedLocationValues[normalizedValue] ?? normalizedValue;
  }

  private normalizePhoneValue(value: string): string {
    return value.replace(/\D/g, "").slice(-10);
  }
}