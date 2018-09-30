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
    //TODO: store private data in DynamoDB not chain and real id string for both external ids
    //TODO: add the appropriate public keys based on the chain owner (store in KMS)
    let currentTime = new Date().getTime().toString();
    let externalIds = [
        // base64(PUBLIC_KEY),
        // base64(YOUR_PRIVATE_KEY),
        //DynamoDB Partition key
        base64(event.id),
        //DynamoDB sort key
        base64(currentTime)
    ];
    let initialChainContent = {
        "appName": "Smart Share",
        "version": 1,
        "author": "j",
        "description": "I am groot"
    };
    let initContent = JSON.stringify(initialChainContent);

    let factomObjs = [];

    if (event.userId) {
        externalIds.push(base64(event.userId));
        //create the asset chain for new users
        return createChain(externalIds, base64(initContent))
            .then((obj) => {
                return obj.dataFromChain;
            })
            .catch((e) => {
                console.log(e);
                return "Couldn't create user."
            });

    } else if (event.newAsset) {
        //create the asset chain with info about the app
        return createChain(externalIds, base64(initContent))
            .then((obj) => {
                factomObjs.push(obj);
                //store data about the data from the initial form in the asset chain
                //TODO: seriously no validation of the data from the API!!
                let content = JSON.stringify(event.newAsset);
                return createEntryInAssetChain(obj.dataFromChain.chain_id, externalIds, base64(content));
            })
            //all other chains use entry hash and chain id to reference the asset entry before about the smart contract
            .then((obj) => {
                factomObjs.push(obj);
                let content = JSON.stringify({
                    chain_id: factomObjs[0].dataFromChain.chain_id,
                    entry_hash: factomObjs[1].dataFromChain.entry_hash
                });
                return createEntriesInTheOtherStakeholderChains(externalIds, base64(content), factomObjs);
            })
            .then((obj) => {
                return kindOfPrettyOutput(obj);
            })
            .catch((e) => {
                console.log(e);
                return kindOfPrettyOutput(factomObjs);
            });
    } else {
        return "You had " + context.getRemainingTimeInMillis() + " ms remaining.";
    }


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
                let dataFromChain = JSON.parse(str);
                try {
                    let currentTime = new Date().getTime().toString();
                    let outgoingMessageObj = {
                        outgoing_time: currentTime,
                        outgoingContent: json,
                        dataFromChain: dataFromChain
                    };
                    resolve(outgoingMessageObj);
                } catch (ex) {
                    console.log('problem with createChain ex: ' + ex);
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
async function createEntryInAssetChain(chainId, externalIds, content) {
    return new Promise(function (resolve, reject) {
        var json = {
            external_ids: externalIds,
            content: content
        }
        let body = JSON.stringify(json);
        let path = '/v2/chains/' + chainId + '/entries';
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
                let dataFromChain = JSON.parse(str);
                try {
                    let currentTime = new Date().getTime().toString();
                    let outgoingMessageObj = {
                        outgoing_time: currentTime,
                        outgoingContent: json,
                        dataFromChain: dataFromChain
                    };
                    resolve(outgoingMessageObj);
                } catch (ex) {
                    console.log('problem with createChain ex: ' + ex);
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
//Promise does not work yet
//add the a dynamodb to look up the chain id based on the other stakeholder chain_ids including users
//create entry in user(s), broker, insurance, movingCompany, iotDeviceCompany, security, appraisalCompany chains
async function createEntriesInTheOtherStakeholderChains(externalIds, content, factomObjs) {
    let stakeholderChainIdArray = [
        '49b8359f2105925f150f8c957b97dcf10814443f2695c08c5b866308062a321d',
        'e7e35f94986071e4bb3328ff062bcfb88f1cc8582a29615bc35ccaca3d0b7891',
        '3337d4e65ac6b6a276b9003ffd135c7f4726aeff44484a7286748a31ce254a39',
        '3c3cb9e652b3a3656d9b70f6e1c941736349315ec50cfbe9c9e90cbc149eda58',
        '2656db34389e008ee49e18faf4f130f5dd42f2265d1268ec0f59256a6d727b6a',
        '058258586f2178af69acff782e542a4e1f84dce3d7a7bfd5834f3a9390c58cb7',
        '6928f5efd7531025160e9d309d182546a29b0b8d3284766f4d5d6584c25cbe38',
        '30b221f597aa1b844f874361b80e6f9b4fd930ff2805a70d7532f3559c4ee8d4'
    ];
    let promiseArray = [];
    stakeholderChainIdArray.forEach(e => {
        promiseArray.push(createEntryInAssetChain(e, externalIds, content))
    });

    return Promise.all(promiseArray)
        .then((obj) => {
            obj.forEach(o => {
                factomObjs.push(o);
            })
        });

}
function kindOfPrettyOutput(factomObjs) {
    factomObjs.forEach(e => {
        if (e.outgoingContent) {
            let externalIdsArray = e.outgoingContent.external_ids;
            let externalArray = [];
            externalIdsArray.forEach(i => {
                externalArray.push(decode64(i));
            });
            e.outgoingContent.external_ids = externalArray;
            e.outgoingContent.content = decode64(e.outgoingContent.content);
            e.outgoingContent.content = JSON.parse(e.outgoingContent.content);
        }
    });
    return factomObjs;
}
function base64(data) {
    let buff = new Buffer(data);
    let base64data = buff.toString('base64');
    return base64data;
}
function decode64(data) {
    let buff = new Buffer(data, 'base64');
    let text = buff.toString('ascii');
    return text;
}