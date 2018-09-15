import { Page, Browser, Cookie, launch } from "puppeteer";
import { config as AWSConfig, DynamoDB, AWSError, Request } from "aws-sdk";

import to from "./util/to";

const URL: string = "https://www.prestocard.ca/en/";
const SIGN_IN_LINK_SELECTOR: string = "body > header > div.header.container > div.main-navigation > ul.nav.navbar-nav.navbar-right > li.modalLogin > a";
const TABLE_NAME = "prestoCache";

AWSConfig.update({ region: 'us-east-1' });
const cacheDBDocClient = new DynamoDB.DocumentClient();


exports.handler = async (event): Promise<{}> => {

    if (typeof event.command !== 'undefined' && event.command === 'AddCreds') {
        return await addCreds(event);
    }
    return await getCookies(event);
}

this.handler({ username: 'lorraineif', password: '56wYM4Bies', command: 'AddCreds' }).then(console.log).catch(console.log);

const addCreds = async (event: any) => {
    const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: TABLE_NAME,
        Item: {
            username: event.username,
            cred: Buffer.from(event.password).toString('base64')
        }
    };
    const dbValue: Request<DynamoDB.DocumentClient.PutItemOutput, AWSError> = cacheDBDocClient.put(params, (err: AWSError, data: DynamoDB.DocumentClient.PutItemOutput) => {
        if (err)
            console.error(err.message);
    });
    return {};
}

const getCookies = async (event) => {

    let browser: Browser, page: Page, cookies: Array<Cookie>, err;

    console.log('opening browser');
    [err, browser] = await to(launch({
        // executablePath: './headless-chromium',
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--single-process', '--deterministic-fetch', "--proxy-server='direct://'", '--proxy-bypass-list=*']
    }));
    if (err) console.error(err);

    console.log('opening page');
    [err, page] = await to(browser.newPage());
    if (err) console.error(err);

    await page.setViewport({ 'width': 1920, 'height': 1080 });

    console.log(`going to ${URL}`);
    await Promise.all([
        page.waitForNavigation(),
        await page.goto(URL)
    ]);

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

    [err, cookies] = await to(page.cookies());
    if (err) console.error(err);

    console.log('closeing page and browser')
    await page.close();
    await browser.close();

    const parmas: DynamoDB.DocumentClient.UpdateItemInput = {
        TableName: TABLE_NAME,
        Key: {
            'username': event.username
        },
        UpdateExpression: 'SET cookiesCache = :c',
        ExpressionAttributeValues: {
            ':c': Buffer.from(JSON.stringify(cookies)).toString('base64')
        },
        ReturnValues: "UPDATED_NEW",
    };

    cacheDBDocClient.update(parmas, (err: AWSError, data) => {
        if (err) console.error(err.message);
    });

    console.log('returning cookies')
    return {};
}