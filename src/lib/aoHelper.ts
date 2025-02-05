import {
    AOS_PROCESS_ID,
    getDescription,
    getImportTokenProcessId,
    getOrganizationId,
    getTitle,
    getTokenize,
    getWallet,
    waitFor,
} from './common';
import {
    createDataItemSigner,
    dryrun,
    message,
    result,
    spawn,
} from '@permaweb/aoconnect';
import type { Tag } from 'arweave/node/lib/transaction';
import { getAddress, pollForTxBeingAvailable } from './arweaveHelper';
import { trackAmplitudeAnalyticsEvent } from './analytics';

const title = getTitle();
const description = getDescription();

type SendMessageArgs = {
    data?: string;
    tags: {
        name: string;
        value: string;
    }[];
    anchor?: string;
};

function capitalizeFirstLetter(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getTags(payload: { [key: string]: string }): Tag[] {
    return Object.entries(payload).map(
        ([key, value]) => ({ name: capitalizeFirstLetter(key), value } as Tag)
    );
}

export function extractMessage(text: string) {
    const regex = /:\s*([^:!]+)!/;
    const match = text.match(regex);
    return match ? match[1]!.trim() : text;
}

async function sendMessage({ tags, data }: SendMessageArgs) {
    const args = {
        process: AOS_PROCESS_ID,
        tags,
        signer: createDataItemSigner(getWallet()),
    } as any;

    if (data) args.data = data;

    const messageId = await message(args);

    const { Output } = await result({
        message: messageId,
        process: AOS_PROCESS_ID,
    });

    if (Output?.data?.output) {
        throw new Error(extractMessage(Output?.data?.output));
    }

    return messageId;
}

export async function getRepo(name: string) {
    const address = await getAddress();

    const { Messages } = await dryrun({
        process: AOS_PROCESS_ID,
        tags: getTags({
            Action: 'Get-Repo-By-Name-Owner',
            'Repo-Name': name,
            'Owner-Address': address,
            Fields: JSON.stringify([
                'id',
                'name',
                'private',
                'privateStateTxId',
            ]),
        }),
    });

    if (Messages.length === 0) return undefined;

    return JSON.parse(Messages[0].Data)?.result as {
        id: string;
        name: string;
        private: boolean;
        privateStateTxId: string;
    };
}

export async function postRepo(
    dataTxId: string,
    repoId: string,
    repoInfo?: { id: string } | undefined
) {
    if (repoInfo) {
        try {
            const result = await updateRepo(repoInfo.id, dataTxId);
            await trackAmplitudeAnalyticsEvent(
                'Repository',
                'Add files to repo',
                'Add files',
                {
                    repo_name: title,
                    repo_id: result.id,
                    result: 'SUCCESS',
                }
            );
            return result;
        } catch (error) {
            await trackAmplitudeAnalyticsEvent(
                'Repository',
                'Add files to repo',
                'Add files',
                {
                    repo_name: title,
                    repo_id: repoInfo.id,
                    result: 'FAILED',
                    error: 'Failed to update repository',
                }
            );
            throw error;
        }
    } else {
        try {
            let tokenProcessId = getImportTokenProcessId();
            let isTokenImport = true;

            if (!tokenProcessId) {
                tokenProcessId = await spawnTokenProcess(title);
                isTokenImport = false;
            }

            if (!tokenProcessId) throw '[ AO ] Failed to spawn token process';
            const result = await newRepo(
                repoId,
                dataTxId,
                tokenProcessId,
                isTokenImport
            );
            await trackAmplitudeAnalyticsEvent(
                'Repository',
                'Successfully created a repo',
                'Create new repo',
                {
                    repo_id: result.id,
                    repo_name: title,
                }
            );
            return result;
        } catch (error) {
            await trackAmplitudeAnalyticsEvent(
                'Repository',
                'Failed to create a new repo',
                'Create new repo'
            );
            throw error;
        }
    }
}

async function newRepo(
    repoId: string,
    dataTxId: string,
    tokenProcessId: string,
    isTokenImport: boolean
) {
    if (!title || !dataTxId || !tokenProcessId)
        throw '[ AO ] No title or dataTx or tokenProcessId for new repo';

    const uploadStrategy =
        process.env.STRATEGY === 'ARSEEDING' ? 'ARSEEDING' : 'DEFAULT';
    const organizationId = getOrganizationId();
    const tokenize = getTokenize();

    await waitFor(500);

    const tags: Record<string, string> = {
        Action: 'Initialize-Repo',
        Id: repoId,
        Name: title,
        Description: description,
        'Data-TxId': dataTxId,
        'Upload-Strategy': uploadStrategy,
        'Token-Process-Id': tokenProcessId,
    };

    if (isTokenImport) {
        tags['Token-Type'] = 'IMPORT';
    }

    if (organizationId) {
        tags['OrgId'] = organizationId;
        tags['Creator'] = 'ORGANIZATION';
    }

    if (tokenize === 'true') {
        tags['Tokenize'] = 'true';
    }

    await sendMessage({
        tags: getTags(tags),
    });

    console.log(`[ AO ] Repo '${title}' initialized with id '${repoId}'`);

    return { id: repoId };
}

async function updateRepo(id: string, dataTxId: string) {
    if (!id || !title || !dataTxId)
        throw '[ AO ] No id, title or dataTxId to update repo ';

    const uploadStrategy =
        process.env.STRATEGY === 'ARSEEDING' ? 'ARSEEDING' : 'DEFAULT';

    await waitFor(500);

    await sendMessage({
        tags: getTags({
            Action: 'Update-Repo-TxId',
            Id: id,
            'Data-TxId': dataTxId,
            'Upload-Strategy': uploadStrategy,
        }),
    });

    console.log(`[ AO ] Repo '${title}' with id '${id}' updated`);

    return { id };
}

async function spawnTokenProcess(repoName: string) {
    const aosDetails = await getAosDetails();
    const tags = [
        { name: 'App-Name', value: 'aos' },
        {
            name: 'Name',
            value: repoName + ' Repo Token' || 'Protocol.Land Repo Token',
        },
        { name: 'Process-Type', value: 'token' },
        { name: 'aos-Version', value: aosDetails.version },
        {
            name: 'Authority',
            value: 'fcoN_xJeisVsPXA-trzVAuIiqO3ydLQxM-L4XbrQKzY',
        },
    ] as Tag[];

    const pid = await spawn({
        module: aosDetails.module,
        tags,
        scheduler: aosDetails.scheduler,
        data: '1984',
        signer: createDataItemSigner(getWallet()),
    });

    await pollForTxBeingAvailable({ txId: pid });

    return pid;
}

async function getAosDetails() {
    const defaultDetails = {
        version: '1.10.22',
        module: 'SBNb1qPQ1TDwpD_mboxm2YllmMLXpWw4U8P9Ff8W9vk',
        scheduler: '_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA',
    };

    try {
        const response = await fetch(
            'https://raw.githubusercontent.com/permaweb/aos/main/package.json'
        );
        const pkg = (await response.json()) as {
            version: string;
            aos: { module: string };
        };
        const details = {
            version: pkg?.version || defaultDetails.version,
            module: pkg?.aos?.module || defaultDetails.module,
            scheduler: defaultDetails.scheduler,
        };
        return details;
    } catch {
        return defaultDetails;
    }
}
