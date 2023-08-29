import { zipRepo } from './lib/zipHelper.mjs';
import { getAddress, uploadRepo } from './lib/arweaveHelper.mjs';
import { getRepos, postRepoToWarp } from './lib/warpHelper.mjs';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkgInfo = require('./package.json');

// get wallet from secrets
import { config } from 'dotenv';
import { getTags, removeCacheFolder } from './lib/common.mjs';
config();
const JWK = JSON.parse(process.env.WALLET);
const CONTRACT_TX_ID = process.env.CONTRACT_TX_ID;

async function main() {
    // delete warp cache folder
    await removeCacheFolder();

    console.log(`[ PL Sync ] Starting sync for repo '${pkgInfo.name}'`);
    // define what to compress (only .git folder)
    const PATH = '.';
    const FOLDER_TO_ZIP = '.git'; // Only compress `.git` folder
    // const FOLDER_TO_ZIP = '.'; // Compress the full repo
    const HAS_GITIGNORE = true; // Use `.gitignore` to avoid compressing secrets
    const owner = await getAddress(JWK);

    // get existing repos for this wallet
    const repos = await getRepos(JWK, CONTRACT_TX_ID);

    // check if repo already exists
    let repoInfo = repos.find((r) => r.name === pkgInfo.name);

    // compress the repo
    let zipBuffer;
    try {
        zipBuffer = await zipRepo(
            pkgInfo.name,
            PATH,
            FOLDER_TO_ZIP,
            HAS_GITIGNORE
        );
    } catch (error) {
        console.error('Error zipping repository:', error);
        process.exit(1);
    }

    const tags = getTags(owner, pkgInfo.name, pkgInfo.description, repoInfo);

    const txId = await uploadRepo(JWK, zipBuffer, tags);

    if (txId)
        postRepoToWarp(JWK, CONTRACT_TX_ID, repoInfo, pkgInfo, txId, owner);
}

// Run the main function
(async () => {
    await main();
})();
