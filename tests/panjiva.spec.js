// @ts-check
const { test, expect } = require("@playwright/test");

test("Scrape Page", async ({ page }) => {
	let titles = [];
	let pageCount = 0;
	let runSuccess = "Unconfirmed";
	let consigneeId = "44402588";
	let shippersCountNumber;
	let largePage = false;
	let maxPages = 1;

	// Navigate to target page (if not already there)
	if (
		page.url() !==
		`https://panjiva.com/shipment_search/company?m=merged_consignee&permanent_id=${consigneeId}&type=all_profile`
	) {
		await page.goto(
			`https://panjiva.com/shipment_search/company?m=merged_consignee&permanent_id=${consigneeId}&type=all_profile`,
			{
				waitUntil: "networkidle",
				timeout: 120000,
			}
		);

		console.log("Navigated to Shippers Page");
	}

	// Check to see if page is empty
	const noResultsFound = await page.locator(".no-results h3").count();

	if (noResultsFound) {
		console.log("NO RESULTS FOUND");
		runSuccess = "No Results Found";
	} else {
		// wait for table to load
		await page.waitForSelector("#export_records_results", {
			timeout: 120000,
		});
		console.log("Table has appeared on page");

		const shippersCount = await page
			.locator(".aggr-stat-container.consignees .notranslate.t2tt")
			.getAttribute("title");
		console.log(`CONSIGNEE COUNT: ${shippersCount}`);

		// Convert to number and remove comma
		shippersCountNumber = parseInt(shippersCount.replace(",", ""));
		console.log(`CONSIGNEE COUNT NUMBER: ${shippersCountNumber}`);

		if (shippersCountNumber >= 10000) {
			largePage = true;
			runSuccess = "Page Too Large";
			console.log("Page Too Large");
		}

		// if page < 10000 items
		if (!largePage) {
			// Set table count to 100 if possible
			const tableSizeButton = await page
				.locator("#per_page_control_chosen .chosen-single")
				.count();
			if (tableSizeButton) {
				await page
					.locator("#per_page_control_chosen .chosen-single")
					.first()
					.click();
				await page.locator(".chosen-drop .active-result").last().click();
				console.log("SHIPPERS TABLE SET TO 100 ITEMS PER PAGE");

				// Wait for 15 seconds
				await page.waitForTimeout(15000);
				console.log("WAITED 15s AFTER TABLE LENGTH UPDATED TO 100");

				maxPages = Math.min(Math.ceil(shippersCountNumber / 100), 50);
				console.log(`MAX PAGES: ${maxPages}`);

				// Override shippers count if needs be
				if (shippersCountNumber > 5000) {
					shippersCountNumber = 5000;
					console.log("SHIPMENT COUNT UPDATED TO 5000");
				}
			} else {
				maxPages = Math.ceil(shippersCountNumber / 20);
				console.log(`MAX PAGES: ${maxPages}`);
			}

			async function getContentWithRetry(page, maxRetries = 3) {
				for (let i = 0; i < maxRetries; i++) {
					const rows = await page
						.locator("#results_set_wrapper tbody tr")
						.all();
					if (rows.length > 0) {
						const pageTitles = [];
						for (const row of rows) {
							const cells = await row.locator("td").all();
							if (cells.length >= 4) {
								const shipper = await cells[0].textContent();
								const shipperGlobalHq = await cells[1].textContent();
								const shipperLocalHq = await cells[2].textContent();
								const shipperUltimateParent = await cells[3].textContent();
								pageTitles.push({
									shipper: shipper.trim(),
									shipperGlobalHq: shipperGlobalHq.trim(),
									shipperLocalHq: shipperLocalHq.trim(),
									shipperUltimateParent: shipperUltimateParent.trim(),
								});
							}
						}
						return pageTitles;
					}
					await page.waitForTimeout(15000); // Wait for 15 seconds before retrying
				}
				throw new Error("Failed to load content after multiple retries");
			}

			while (pageCount < maxPages) {
				try {
					await page.waitForSelector("#results_set_wrapper tbody tr", {
						state: "attached",
						timeout: 60000,
					});
					console.log("Table attached");

					const pageTitles = await getContentWithRetry(page);
					titles.push(...pageTitles);
					const nextButton = await page
						.locator('#paging_div .results-by-page a[aria-label="Last Page"]')
						.last();
					if ((await nextButton.count()) === 0) {
						console.log("No more next buttons to click");
						break;
					}
					console.log(`SHIPPERS LENGTH: ${titles.length}`);

					await nextButton.click({ timeout: 15000 });
					console.log("Next button clicked");

					// Delay between 15 seconds
					await page.waitForTimeout(15000);
					console.log("Waited 15s after button click");

					await page.reload({ waitUntil: "networkidle", timeout: 60000 });
					console.log("Hard reload completed");

					pageCount++;
					console.log(`Processed page ${pageCount} of ${maxPages}`);
				} catch (e) {
					console.log("Error processing page:", e.message);
					break;
				}
			}

			// Update run success
			if (shippersCountNumber === titles.length) {
				runSuccess = "Success";
			} else {
				runSuccess = "Please Review";
			}
		}

		console.log({
			// url: request.url,
			titles: titles,
			status: runSuccess,
			consigneeId: consigneeId,
			spreadsheetId: "1Ot8H6G_3RbAg9yrLFFzno1qXr2lS9c6vR_Yo2V4wme0",
			sheetName: "Sheet1",
		});
	}
});
