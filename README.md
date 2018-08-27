# LinkedInAddBot
Automatically connect with hundreds of people based on specified search terms.

## *** IMPORTANT ***
Please keep in mind that this software violates LinkedIn User Agreement. Use of this script may lead to a ban of the user's account. Use at your own risk!

## Setup
Make sure Node.JS is properly installed and runnable. This script requires (https://github.com/GoogleChrome/puppeteer#puppeteer)[Google Chrome's Puppeteer API], so please make sure you have that working.

### config.json
Modify this file to adjust the search terms. I recommend the following format:
`position location`

For example, to find bank tellers in the Dallas area, use the following:
`teller dallas`

### credentials.json
As the name implies, here the email and password for the account are used.

### message.json
This is the message that the script will use as an introduction. Keep in mind that LinkedIn has a limit of 300 characters for this field.

### Set page numbers
Since the results are extracted from a Google search, we need  to specify how many links the script will collect. This is found in the `LinkedInAddbot.js` file.  Search for the following comment line:
`##SETPAGENUMBER##`
and modify the range in the function call `search(searchTerm, FIRST_PAGE, LAST_PAGE)`. Note here that the script will collect links in the range [FIRST_PAGE, LAST_PAGE], so the starting page number will 1, not 0.

## Run
Open your terminal, navigate to the script directory and run: 
`node LinkedinAddbot`

## Details
It is important to note that running more than ~150 additions will cause the account to get flagged as a bot, so always limit search page to 10 or so (which will yield 100 links). 

Also, I added a couple of delays in between connection attempts in order to seem less bot-like. I do not know if this makes any difference in LinkedIn bot-detection algorithm. Reducing the delay will significantly improve program run time.

## TODO
1. Extract search range to config.json file.
2. Re-arrange code for better readability.
3. Account for situations where email is a required field for connection (as of right now, the program will crash and throw an uncaught exception.
