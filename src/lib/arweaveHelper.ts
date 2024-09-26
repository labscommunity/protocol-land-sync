import { getWallet, initArweave } from './common';
import { Tag } from 'arweave/node/lib/transaction';
import { ArweaveSigner, bundleAndSignData, createData } from 'arbundles';
import { arseedingUpload } from './arseeding';

const jwk = getWallet();

export async function getAddress() {
    return await initArweave().wallets.jwkToAddress(getWallet());
}

export function getActivePublicKey() {
    const wallet = getWallet();
    return wallet.n;
}

export async function uploadRepo(zipBuffer: Buffer, tags: Tag[]) {
    const arweaveTxId = await arweaveUpload(zipBuffer, tags);
    console.log('Posted Tx to Arweave: ', arweaveTxId);
    return arweaveTxId;
}

async function arweaveUpload(zipBuffer: Buffer, tags: Tag[]) {
    if (!jwk) throw '[ arweave ] No jwk wallet supplied';

    const arweave = initArweave();

    const dataSize = zipBuffer.length;
    const tx = await arweave.createTransaction({ data: zipBuffer }, jwk);
    for (const tag of tags) tx.addTag(tag.name, tag.value);

    await arweave.transactions.sign(tx, jwk);

    let uploader = await arweave.transactions.getUploader(tx);

    while (!uploader.isComplete) {
        await uploader.uploadChunk();
        console.log(
            `${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`
        );
    }

    if (!uploader.isComplete) {
        // throw error if arweave tx wasn't posted
        throw `[ arweave ] Posting repo to arweave failed.\n\tError: '${
            uploader.lastResponseStatus
        }' - '${
            uploader.lastResponseError
        }'\n\tCheck if you have plenty $AR to upload ~${Math.ceil(
            dataSize / 1024
        )} KB of data.`;
    }

    return tx.id;
}

export async function turboUpload(zipBuffer: Buffer, tags: Tag[]) {
    if (!jwk) throw '[ turbo ] No jwk wallet supplied';

    // Testing upload with arbundles
    const node = 'https://turbo.ardrive.io';
    const uint8ArrayZip = new Uint8Array(zipBuffer);
    const signer = new ArweaveSigner(getWallet());

    const dataItem = createData(uint8ArrayZip, signer, { tags });

    await dataItem.sign(signer);

    const res = await fetch(`${node}/tx`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
        },
        body: dataItem.getRaw(),
    });

    if (res.status >= 400)
        throw new Error(
            `[ turbo ] Posting repo with turbo failed. Error: ${res.status} - ${res.statusText}`
        );

    return dataItem.id;
}
