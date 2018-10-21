import AWS = require('aws-sdk');
import { PutItemInput, GetItemInput, GetItemOutput } from 'aws-sdk/clients/dynamodb';
import { to } from './to';

AWS.config.apiVersions = {
    dynamodb: '2012-08-10',
};
AWS.config.update({ region: 'us-east-1' });

const TABLENAME: string = 'PrestoCache';
const dynamodb = new AWS.DynamoDB();

/**
 *
 *
 * @param {string} username
 * @param {object} cardData
 * @returns {Promise<object>}
 */
export const addToCache = async (username: string, cardData: object): Promise<object> => {
    // 3600000
    // 3600
    let result, err;

    const encodedCardData = Buffer.from(JSON.stringify(cardData)).toString('base64');
    const parmas: PutItemInput = {
        Item: {
            'username': {
                S: username
            },
            'cardData': {
                S: encodedCardData
            },
            'expireTime': {
                S: (Math.floor(Date.now() / 1000) + 3600).toString()
            }
        },
        TableName: TABLENAME
    };
    [err, result] = await to(dynamodb.putItem(parmas).promise());
    if (err) console.error(err);

    return result;
};

/**
 * get cached value
 *
 * @param {string} username
 * @returns {Promise<object>}
 */
export const getCache = async (username: string): Promise<object> => {

    const params: GetItemInput = {
        Key: {
            'username': {
                S: username
            }
        },
        TableName: TABLENAME
    }
    const cacheValue: GetItemOutput = await dynamodb.getItem(params).promise();

    const nowDate = Math.floor(Date.now() / 1000);
    if (Object.keys(cacheValue).length === 0 || nowDate > parseInt(cacheValue.Item.expireTime.S, 10)) {
        return null;
    }

    const jsonValue = Buffer.from(cacheValue.Item.cardData.S, 'base64').toString();
    return JSON.parse(jsonValue);

}
