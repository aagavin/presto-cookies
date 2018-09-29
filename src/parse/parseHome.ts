import { Page } from "puppeteer";

const OTHER_CARD_SPACE = "                                            ";
const BALANCE = ".dashboard__card-summary";
const DROPDOWN = ".header .fareMediaID";

export const getBalance = async (page: Page) => {
    return await page.evaluate(BALANCE => {
        const balanceDashboard = document.querySelector(BALANCE);
        return {
            name: balanceDashboard.querySelector('h2').innerText,
            number: balanceDashboard.querySelector('#cardNumber').innerText,
            balance: balanceDashboard.querySelector('p.dashboard__quantity').innerText,
        }
    }, BALANCE);
}

export const getTable = async (page: Page) => {
    return await page.evaluate(() => {

        const table:HTMLTableElement = document.querySelector('#tblTHR');
        const rows = table.rows;
        let tableArray = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            let cellArray = [];
            for (let i = 0; i < row.cells.length; i++) {
                const element = row.cells[i];
                cellArray.push(element.innerText);
            }
            tableArray.push(cellArray);
        }
        return tableArray;
    });
}

export const getOtherCards = async (page: Page) => {
    return await page.evaluate((DropSelector, OTHER_CARD_SPACE) => {
        const otherCards = document.querySelectorAll(DropSelector);
        let cards = [];
        
        for (let i = 0; i < otherCards.length; i++) {
            const element = otherCards[i];
            cards.push(element.innerText.trim().replace('\n\n', '').replace(OTHER_CARD_SPACE, ' '));
        }

        return cards;
    }, DROPDOWN, OTHER_CARD_SPACE);
}