import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:4173";
const runAgainstDeployment = Boolean(process.env.E2E_BASE_URL);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // Specs sharing one booted backend and its database race each other in parallel, and
  // a sandbox has 2 CPUs while Playwright counts the host's cores.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  // One retry by default so a single flaky frame does not fail the whole suite; a genuine
  // failure still fails on the retry. The trace and screenshot below are kept for every
  // failure, so a failed spec always has evidence, retried or not.
  retries: process.env.CI ? 2 : 1,
  reporter: [["list"], ["html", { open: "never" }]],
  // Not the default test-results/: Playwright empties its output folder on every run,
  // and the unit-test run writes its JUnit report to test-results/junit.xml.
  outputDir: "test-results/playwright",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // --disable-dev-shm-usage: Chromium keeps its shared memory in /dev/shm, and a
  // container's default 64 MB is too small -- it crashes under load. This routes
  // that memory to /tmp instead, the standard fix for running Chromium in Docker.
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { args: ["--disable-dev-shm-usage"] },
      },
    },
  ],
  // No deployed target given: boot the app locally so the suite runs against this
  // code. Skipped when E2E_BASE_URL is set -- there is already a live app.
  webServer: runAgainstDeployment
    ? undefined
    : [
      {
        // The generated backend defaults to a local SQLite database (see
        // backend/app/database.py), so the API runs end to end with no database
        // server to stand up. Its packages are in backend/.venv (installed before the run).
        command:
          "cd ../backend && .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000",
        url: "http://127.0.0.1:8000/health",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
      {
        command: "npm run build && npm run preview -- --port 4173 --host 127.0.0.1",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: !process.env.CI,
        // A cold production build in a sandbox can take minutes.
        timeout: 300_000,
      },
    ],
});
