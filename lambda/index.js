/*
 * Copyright (C) 2018 SmArt Share
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

//This is node module.  That is all.
const https = require('https');

exports.handler = async (event, context) => {
    //TODO create base64 fn, get keys for atleast our test user
    let externalIds = [
        // base64(PUBLIC_KEY),
        // base64(YOUR_PRIVATE_KEY),
        //DynamoDB Partition key
        base64("DRN00006879"),
        //DynamoDB sort key
        // base64("CHANGE_TO_TIME")
    ];
    // let content = base64(event.content);
    let content = base64("Hello");
    console.log(externalIds, content);
    let chain = await createChain(externalIds, content);
    console.log(JSON.stringify(chain));
    return "You had " + context.getRemainingTimeInMillis() + " ms remaining.";

}


async function createChain(externalIds, content) {
    return new Promise(function (resolve, reject) {
        var json = {
            external_ids: externalIds,
            content: content
        }
        let body = JSON.stringify(json);
        let path = '/v2/chains';
        let options = {
            host: "api-2445581893456.production.gw.apicast.io",
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-key': process.env.FACTOM_API_KEY
            }
        };

        let req = https.request(options, (res) => {
            res.on('data', (d) => {
                let str = '';
                str += d;
                let dataFromMessenger = JSON.parse(str);
                try {
                    let currentTime = new Date().getTime().toString();
                    let outgoingMessageObj = {
                        outgoing_time: currentTime,
                        outgoingMessage: json,
                        dataFromMessenger: dataFromMessenger
                    };
                    resolve(outgoingMessageObj);
                } catch (ex) {
                    console.log('problem with sendAll ex: ' + ex);
                    reject(ex);
                }

            });
        });

        req.on('error', (e) => {
            console.log('problem with request e: ' + e);
            reject(e);
        });
        req.write(body);
        req.end();
    });
}
function base64(data) {
    let buff = new Buffer(data);
    let base64data = buff.toString('base64');
    return base64data;
}