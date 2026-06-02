/**
 * Evolve localStorage key constants
 * 
 * These keys are used to verify proper session cleanup after logout.
 */

export const USER_STORAGE_KEYS = {
  OTP: "elsevier.isOTP",
  USER_ID: "elsevier.userId",
  EUID: "elsevier._euid",
  USERNAME: "elsevier.username",
  ACCESS_END_DATES: "elsevier.accessEndDates",
  ACCESS_END_DATES_LAST_CALL: "elsevier.accessEndDatesTimeStampForLastCall",
  EVENT_COLLECTOR: "elsevier.eventCollectorEnabled",
  ROLE: "security.elsevier.role",
  CERT: "elsevier.EVAE2_CERTF",
  IDLE_EXPIRY: "ngIdle.expiry",
  LOGGED_IN: "elsevier.loggedIn",
  PENDO_ACCOUNT: "_pendo_accountId.2bc78aa9-3590-4c79-633f-3d16119bd78d",
  PENDO_VISITOR: "pendo_visitorId.2bc78aa9-3590-4c79-633f-3d16119bd78d",
  PENDO_OLD_VISITOR: "_pendo_oldVisitorId.2bc78aa9-3590-4c79-633f-3d16119bd78d",
  PENDO_GUIDE: "_pendo_guides_blocked.2bc78aa9-3590-4c79-633f-3d16119bd78d",
} as const;

export const DYNAMIC_USER_KEY_PREFIXES = {
  USER_ALERT: "elsevier.userAlerts_",
  USER_ALERT_EXPIRY: "elsevier.userAlertsExpiry_",
} as const;

export const SYSTEM_STORAGE_KEYS = {
  SURVIVE_LTI: "elsevier.survive.notShowLtiIntegrationHelperPanel",
  SURVIVE_WARNING: "elsevier.survive.aadam27-hideWarningProductDirectlyPopup",
  USER: "elsevier.user",
  EVOLVE_USER: "elsevier.evolveUser",
  FIP: "elsevier.fip",
  EUC: "elsevier.euc",
  JWT: "security.elsevier.jwt",
  PENDO_META: "_pendo_meta.2bc78aa9-3590-4c79-633f-3d16119bd78d",
  PENDO_FEEDBACK: "_pendo_feedback_ping_sent.2bc78aa9-3590-4c79-633f-3d16119bd78d",
  PENDO_FEEDBACK_COUNT:
    "_pendo_feedback_notification_count.2bc78aa9-3590-4c79-633f-3d16119bd78d",
} as const;

export const REMOVABLE_USER_KEYS = Object.values(USER_STORAGE_KEYS);
export const REMAINING_SYSTEM_KEYS = Object.values(SYSTEM_STORAGE_KEYS);
