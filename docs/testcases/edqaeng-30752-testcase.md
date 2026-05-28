# EDQAENG-30752 - Expired Password Overlay During Course Enrollment

## Status
Ready for automation.

## Summary
Verify that when a student with an expired password attempts to redeem a valid Course ID, the expired-password modal is displayed with highest priority, enrollment overlay does not appear, and user is redirected to home after closing the modal.

## Source Reference
- Jira: EDQAENG-30752

## Scope
- Product area: Evolve student flow (`/cs/`).
- Test type: UI end-to-end validation with enrollment side-effect check.

## Preconditions
1. Existing Evolve student account with expired password.
2. Example account: `smanualh60` with password `Test12345`.
3. Valid Course ID for an active course.
4. Example Course ID: `189890_jfacultymanual_hsm0001`.

## Test Data
- Student username: `smanualh60`
- Student password: `Test12345` (expired)
- Course ID: `189890_jfacultymanual_hsm0001`
- Entry URL: `https://evolvetest.elsevier.com/cs/`
- Expected redirect after close: `/cs/store`

## Test Steps
1. Navigate to Evolve portal and click `I'm a Student`.
2. Enter valid Course ID in `Redeem an Access Code or Enter an Evolve Course ID` and click `Redeem`.
3. On `You must log in to view this content`, click `Login with password`.
4. Enter expired student credentials and click `Sign In`.
5. Click `Close` or `X` on expired-password popup.

## Expected Results
1. `Your Password has Expired` popup is displayed immediately as overlay on My Evolve page and blocks actions outside popup.
2. `You're Enrolled!` overlay does not appear and does not cover the expired-password popup.
3. No new course entitlement is granted until password is changed.
4. After closing expired-password popup, user is navigated to Home page `/cs/store`.

## Assertion Checklist
- `Your Password has Expired` modal is visible after sign-in attempt.
- Outside area is non-interactive while modal is open.
- `You're Enrolled!` overlay is absent.
- URL after close contains `/cs/store`.
- Enrollment side-effect is not applied before password reset.

## Suggested Playwright Automation Notes
- Keep locators in POM for:
	- Student entry button
	- Redeem field/button
	- Login with password button
	- Expired password modal and close controls
	- `You're Enrolled!` overlay
- Use `expect(...).toBeVisible()` for expired-password modal and `toBeHidden()` or `not.toBeVisible()` for enrolled overlay.
- Verify modal blocking behavior by attempting click on a background element and asserting no navigation/action.
- Validate redirect by asserting URL contains `/cs/store` after closing popup.
- For entitlement validation, prefer API/DB verification if available; UI-only fallback should verify course is not visible in enrolled content list.

## Open Questions
1. Entitlement check source of truth: API, DB, or UI list verification?
2. Exact locator/text variant for close control: `Close` button, `X` icon, or both across environments?
3. Should automation use hardcoded credentials/Course ID above or map to env variables?
