# playwrightScraper
## Running Tests
### Running the Example Test
By default tests will be run on all 3 browsers, chromium, firefox and webkit using 3 workers. This can be configured in the playwright.config file. Tests are run in headless mode meaning no browser will open up when running the tests. Results of the tests and test logs will be shown in the terminal.

Command: <code>npx playwright test</code>

### HTML Test Reports
After your test completes, an HTML Reporter will be generated, which shows you a full report of your tests allowing you to filter the report by browsers, passed tests, failed tests, skipped tests and flaky tests. You can click on each test and explore the test's errors as well as each step of the test. By default, the HTML report is opened automatically if some of the tests failed.

Command: <code>npx playwright show-report</code>

### Running the Example Test in UI Mode
Run your tests with <a href="https://playwright.dev/docs/test-ui-mode">UI Mode</a> for a better developer experience with time travel debugging, watch mode and more.

Check out or <a href="https://playwright.dev/docs/test-ui-mode">detailed guide on UI Mode</a> to learn more about its features.

Command: <code>npx playwright test --ui</code>

### Running Tests in Headed Mode
To run your tests in headed mode, use the --headed flag. This will give you the ability to visually see how Playwright interacts with the website.

<code>npx playwright test --headed</code>

### Run specific tests
To run tests on single or mutliple files use the following commands:

Single tests: <code>npx playwright test landing-page.spec.ts</code>
Multiple tests: <code>npx playwright test tests/todo-page/ tests/landing-page/</code>

To run files that have landing or login in the file name, simply pass in these keywords to the CLI.

Command: <code>npx playwright test landing login</code>

Run only the tests that failed:

Command: <code>npx playwright test --last-failed</code>

Debug tests with the Playwright Inspector

To debug all tests, run the Playwright test command followed by the --debug flag.

This command will open up a Browser window as well as the Playwright Inspector. You can use the step over button at the top of the inspector to step through your test. Or, press the play button to run your test from start to finish. Once the test has finished, the browser window will close.

Commad: <code>npx playwright test --debug</code>

### Recording a trace
Traces are setup to run on-first-retry meaning they will be run on the first retry of a failed test.

Traces are normally run in a Continuous Integration(CI) environment, because locally you can use UI Mode for developing and debugging tests. However, if you want to run traces locally without using UI Mode, you can force tracing to be on with --trace on.

Command: <code>npx playwright test --trace on</code>

## Generating Tests

Use the codegen command to run the test generator followed by the URL of the website you want to generate tests for. The URL is optional and you can always run the command without it and then add the URL directly into the browser window instead.

Command: <code>npx playwright codegen optional-url-here</code>

## Updating playwright

<code>npm install -D @playwright/test@latest
<!-- Also download new browser binaries and their dependencies: -->
npx playwright install --with-deps</code>

<code>Check version: npx playwright --version</code>