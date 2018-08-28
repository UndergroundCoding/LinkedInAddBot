const puppeteer = require('puppeteer');
const config = require("./config.json");
const credentials = require("./credentials.json");
const message = require("./message.json");

async function run() {
	let startTime = Date.now();
	const browser = await puppeteer.launch({
		headless: true});		// set to false for visual debugging
	const page = await browser.newPage();
	//await page.setViewport({width: 1500, height: 1500})	// For headless: false
	
	let totalLinks;
	let friendsAdded;
	
	/*
	 * Log-in to user account
	 */
	async function logIn(mCredentials) {	
		// Logout
		const logoutPromise = page.waitForNavigation();
		await page.goto('https://www.linkedin.com/m/logout/');
		await logoutPromise;
		if(page.url() == "https://www.linkedin.com/") {
			console.log("Logged out successfully.");
		}
		
		// Grab field selectors
		const EMAIL_SELECTOR = '#login-email';
		const PASSWORD_SELECTOR = "#login-password";
		const SIGNIN_BUTTON_SELECTOR = "#login-submit";
		
		// Fill in login form
		await page.waitForSelector(EMAIL_SELECTOR);		// Make sure page has loaded
		
		// After the page is done loading it will set the pointer to a field
		// We must wait for that to happen so we can then change it, otherwise
		// we end up typing in the wrong friend and the program crashes
		await page.waitFor(1500);
		
		await page.type(EMAIL_SELECTOR, mCredentials.email);
		await page.type(PASSWORD_SELECTOR, mCredentials.password);
		
		// Login
		const loginPromise = page.waitForNavigation();
		await page.click(SIGNIN_BUTTON_SELECTOR);
		await loginPromise;
		
		if(page.url() == "https://www.linkedin.com/feed/") {
			console.log("Logged in successfully.");
			return true;
		} else {
			console.log("Failed to log in.");
			return false;
		}
	}
	
	/*
	 * Generate list of people to add as friends.
	 * @return : array of links of size 10 * (finalPage - initialPage - 1)
	 */
	async function search(term, initialPage, finalPage) {
		links = [];
		// Loop through Google search pages
		for(let i = initialPage-1; i <= finalPage-1; i++) {
			let searchLink = "https://www.google.com/search?q=" + "site:linkedin.com/in/ " + config.searchTerm + 
						"&start=" + i*10;
			const navigationPromise = page.waitForNavigation();
			await page.goto(searchLink);
			await navigationPromise;
			
			let newLinks = [];
			try {
				newLinks = await page.evaluate(() => {
						const LINK_SELECTOR = '#rso > div > div > div > div > div > div.r';
						let searchItems = document.querySelectorAll('#search .g a[href^="https"]');						

						if(searchItems.length < 1) {
							throw "Zero or less search results!";
						} else if(searchItems.length > 10) {
							throw "Potential problem, too many links!";
						}
						
						// Loop through searchItems, extracting links
						tmpLinks = [];
						for(let j = 0; j < searchItems.length; j++) {
							tmpLinks[j] = searchItems[j].href;
						}
						
						return tmpLinks;
				});
			} catch (err) {
				console.log(err);
			}
			
			// Consolidate all links into a single array
			for(let k = 0; k < newLinks.length; k++) {
				links.push(newLinks[k]);
			}
		}
		
		console.log(links);
		return links;
	}
	 
	async function addFriend(individualLink) {
		// Check if individual is connectable
		const navigationPromise = page.waitForNavigation();
		await page.goto(individualLink);
		await navigationPromise;
		
		const CONNECT_BUTTON_SELECTOR = '.pv-s-profile-actions--connect .pv-s-profile-actions__label';
		
		console.log("Checking if connectable: ");
		
		await page.waitFor(500);	// Wait for connect button to load, if it exists
		
		let isConnectable;
		
		try {
			isConnectable = await page.evaluate((CONNECT_BUTTON_SELECTOR) => {
				let qs = document.querySelector(CONNECT_BUTTON_SELECTOR);
				if(qs != null)
					return (qs.innerHTML.toUpperCase() == 'CONNECT');
				
				return false;
			}, CONNECT_BUTTON_SELECTOR);
		} catch (err) {
			console.log(err);
			isConnectable = false;
		}
		
		console.log(isConnectable);
		
		if (isConnectable) {
			//console.log("isConnectable");
			// Collect individual's name
			const individualName = await page.evaluate(() => {
				const NAME_SELECTOR = '.pv-top-card-section__name';
				return document.querySelector(NAME_SELECTOR).innerHTML;
			});
			//console.log("individualName = " + individualName);
			
			// Connect with individual
			await page.click(CONNECT_BUTTON_SELECTOR);
			
			const DONE_SELECTOR = '.button-primary-large.ml1'			
			await page.waitForSelector(DONE_SELECTOR);
			
			console.log("Checking if can leave note: ");
			
			const ADD_NOTE_SELECTOR = '.button-secondary-large.mr1';
			let canLeaveNote = await page.evaluate((ADD_NOTE_SELECTOR) => {
				
				return (document.querySelector(ADD_NOTE_SELECTOR) != null);
			}, ADD_NOTE_SELECTOR);
			
			console.log(canLeaveNote);
			if(canLeaveNote) {
				//console.log("canLeaveNote");
				
				// Create message
				const inviteMessage = message.intro /*+ individualName.trim()*/ + "\n" + message.message;
				console.log("inviteMessage:");
				console.log("\n" + inviteMessage + "\n\n");
				
				// Write message
				await page.click(ADD_NOTE_SELECTOR);
				const MESSAGE_BOX_SELECTOR = '#custom-message';
				await page.waitForSelector(MESSAGE_BOX_SELECTOR);
				
				await page.type(MESSAGE_BOX_SELECTOR, inviteMessage);
				const navigationPromise = page.waitForNavigation();
				await page.click(DONE_SELECTOR);
				await navigationPromise;
				
				const CONFIRMATION_POST = "isSendInvite=true";
				url = page.url();
				if(url.indexOf(CONFIRMATION_POST) == -1) {
					console.log("Unable to add friend.");					
					return false;
				} else {
					console.log("Friend added successfully.");
				}
			}
		}
		
		return isConnectable;
	}
	
	async function programRun() {
		console.log("\nGetting links from Google...");
		
		// ##SETPAGENUMBER##
		/* The range of pages in the function below reads pages in the format [first, last)
		 * Also note that page number starts at 1, not 0.
		 */
		let links = await search(config.searchTerm, 17, 21);	// Note: Running too many pages at once may get user
																// flagged as a bot and potentially banned.
																// Recommended: 10 pages													
		
		let isLoggedIn = false;
		while(!isLoggedIn) {
			try {
				console.log("\nAttempting login...");
				isLoggedIn = await logIn(credentials);
			} catch (err) {
				throw new "Could not log in ERR";
			}
		}
		
		totalLinks = links.length;
		friendsAdded = 0;		
		for(let i = 0; i < links.length; i++) {
			console.log("-------------------------");
			console.log("Working on link (" + i + ") of (" + links.length + ").");
			let friendable
			try {
				friendable = await addFriend(links[i]);
			} catch (err) {
				throw new "Could not addFriend()";				
			} finally {
				friendable = false;
			}
			let delay = Math.floor(Math.random() * 120000) + 60000;	// Generates a delay between [1,3] minutes;
			
			if(friendable)
				friendsAdded++;
			
			console.log("Delaying next connection by: " + delay + "ms. ...");
			await page.waitFor(delay);	// Slows program running speed to avoid being flagged as a bot
		}
		
		
	}
	// Program entry point
	console.log("Starting Program...");
	await programRun();
	console.log("-------------------------");
	await console.log("\nProgram done!");
	await console.log("\nNew connections = " + friendsAdded + " out of " + totalLinks + ".");
	
	// Calculate time in readable  format
	let endTime = Date.now() - startTime;	// Total runtime
	let secs = Math.floor((endTime / 1000) % 60);
	let mins = Math.floor((endTime / 60000) % 60);
	let hours = Math.floor(endTime / 3600000);
	let runTimeString = hours + "hrs " + mins + "mins " + secs + "secs";
	await console.log("\nTotal runtime = " + runTimeString + ".");
	
	// Done, close out program.
	await browser.close();
	await process.exit();
}

run();