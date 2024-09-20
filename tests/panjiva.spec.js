// @ts-check
const { test, expect } = require("@playwright/test");

/**
 * TASK: Optimise the scrape and make sure that it's compatible with the three pages 
 * by creating a reusable function
 * 
 * STEP 1: 
 * Dynamically navigate between the pages.
 * This will look something like this: `https://panjiva.com/shipment_search/company?m=${targetPage}&permanent_id=${consigneeId}&type=all_profile`
 * where targertPage = merged_shipper, merged_consignee, shipments
 * Handle the no-results found better by returning and empty message and preventing rest of function from running with return;
 * 
 * STEP 2:
 * Ensure the correct table row count selector is chosen.
 * const shippersCount = await page
			.locator(".aggr-stat-container.TARGET-SELECTOR .notranslate.t2tt")
			.getAttribute("title");
		console.log(`CONSIGNEE COUNT: ${shippersCount}`);
 * This will either be .consignees, .shipments or .shippers
 * 
 * STEP 3:
 * Update the console.log calls to be representative of the page that's being scraped 
 * 
 * STEP 4:
 * Remove the max retries part of the getContentWithRetries() function and rename it to be more appropriate 
 * Ensure the pageTitles array pushes objects that have the appropriate keys for the page being scraped 
 * 
 * STEP 5:
 * Ensure the content is printed to the console using the example.json file as reference

 */

test("Scrape Page", async ({ page }) => {
	let titles = [];
	let pageCount = 0;
	let runSuccess = "Unconfirmed";
	let consigneeId = "44402588";
	let shippersCountNumber;
	let largePage = false;
	let maxPages = 1;

	// Navigate to target page (if not already there)
	// **<STEP 1>**
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
	// **</ STEP 1>**

	// **<STEP 1>**
	// Check to see if page is empty
	const noResultsFound = await page.locator(".no-results h3").count();

	if (noResultsFound) {
		console.log("NO RESULTS FOUND");
		runSuccess = "No Results Found";
		// **</ STEP 1>**
	} else {
		// wait for table to load
		await page.waitForSelector("#export_records_results", {
			timeout: 120000,
		});
		console.log("Table has appeared on page");

		// **<STEP 2>**
		const shippersCount = await page
			.locator(".aggr-stat-container.consignees .notranslate.t2tt")
			.getAttribute("title");
		/* **<STEP 3>** */ console.log(
			`CONSIGNEE COUNT: ${shippersCount}`
		); /* **</STEP 3>** */
		// **</STEP 2>**

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
				/* **<STEP 4>** */ for (let i = 0; i < maxRetries; i++) {
					/* **<STEP 4>** */
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
								/* **<STEP 4>** */
								pageTitles.push({
									shipper: shipper.trim(),
									shipperGlobalHq: shipperGlobalHq.trim(),
									shipperLocalHq: shipperLocalHq.trim(),
									shipperUltimateParent: shipperUltimateParent.trim(),
								});
								/* **</STEP 4>** */
							}
						}
						return pageTitles;
					} /* **<STEP 4>** */
					await page.waitForTimeout(15000); // Wait for 15 seconds before retrying
				}
				throw new Error(
					"Failed to load content after multiple retries"
				); /* **<STEP 4>** */
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
		/* **<STEP 5>** */
		console.log({
			// url: request.url,
			titles: titles,
			status: runSuccess,
			consigneeId: consigneeId,
			spreadsheetId: "1Ot8H6G_3RbAg9yrLFFzno1qXr2lS9c6vR_Yo2V4wme0",
			sheetName: "Sheet1",
		});
		/* **<STEP 5>** */
	}
});
