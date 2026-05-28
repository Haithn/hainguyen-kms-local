import fs from "fs";
import path from "path";

import { randomNumeric } from "utils/helpers/string";

export interface CreateStudentTestData {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmationPassword: string;
  institutionCountry: string;
  institutionState: string;
  institutionName: string;
  programType: string;
  graduationYear: string;
}

interface CreateStudentTemplate {
  emailTemplate: string;
  phoneTemplate: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmationPassword: string;
  institutionCountry: string;
  institutionState: string;
  institutionName: string;
  programType: string;
  graduationYear: string;
}

interface CreateStudentTestDataOptions {
  preserveEmailDomain?: boolean;
}

const TESTDATA_PATH = path.resolve(process.cwd(), "env/testdata.test6.txt");

function readTemplate(): CreateStudentTemplate {
  const content = fs.readFileSync(TESTDATA_PATH, "utf8");

  const getLineValue = (key: string): string => {
    const pattern = new RegExp(`"${key}"\\s*:\\s*([^\r\n]+)`, "i");
    const match = content.match(pattern);

    if (!match) {
      throw new Error(`Missing value for '${key}' in ${TESTDATA_PATH}`);
    }

    return match[1].replace(/\/\/.*$/, "").replace(/,$/, "").trim();
  };

  const getQuotedValue = (key: string): string => {
    const rawValue = getLineValue(key);
    const match = rawValue.match(/^"([^"]+)"$/);

    if (!match) {
      throw new Error(`Missing string value for '${key}' in ${TESTDATA_PATH}`);
    }

    return match[1].trim();
  };

  const getFlexibleStringValue = (key: string): string => {
    const rawValue = getLineValue(key);
    const quotedMatch = rawValue.match(/^"([^"]+)"$/);

    if (quotedMatch) {
      return quotedMatch[1].trim();
    }

    return rawValue.trim();
  };

  const getNumericValue = (key: string): string => {
    const pattern = new RegExp(`"${key}"\\s*:\\s*(\\d+)`, "i");
    const match = content.match(pattern);

    if (!match) {
      throw new Error(`Missing numeric value for '${key}' in ${TESTDATA_PATH}`);
    }

    return match[1].trim();
  };

  return {
    emailTemplate: getQuotedValue("email"),
    phoneTemplate: getFlexibleStringValue("phone"),
    firstName: getQuotedValue("firstName"),
    lastName: getQuotedValue("lastName"),
    password: getQuotedValue("password"),
    confirmationPassword: getQuotedValue("confirmation password"),
    institutionCountry: getQuotedValue("institution Country"),
    institutionState: getQuotedValue("institution State"),
    institutionName: getQuotedValue("institution name"),
    programType: getQuotedValue("programType"),
    graduationYear: getNumericValue("graduationYear"),
  };
}

function formatDateToken(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${month}${day}${year}`;
}

function buildEmail(
  emailTemplate: string,
  options: CreateStudentTestDataOptions,
): string {
  const formattedEmail = emailTemplate
    .replace("[date]", formatDateToken())
    .replace("[xxx]", randomNumeric(3));

  if (options.preserveEmailDomain) {
    return formattedEmail;
  }

  return formattedEmail.replace(/@sharklasers\.com$/i, "@spam4.me");
}

function buildPhone(phoneTemplate: string): string {
  const first = randomNumeric(3);
  const second = randomNumeric(4);

  return phoneTemplate.replace("xxx-xxxx", `${first}-${second}`);
}

export function getCreateStudentTestData(
  options: CreateStudentTestDataOptions = {},
): CreateStudentTestData {
  const template = readTemplate();

  return {
    email: buildEmail(template.emailTemplate, options),
    phone: buildPhone(template.phoneTemplate),
    firstName: template.firstName,
    lastName: template.lastName,
    password: template.password,
    confirmationPassword: template.confirmationPassword,
    institutionCountry: template.institutionCountry,
    institutionState: template.institutionState,
    institutionName: template.institutionName,
    programType: template.programType,
    graduationYear: template.graduationYear,
  };
}