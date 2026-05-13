# pw-training-course — Test Automation Setup Guide

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [Git](https://git-scm.com/)
- [VS Code](https://code.visualstudio.com/) (recommended)

---

## Step 1 — Get the Code

```bash
git clone [repo-link]
cd pw-training-course
```

---

## Step 2 — Install Dependencies

Run the setup script. This initialises Playwright, installs all npm packages, the Playwright CLI globally, and downloads browser binaries (Chromium, Firefox, WebKit):

```bash
npm install
```

## Step 3 — Configure Environment Variables

Copy the example env file and fill in your credentials:

```bash
cp env/.env.test6.example env/.env.test6
```

Then open `env/.env.test6` and fill in the required values:

```env
# Required
EXISTING_STUDENT_EMAIL=your-student@example.com
EXISTING_FACULTY_EMAIL=your-faculty@example.com
COMMON_PASSWORD=your-password

# DB credentials (ask your team lead)
EVL_DB_AUTOMATION_USERNAME=
EVL_DB_AUTOMATION_PASSWORD=
EVL_ORACLE_AUTOMATION_FORWARD_HOST=

# Back Office credentials (ask your team lead)
BO_USERNAME=
BO_PASSWORD=
```

> The `API_URL`, `WEB_URL`, `BO_URL`, and `EVOLVE_WEB_URL` are already set in the example file for the `test6` environment.

---

## Step 4 — Install VS Code Extensions (Recommended)

| Extension                   | ID                         | Purpose                          |
| --------------------------- | -------------------------- | -------------------------------- |
| Playwright Test for VS Code | `ms-playwright.playwright` | Run/debug tests from the sidebar |
| ESLint                      | `dbaeumer.vscode-eslint`   | Linting                          |
| Prettier                    | `esbenp.prettier-vscode`   | Code formatting                  |

Install via VS Code Extensions panel or run:

```bash
code --install-extension ms-playwright.playwright
code --install-extension esbenp.prettier-vscode
```

---

## Step 4a — Using the Playwright VS Code Extension

The **Playwright Test for VS Code** extension lets you run, debug, and inspect tests without the terminal.

### Enable the Extension

1. Open VS Code
2. Go to **Extensions** (`Cmd+Shift+X` on Mac / `Ctrl+Shift+X` on Windows)
3. Search for `Playwright Test for VS Code` by Microsoft and click **Install**

### Open the Testing Panel

- Click the **Testing** icon in the Activity Bar (beaker icon on the left sidebar), or
- Press `Cmd+Shift+P` → type `Testing: Focus on Test Explorer View`

### Select Browsers to Run

1. In the Testing panel, click the **gear icon** (Configure Playwright)
2. Select which browsers to run tests on: `chromium`, `firefox`, `webkit`

### Run Tests from the Sidebar

- **Run all tests** — click the play button at the top of the Test Explorer
- **Run a single test** — hover over a test name → click the play button next to it
- **Run a test file** — hover over the file → click the play button

### Debug a Test

1. Set a breakpoint by clicking the gutter (left of line numbers) in the test file
2. Right-click the test in the Test Explorer → **Debug Test**
3. The browser opens and pauses at your breakpoint

### Show Browser During Test Run

1. In the Testing panel, click the **gear icon**
2. Enable **Show browser** — the browser window opens visibly while tests run

### Pick Locators Interactively (Playwright Inspector)

1. In the Testing panel, click **Pick locator** (target icon)
2. A browser window opens — hover over any element
3. The extension suggests the best locator to use in your test

---

## Step 5 — Run Your First Test

Run the login smoke test against the `test6` environment:

```bash
npm test
```

To run in headed mode (watch the browser):

```bash
npm run test:headed
```

To run a specific test file:

```bash
npx playwright test tests/specs/evolve/ui/login/evolve-login.spec.ts
```

---

## Available Scripts

| Command               | Description                                   |
| --------------------- | --------------------------------------------- |
| `npm test`            | Run all tests on `test6` environment          |
| `npm run test:test6`  | Same as `npm test`                            |
| `npm run test:headed` | Run tests with browser visible                |
| `npm run locator`     | Launch Playwright codegen for locator capture |
| `npm run typecheck`   | TypeScript type checking                      |
| `npm run format`      | Format code with Prettier                     |

---

## Project Structure

```
pw-training-course/
├── env/                    # Environment variable files (.env.*)
├── page-objects/           # Page Object Model classes
├── tests/
│   ├── fixtures/           # Custom Playwright fixtures
│   └── specs/              # Test specs
│       ├── evolve/ui/      # Evolve UI tests
│       ├── evolve/api/     # Evolve API tests
│       ├── admin/          # Admin tests
│       └── ps/             # PS tests
├── utils/                  # Helpers (timeouts, tags, string utils)
├── playwright.config.ts    # Playwright configuration
└── package.json
```

---

## Test Reports

After a test run, open the HTML report:

```bash
npx playwright show-report reports/html
```
