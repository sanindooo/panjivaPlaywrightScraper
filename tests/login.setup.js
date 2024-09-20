import { test as setup } from "@playwright/test";

setup("write login session data", async ({ page }) => {
	// Handle cookie consent
	try {
		await page.click("#onetrust-accept-btn-handler", { timeout: 5000 });
		console.log("Cookie consent handled");
	} catch (e) {
		console.log("No cookie consent button found or error clicking it");
	}

	// Login to website
	await page.goto("https://panjiva.com/account/login", {
		waitUntil: "networkidle",
		timeout: 120000,
	});
	console.log("Gone to login page");
	await page.locator('input[name="email"]').fill("fo@oxylow.com");
	await page.locator('input[name="password"]').fill("YMFGlobal202411!!!");
	await page.locator("#main_login_signin").click();
	console.log("Login form submitted");

	// Wait for navigation or a specific element to ensure login was successful
	await page.waitForNavigation({
		waitUntil: "networkidle",
		timeout: 120000,
	});
	console.log("Login navigation completed");

	await page.context().storageState({ path: ".auth/login.json" });
});
