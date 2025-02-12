import Arweave from 'arweave';
import { getAddress } from './arweaveHelper';
import { Tag } from 'arweave/node/lib/transaction';

// get info from secrets/env variables
import { config } from 'dotenv';
config();

const DESCRIPTION_PLACEHOLDER = 'Decentralized repo description';
export const AOS_PROCESS_ID = 'yJZ3_Yrc-qYRt1zHmY7YeNvpmQwuqyK3dT0-gxWftew';

const isJwk = (obj: any): boolean => {
    if (typeof obj !== 'object') return false;
    const requiredKeys = ['n', 'e', 'd', 'p', 'q', 'dp', 'dq', 'qi'];
    return requiredKeys.every((key) => key in obj);
};

export const getWallet = () => {
    let wallet;
    try {
        wallet = JSON.parse(process.env.WALLET as string);
    } catch (err) {}

    if (isJwk(wallet)) {
        return wallet;
    }
    throw new Error('Arweave wallet key not found or invalid');
};

export const getTitle = () => process.env.REPO_TITLE as string;

export const getDescription = () =>
    process.env.REPO_DESCRIPTION || DESCRIPTION_PLACEHOLDER;

export const getOrganizationId = () => process.env.ORGANIZATION_ID as string;

export const getImportTokenProcessId = () => process.env.IMPORT_TOKEN_PROCESS_ID as string;

export const getTokenize = () => process.env.TOKENIZE as string;

export const initArweave = () =>
    new Arweave({
        host: 'ar-io.net',
        port: 443,
        protocol: 'https',
    });

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
