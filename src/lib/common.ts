import fs from 'fs';
import path from 'path';
import util from 'util';

// get info from secrets
import { config } from 'dotenv';
import { getAddress } from './arweaveHelper';
import { Tag } from 'arweave/node/lib/transaction';

config();

export const getWallet = () => JSON.parse(process.env.WALLET as string);

export const getWarpContractTxId = () =>
    'w5ZU15Y2cLzZlu3jewauIlnzbKw-OAxbN9G5TbuuiDQ';

export const getTitle = () => process.env.REPO_TITLE as string;

export const getDescription = () =>
    process.env.REPO_DESCRIPTION ? process.env.REPO_DESCRIPTION : '';

export function getTags(createNewRepo: boolean) {
    return [
        { name: 'App-Name', value: 'Protocol.Land' },
        { name: 'Content-Type', value: 'application/zip' },
        { name: 'Creator', value: getAddress() },
        { name: 'Title', value: getTitle() },
        { name: 'Description', value: getDescription() },
        {
            name: 'Type',
            value: createNewRepo ? 'repo-create' : 'repo-update',
        },
    ] as Tag[];
}

export const waitFor = (delay: number) =>
    new Promise((res) => setTimeout(res, delay));

/* Function to remove warp cache folder before running */
export async function removeCacheFolder() {
    const readdir = util.promisify(fs.readdir);
    const rmdir = util.promisify(fs.rmdir);
    const unlink = util.promisify(fs.unlink);
    const stat = util.promisify(fs.stat);

    async function removeFolderAndContents(folderPath: string) {
        try {
            const entries = await readdir(folderPath);

            for (const entry of entries) {
                const entryPath = path.join(folderPath, entry);
                const entryStat = await stat(entryPath);

                if (entryStat.isDirectory()) {
                    await removeFolderAndContents(entryPath);
                } else {
                    await unlink(entryPath);
                }
            }

            await rmdir(folderPath);
            console.log(`Folder "${folderPath}" and its contents removed.`);
        } catch (error) {
            console.error('Error removing folder and contents:', error);
        }
    }

    // Check if "cache" folder exists
    const __dirname = '.';
    const cacheFolderPath = path.join(__dirname, 'cache'); // Adjust the path if needed
    fs.stat(cacheFolderPath, async (err, stats) => {
        if (!err) {
            // "cache" folder exists, remove it and its contents
            await removeFolderAndContents(cacheFolderPath);
        }
    });
}
