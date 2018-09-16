import { config as AWSConfig, DynamoDB, AWSError } from "aws-sdk";
import { PromiseResult } from "aws-sdk/lib/request";

import to from "./util/to";
import setCookies from "./setCookies";

const TABLE_NAME = "prestoCache";

AWSConfig.update({ region: 'us-east-1' });
const cacheDBDocClient = new DynamoDB.DocumentClient();

const setCookiesLoop = async (): Promise<void> => {
    const params: DynamoDB.DocumentClient.ScanInput = {
        TableName: TABLE_NAME,
        AttributesToGet: ['username', 'cred']
    }
    const userResult: PromiseResult<DynamoDB.DocumentClient.ScanOutput, AWSError> = await cacheDBDocClient.scan(params).promise();

    if (userResult.$response.error) {
        console.error(userResult.$response.error.message);
    }

    const users: Array<{ username: string, cred: string }> = userResult.$response.data['Items'];

    users.map(user => user.cred = Buffer.from(user.cred, 'base64').toString('ascii'));
    users.forEach(async user => {
        const cookies = await setCookies(user);
        const parmas: DynamoDB.DocumentClient.UpdateItemInput = {
            TableName: TABLE_NAME,
            Key: {
                'username': user.username
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
    });
}

const addCreds = async (event: any) => {
    const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: TABLE_NAME,
        Item: {
            username: event.username,
            cred: Buffer.from(event.password).toString('base64')
        }
    };
    const dbValue: PromiseResult<DynamoDB.DocumentClient.PutItemOutput, AWSError> = await cacheDBDocClient.put(params).promise();
    if (dbValue.$response.error) console.log(dbValue.$response.error);
    return {};
}

exports.handler = async (event): Promise<object> => {
    let err;

    if (typeof event.command !== 'undefined' && event.command === 'AddCreds') return addCreds(event);
    [err,] = await to(setCookiesLoop());
    if (err) {
        console.error(err);
        return err;
    }
    return { success: true };
}

