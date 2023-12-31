#!/usr/bin/env node

import { zipRepoJsZip } from './lib/zipHelper';
import { uploadRepo } from './lib/arweaveHelper';
import { getRepos, postRepoToWarp } from './lib/warpHelper';
import { exitWithError, getTags, getTitle } from './lib/common';
import { v4 as uuidv4 } from 'uuid';
import { encryptRepo } from './lib/privateRepo';

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

    // get existing repos for this wallet
    const repos = await getRepos();

    // check if repo already exists
    let repoInfo = repos.find(
        (r) => r.name.toLowerCase() === title.toLowerCase()
    );

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
            zipBuffer = await encryptRepo(zipBuffer, privateStateTxId);
        }

        const dataTxId = await uploadRepo(zipBuffer, tags);

        if (dataTxId) await postRepoToWarp(dataTxId, repoId, repoInfo);
    } catch (error) {
        exitWithError(error as string);
    }
}

// Run the main function
(async () => {
    await main();
})();
