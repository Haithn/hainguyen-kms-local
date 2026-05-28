# EDQAENG-30242 - HESI SAFEMED Self-Enroll For New Student

## Summary
Verify that a new student can self-enroll a HESI SAFEMED course from Catalog by course ID, then see it under Instructor-Led Courses in My Evolve, and launch the course to purchase or redeem.

## Source Reference
- Jira: EDQAENG-30242

## Scope
- Anonymous-to-authenticated self-enroll flow via course ID.
- New student registration from login-required gate.
- My Evolve Instructor-Led Courses card validation.
- Course launch navigation validation.

## Preconditions
1. Valid HESI SafeMed course ID is available.
2. Test environment: https://evolvetest.elsevier.com.
3. Course ID for this test: 175352_cfacultymanual_hsm0001.

## Test Data
- Course ID: 175352_cfacultymanual_hsm0001.
- Role: Student.
- New account data: generated dynamically with `getCreateStudentTestData()`.

## Test Steps And Expected Results
1. Go to https://evolvetest.elsevier.com/cs/ as anonymous user and click "I'm a Student".
- Expected: User lands on student catalog context.

2. Enter course ID and click Submit.
- Expected: Login-required gate is displayed.

3. On login-required gate, click "Create an account".
- Expected: Registration flow opens.

4. Select Student and fill all required fields.
- Expected: Form accepts inputs.

5. Complete captcha and click Submit.
- Expected: "You're Signed Up!" popup is shown.

6. Click Continue on "You're Signed Up!" popup.
- Expected: Enrollment completion continues.

7. Click Continue on "You're Enrolled!" popup.
- Expected: User is navigated to My Evolve with Instructor-Led Courses tab selected.

8. Verify enrolled course card under Instructor-Led Courses.
- Expected: Card shows thumbnail, product type "HESI SafeMed : Instructor-Led Course", clickable title link, no access end date, author, ISBN, course ID, instructor name.

9. Click course title link.
- Expected: If Terms and Conditions page is displayed, click "I agree" and continue.

10. Continue after accepting Terms and Conditions (if displayed).
- Expected: User is redirected to redeem or purchase content page in a new tab; course name and course ISBN match the values shown in Step 8.

## Assertion Checklist
- Login-required gate appears after redeem submit.
- New account can be created from gate.
- Enrollment success popup appears and can continue.
- Instructor-Led Courses tab is selected in My Evolve.
- Course card fields are displayed per requirement.
- Access end date is not shown on the card.
- If Terms and Conditions appears, user can proceed by clicking "I agree".
- After clicking "I agree", redeem/purchase content opens in a new tab.
- Course name and ISBN on redeem/purchase page match the enrolled course card data from Step 8.
