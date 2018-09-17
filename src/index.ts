import { config as AWSConfig, DynamoDB, AWSError, Lambda } from "aws-sdk";
import { PromiseResult } from "aws-sdk/lib/request";

const to = (promise) => {
    return promise.then(data => {
        return [null, data];
    }).catch(err => [err]);
}

const TABLE_NAME = "prestoCache";

AWSConfig.update({ region: 'us-east-1' });
const cacheDBDocClient = new DynamoDB.DocumentClient();

const setCookiesLoop = async (): Promise<void> => {

    return new Promise<void>(async (resolve, reject) => {
        console.log('setting cookies');
        const params: DynamoDB.DocumentClient.ScanInput = {
            TableName: TABLE_NAME,
            AttributesToGet: ['username', 'cred']
        }
        const userResult: PromiseResult<DynamoDB.DocumentClient.ScanOutput, AWSError> = await cacheDBDocClient.scan(params).promise();
    
        if (userResult.$response.error) {
            console.error(userResult.$response.error.message);
        }
    
        let users: Array<object> = userResult.$response.data['Items'];
    
        users = users.map(user => {
            user['password'] = Buffer.from(user['cred'], 'base64').toString('ascii')
            return user;
        });
    
        users.forEach(async user => {
    
            const params: Lambda.InvocationRequest = {
                FunctionName: 'presto-cookies',
                Payload: JSON.stringify(user)
            };
    
            console.log('-----------1------------');
            (new Lambda()).invoke(params, (err, cookies) => {
    
                console.log(`-------------${cookies}--------`)
                const parmas: DynamoDB.DocumentClient.UpdateItemInput = {
                    TableName: TABLE_NAME,
                    Key: {
                        'username': user['username']
                    },
                    UpdateExpression: 'SET cookiesCache = :c, lastUpdate = :d',
                    ExpressionAttributeValues: {
                        ':c': Buffer.from(JSON.stringify(cookies)).toString('base64'),
                        ':d': new Date().valueOf()
                    },
                    ReturnValues: "UPDATED_NEW",
                };
                console.log(JSON.stringify(params));
                cacheDBDocClient.update(parmas, (err: AWSError, data) => {
                    if (err) console.error(err.message);
                    resolve();
                });
                console.log('-----------1.5------------')
            });
            console.log('-----------2------------');
    
        });
    });
} //setCookiesLoop

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

    if (typeof event.command !== 'undefined' && event.command === 'AddCreds') {
        console.log('added creds');
        return addCreds(event);
    }
    [err] = await to(setCookiesLoop());
    if (err) {
        console.error(err);
        return err;
    }
    return { success: true };
}