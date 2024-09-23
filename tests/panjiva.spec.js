// @ts-check
import { test, expect } from "@playwright/test";

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
 * Ensure the correct taxble row count selector is chosen.
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
	// let titles = [];
	// let pageCount = 0;
	let runSuccess = "Please Review";
	let consigneeId = "44402588";
	// let consigneeId = "96223324";
	let shippersCountNumber;
	let largePage = false;
	// let maxPages = 1;
	const targetPages = ["merged_consignee", "merged_shipper", "shipments"];
	let resultsArray = {
		merged_consignee: [],
		merged_shipper: [],
		shipments: [],
	};

	await page.goto(
		`https://panjiva.com/shipment_search/company?m=merged_consignee&permanent_id=${consigneeId}&type=all_profile`,
		{
			waitUntil: "networkidle",
			timeout: 120000,
		}
	);

	// Navigate to target page (if not already there)

	async function navigateToPage(page, targetPage, consigneeId) {
		const baseUrl = "https://panjiva.com/shipment_search/company?";

		const url = `${baseUrl}m=${targetPage}&permanent_id=${consigneeId}&type=all_profile`;

		if (page.url() !== url) {
			await page.goto(url, {
				waitUntil: "networkidle",
				timeout: 120000,
			});
		}

		console.log(`Navigated to ${targetPage} Page`);

		const noResultsFound = await page.locator(".no-results h3").count();

		if (noResultsFound) {
			console.log("NO RESULTS FOUND");
			return "No Results Found";
		} else {
			await page.waitForSelector("#export_records_results", {
				timeout: 120000,
			});

			console.log("Table has appeared on page");

			return "Results Found";
		}
	}

	async function processDataFromPage(page, pageType) {
		let maxPages = 1;
		try {
			const selectorMap = {
				merged_consignee: ".aggr-stat-container.consignees .notranslate.t2tt",
				merged_shipper: ".aggr-stat-container.shippers .notranslate.t2tt",
				shipments: ".aggr-stat-container.shipments .notranslate.t2tt",
			};

			const rowCountSelector = selectorMap[pageType];

			const shippersCount = await page
				.locator(rowCountSelector)
				.getAttribute("title");

			// Convert to number and remove comma
			shippersCountNumber = parseInt(shippersCount.replace(",", ""));
			console.log(
				`${pageType.toUpperCase()} COUNT NUMBER: ${shippersCountNumber}`
			);

			// Check if page is too large (>= 10,000 items)
			if (shippersCountNumber >= 10000) {
				largePage = true;
				runSuccess = "Page Too Large";
				console.log("Page Too Large");
				return;
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

				const results = await handlePageination(page, maxPages, pageType);

				console.log(`${pageType.toUpperCase()} COUNT: ${shippersCount}`);

				console.log("results length: ", results.length);

				return shippersCountNumber;
			}
		} catch (error) {
			console.error(`Error processing data from ${pageType}: ${error.message}`);
			runSuccess = `Failed to process ${pageType}`;
		}
	}

	// Check if page has been processed
	async function handlePageination(page, maxPages, pageType) {
		let pageCount = 0;
		const titles = [];

		while (pageCount < maxPages) {
			try {
				await page.waitForSelector("#results_set_wrapper tbody tr", {
					state: "attached",
					timeout: 60000,
				});
				console.log("Table attached");

				const pageTitles = await extractPageTitles(page, pageType);
				titles.push(...pageTitles);
				resultsArray[pageType].push(...pageTitles);

				const nextButton = await page
					.locator('#paging_div .results-by-page a[aria-label="Last Page"]')
					.last();

				if ((await nextButton.count()) === 0) {
					console.log("No more next buttons to click");
					break;
				}

				console.log(`${pageType.toUpperCase()} LENGTH: ${titles.length}`);

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

		return titles;
	}

	// Scrapes table rows and extracts shipper details (name, global HQ, local HQ, ultimate parent)
	async function extractPageTitles(page, pageType) {
		const rows = await page
			.locator("#results_set_wrapper tbody tr:not(#missing-row)")
			.all();
		const pageTitles = [];

		if (rows.length > 0) {
			for (const row of rows) {
				// 1. try catch and skip if row doesn't have .wrap class? On shipments page
				const cells = await row.locator(".wrap:not(.col_view_record)").all();

				if (cells.length >= 4) {
					const cell1 = await cells[0].textContent();
					const cell2 = await cells[1].textContent();
					const cell3 = await cells[2].textContent();
					const cell4 = await cells[3].textContent();

					if (pageType === "merged_shipper") {
						pageTitles.push({
							shipper: cell1.trim(),
							shipperGlobalHq: cell2.trim(),
							shipperLocalHq: cell3.trim(),
							shipperUltimateParent: cell4.trim(),
						});
					} else if (pageType === "merged_consignee") {
						pageTitles.push({
							consignee: cell1.trim(),
							consigneeGlobalHq: cell2.trim(),
							consigneeLocalHq: cell3.trim(),
							consigneeUltimateParent: cell4.trim(),
						});
					} else if (pageType === "shipments") {
						pageTitles.push({
							consignee: cell1.trim(),
							shipper: cell2.trim(),
							hsCode: cell3.trim(),
							goodsShipped: cell4.trim(),
						});
					}
				} else {
					console.warn("Row has fewer than expected columns. Skipping row...");
				}
			}
		}

		return pageTitles;
	}

	async function processPages(page, consigneeId) {
		for (const pageType of targetPages) {
			const result = await navigateToPage(page, pageType, consigneeId);

			if (result === "No Results Found") {
				continue;
			}

			const shippersCountNumber = await processDataFromPage(page, pageType);

			console.log(`Table row count for ${pageType}: ${shippersCountNumber}`);
		}
	}

	await processPages(page, consigneeId);

	if (shippersCountNumber === resultsArray["shipments"].length) {
		runSuccess = "Success";
	}

	console.log({
		// url: request.url,
		results: JSON.stringify(resultsArray),
		status: runSuccess,
		consigneeId: consigneeId,
		spreadsheetId: "1Ot8H6G_3RbAg9yrLFFzno1qXr2lS9c6vR_Yo2V4wme0",
		sheetName: "Sheet1",
		rowNumber: 2,
	});
});
