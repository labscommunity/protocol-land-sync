import {
    AOS_PROCESS_ID,
    getDescription,
    getTitle,
    getWallet,
    waitFor,
} from './common';
import {
    createDataItemSigner,
    dryrun,
    message,
    result,
} from '@permaweb/aoconnect';
import type { Tag } from 'arweave/node/lib/transaction';
import { getAddress } from './arweaveHelper';
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
            Action: 'Get-Repository-By-Name-Owner',
            RepoName: name,
            OwnerAddress: address,
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
            const result = await newRepo(repoId, dataTxId);
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

async function newRepo(repoId: string, dataTxId: string) {
    if (!title || !dataTxId) throw '[ AO ] No title or dataTx for new repo';

    const uploadStrategy =
        process.env.STRATEGY === 'ARSEEDING' ? 'ARSEEDING' : 'DEFAULT';

    await waitFor(500);

    await sendMessage({
        tags: getTags({
            Action: 'Initialize-Repository',
            id: repoId,
            name: title,
            description,
            dataTxId,
            uploadStrategy,
        }),
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
            Action: 'Update-Repository-TxId',
            id,
            dataTxId,
            uploadStrategy,
        }),
    });

    console.log(`[ AO ] Repo '${title}' with id '${id}' updated`);

    return { id };
}
