import { zipRepo } from './lib/zipHelper.mjs';
import { bundlrUpload } from './lib/bundlrHelper.mjs';
import { arweaveUpload, getAddress } from './lib/arweaveHelper.mjs';
import { getRepos, newRepo, updateRepo } from './lib/warpHelper.mjs';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkgInfo = require('./package.json');

// get wallet from secrets
import { config } from 'dotenv';
config();
const JWK = JSON.parse(process.env.WALLET);
const CONTRACT_TX_ID = process.env.CONTRACT_TX_ID;

async function main() {
    console.log(`[ PL Sync ] Starting sync for repo '${pkgInfo.name}'`);
    // define what to compress (only .git folder)
    const PATH = '.';
    const FOLDER_TO_ZIP = '.git';

    // compress the repo
    let zipBuffer;
    try {
        zipBuffer = await zipRepo(PATH, FOLDER_TO_ZIP);
    } catch (error) {
        console.error('Error zipping repository:', error);
        process.exit(1);
    }

    let txId;

    // upload compressed repo to arweave using bundlr
    // try {
    //     const bundlrTxId = await bundlrUpload(JWK, zipBuffer);
    //     txId = bundlrTxId;
    //     console.log('Posted Tx to Bundlr: ', bundlrTxId);
    // } catch (error) {
    //     console.error('Error uploading zipped repo with bundlr:', error);
    //     console.error('Trying with Arweave...');
    //     try {
    //         // bundlr failes -> try arweave instead
    //         const arweaveTxId = await arweaveUpload(JWK, zipBuffer);
    //         txId = arweaveTxId;
    //         console.log('Posted Tx to Arweave: ', arweaveTxId);
    //     } catch (error) {
    //         console.error('Error uploading zipped repo with arweave:', error);
    //         process.exit(1);
    //     }
    // }

    txId = 'hey';
    if (txId) {
        // get existing repos for this wallet
        const repos = await getRepos(JWK, CONTRACT_TX_ID);

        // check if repo already exists
        let repoInfo = repos.find((r) => r.name === pkgInfo.name);
        let owner = await getAddress(JWK);

        if (!repoInfo) {
            newRepo({
                title: pkgInfo.name,
                description: pkgInfo.description,
                dataTxId: txId,
                owner,
            });
        } else {
            updateRepo({
                id: repoInfo.id,
                title: pkgInfo.name,
                description: pkgInfo.description,
                dataTxId: txId,
                owner,
            });
        }
    }
}

// Run the main function
(async () => {
    await main();
})();
