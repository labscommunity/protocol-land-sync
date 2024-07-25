#!/usr/bin/env node

import { v4 as uuidv4 } from 'uuid';
import { zipRepoJsZip } from './lib/zipHelper';
import { uploadRepo } from './lib/arweaveHelper';
import { getRepo, postRepo } from './lib/aoHelper';
import { exitWithError, getTags, getTitle } from './lib/common';

// Set up constants
const PATH = '.';
// const FOLDER_TO_ZIP = '.git'; // Only compress `.git` folder
const FOLDER_TO_ZIP = '.'; // Compress the full repo

// Set up a regex for repo names compliance
const NAME_REGEX = /^[a-zA-Z0-9._-]+$/;
const title = getTitle();

async function main() {
    // check name complies with name rules
    if (!NAME_REGEX.test(title))
        exitWithError(
            `[ PL Sync ] Repo name can ONLY contain ASCII letters, digits and the characters '.', '-', and '_'`
        );

    console.log(`[ PL Sync ] Starting sync for repo '${title}'`);

    // get existing repo for this title & wallet
    const repoInfo = await getRepo(title);

    const repoId = repoInfo?.id || uuidv4();

    // compress the repo
    let zipBuffer;
    try {
        zipBuffer = await zipRepoJsZip(repoId, PATH, FOLDER_TO_ZIP);
    } catch (error) {
        console.error('Error zipping repository:', error);
        process.exit(1);
    }

    const tags = await getTags(!repoInfo ? true : false);

    try {
        const isPrivate = repoInfo?.private || false;
        const privateStateTxId = repoInfo?.privateStateTxId;

        if (isPrivate && privateStateTxId) {
            throw new Error('Private repos are not supported.');
        }

        const dataTxId = await uploadRepo(zipBuffer, tags);

        if (dataTxId) await postRepo(dataTxId, repoId, repoInfo);
    } catch (error) {
        exitWithError(error as string);
    }
}

// Run the main function
(async () => {
    await main();
})();
