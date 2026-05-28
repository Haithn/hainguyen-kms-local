# EDQAENG-28896 - Verify Administration Portal Link In Account Menu

## Summary
Verify that an authenticated user with LMS role `System Administrator` sees `Administration Portal` in the Evolve account menu and can navigate to CampusPack Administration Portal.

## Source Reference
- Legacy Selenium test: `MVPEvlCoreUserProfileTests.verifyAdministrationPortalLinkIsAddedToTheEvolveAccountMenu`
- Jira: `EDQAENG-28896`

## Scope
- UI validation in Evolve header account menu.
- Navigation validation to CampusPack Administration Portal.

## Preconditions
1. Existing faculty username has LMS role `System Administrator` enabled.
2. Example account from requirement: `fmanualh460`.
3. Test environment has access to CampusPack admin portal.

## Test Data
- User type: Faculty.
- Required attribute: LMS role = `System Administrator`.
- Login target: `https://evolvetest.elsevier.com/cs/`.
- Expected destination: `https://evolvetestlms.elsevier.com/Administration`.
- Confirmed username for automation: `fmanualh460`.
- Password source for automation: `Env.COMMON_PASSWORD`.

## Test Steps And Expected Results
1. Login to `https://evolvetest.elsevier.com/cs/` as faculty user in precondition.
- Expected: Login is successful and user lands on authenticated area.

2. Click `Account` button in header.
- Expected: `Administration Portal` link is visible in account menu.

3. Click `Administration Portal`.
- Expected: Navigation opens CampusPack Administration Portal in a new tab.

4. Verify destination URL.
- Expected: User is directed to the correct URL `https://evolvetestlms.elsevier.com/Administration`.

## Assertion Checklist
- Account menu can be opened after login.
- `Administration Portal` is visible only for eligible role.
- Click action triggers navigation to CampusPack admin portal.
- Destination URL is correct.

## Suggested Playwright Automation Notes
- Keep account-menu locator in POM (`MyEvolvePage` or header page object if shared).
- If click opens a new tab, use `context.waitForEvent("page")` and assert on the new page.
- Primary assertion should verify user is directed to the expected URL.
- If environment adds query params or trailing slash, use `toContain("https://evolvetestlms.elsevier.com/Administration")`.
- Avoid hardcoded credentials and URLs.

## Open Questions
None. Confirmed decisions:
1. Use hardcoded username `fmanualh460`.
2. Verify `Administration Portal` opens in a new tab.
3. Negative case is out of scope for this ticket.
