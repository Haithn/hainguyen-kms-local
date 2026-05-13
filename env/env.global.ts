import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({
  path: process.env.ENV ? `env/.env.${process.env.ENV}` : "env/.env.test6",
});

export default class Env {
  static getEnvVar(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (!value && defaultValue === undefined) {
      throw new Error(`Environment variable not found: ${key}`);
    }
    return value || defaultValue!;
  }

  static get LOG_LEVEL(): string {
    return this.getEnvVar("LOG_LEVEL", "info");
  }

  static get EXISTING_STUDENT_EMAIL(): string {
    return this.getEnvVar("EXISTING_STUDENT_EMAIL");
  }

  static get EXISTING_FACULTY_EMAIL(): string {
    return this.getEnvVar("EXISTING_FACULTY_EMAIL");
  }

  static get COMMON_PASSWORD(): string {
    return this.getEnvVar("COMMON_PASSWORD");
  }

  static get API_URL(): string {
    return this.getEnvVar("API_URL");
  }

  static get WEB_URL(): string {
    return this.getEnvVar("WEB_URL");
  }

  static get EVL_DB_AUTOMATION_USERNAME(): string {
    return this.getEnvVar("EVL_DB_AUTOMATION_USERNAME");
  }

  static get EVL_DB_AUTOMATION_PASSWORD(): string {
    return this.getEnvVar("EVL_DB_AUTOMATION_PASSWORD");
  }

  static get EVL_ORACLE_AUTOMATION_FORWARD_HOST(): string {
    return this.getEnvVar("EVL_ORACLE_AUTOMATION_FORWARD_HOST");
  }

  static get BO_USERNAME(): string {
    return this.getEnvVar("BO_USERNAME");
  }

  static get BO_PASSWORD(): string {
    return this.getEnvVar("BO_PASSWORD");
  }

  static get BO_URL(): string {
    return this.getEnvVar("BO_URL");
  }

  static get EVOLVE_WEB_URL(): string {
    return this.getEnvVar("EVOLVE_WEB_URL");
  }

  static validateConfig(): void {
    const required = [
      "EXISTING_STUDENT_EMAIL",
      "EXISTING_FACULTY_EMAIL",
      "COMMON_PASSWORD",
      "API_URL",
      "WEB_URL",
      "EVL_DB_AUTOMATION_USERNAME",
      "EVL_DB_AUTOMATION_PASSWORD",
      "EVL_ORACLE_AUTOMATION_FORWARD_HOST",
      "BO_USERNAME",
      "BO_PASSWORD",
      "BO_URL",
      "EVOLVE_WEB_URL",
    ];

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`,
      );
    }
  }
}
