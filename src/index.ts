import { Page, Browser, Cookie } from "puppeteer";
import puppeteerLambda = require('puppeteer-lambda');

const URL: string = "https://www.prestocard.ca/en/";
const SIGN_IN_LINK_SELECTOR: string = "body > header > div.header.container > div.main-navigation > ul.nav.navbar-nav.navbar-right > li.modalLogin > a";


exports.handler = async (event): Promise<Array<Cookie>> => {

    console.log('opening browser');
    const browser: Browser = await puppeteerLambda.getBrowser({
        headless: true,
        // args: ['--no-sandbox'],
    });

    console.log('opening page');
    const page: Page = await browser.newPage();
    await page.setViewport({ 'width': 1920, 'height': 1080 });
    await page.goto(URL);
    await page.click(SIGN_IN_LINK_SELECTOR);
    await page.waitFor(300);
    await page.click('#SignIn_Username');
    await Promise.all([
        await page.waitFor(50),
        await page.type('#SignIn_Username', event.username)
    ]);

    await page.click('#SignIn_Password');

    await Promise.all([
        await page.waitFor(50),
        page.type('#SignIn_Password', event.password)
    ]);

    await Promise.all([
        page.waitForNavigation(),
        page.click('#btnsubmit')
    ]);

    const cookies: Array<Cookie> = await page.cookies();

    await page.close();
    await browser.close();

    return cookies;
}
