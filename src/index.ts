import { Page, Browser, launch } from "puppeteer";
import { to } from "./util/to";
import { getBalance, getOtherCards, getTable } from "./parse/parseHome";

const URL: string = "https://www.prestocard.ca/en/";
const SIGN_IN_LINK_SELECTOR: string = "body > header > div.header.container > div.main-navigation > ul.nav.navbar-nav.navbar-right > li.modalLogin > a";

exports.handler = async (event): Promise<{}> => {

    let browser: Browser, page: Page, err;

    console.log('opening browser');
    [err, browser] = await to(launch({
        // headless: false,
        executablePath: './headless-chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--single-process', "--proxy-server='direct://'", '--proxy-bypass-list=*']
    }));
    if (err) console.error('error with browser', err);

    console.log('opening page');
    [err, page] = await to(browser.newPage());
    if (err) console.error('page error', err);

    await page.setViewport({ 'width': 1920, 'height': 1080 });

    console.log(`going to ${URL}`);
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.goto(URL)
    ]);

    await page.click(SIGN_IN_LINK_SELECTOR);
    await page.waitFor(300);

    console.log(`username: ${event.username}`);
    await page.click('#SignIn_Username');
    await page.type('#SignIn_Username', event.username);
    await page.waitFor(50);

    console.log('typeing password');
    await page.click('#SignIn_Password');
    await page.type('#SignIn_Password', event.password);

    console.log('click submit button');
    await page.waitFor(50);
    [err,] = await to(Promise.all([
        page.waitForNavigation(),
        page.click('#btnsubmit')
    ]));
    if (err) {
        console.error(err);
        await browser.close();
        return { error: 'username or password wrong' }
    };

    const parsedData = await Promise.all([
        getBalance(page),
        getTable(page),
        getOtherCards(page)
    ]);

    console.log('closeing page and browser');
    await browser.close();

    console.log('returning parsedData');
    return {
        cardInfo: parsedData[0],
        balanceTable: parsedData[1],
        otherCard: parsedData[2]
    };
}
