import { getAddress } from './arweaveHelper';
import { Tag } from 'arweave/node/lib/transaction';

// get info from secrets/env variables
import { config } from 'dotenv';
config();

const DESCRIPTION_PLACEHOLDER = 'Decentralized repo description';

export const getWallet = () => JSON.parse(process.env.WALLET as string);

export const getWarpContractTxId = () =>
    'w5ZU15Y2cLzZlu3jewauIlnzbKw-OAxbN9G5TbuuiDQ';

export const getTitle = () => process.env.REPO_TITLE as string;

export const getDescription = () =>
    process.env.REPO_DESCRIPTION
        ? process.env.REPO_DESCRIPTION
        : DESCRIPTION_PLACEHOLDER;

export async function getTags(createNewRepo: boolean) {
    return [
        { name: 'App-Name', value: 'Protocol.Land' },
        { name: 'Content-Type', value: 'application/zip' },
        { name: 'Creator', value: await getAddress() },
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

export const exitWithError = (message: string) => {
    console.error(`\n${message}\n`);
    process.exit(1);
};
