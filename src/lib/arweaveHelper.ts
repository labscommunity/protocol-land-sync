import Arweave from 'arweave';
import Bundlr from '@bundlr-network/client';
import { getWallet } from './common';
import { Tag } from 'arweave/node/lib/transaction';

const jwk = getWallet();

export async function getAddress() {
    return await initArweave().wallets.jwkToAddress(getWallet());
}

export async function uploadRepo(zipBuffer: Buffer, tags: Tag[]) {
    try {
        // upload compressed repo using bundlr
        const bundlrTxId = await bundlrUpload(zipBuffer, tags);
        console.log('Posted Tx to Bundlr: ', bundlrTxId);
        return bundlrTxId;
    } catch (error) {
        console.log('Error uploading using bundlr, trying with Arweave...');
        // let Arweave throw if it encounters errors
        const arweaveTxId = await arweaveUpload(zipBuffer, tags);
        console.log('Posted Tx to Arweave: ', arweaveTxId);
        return arweaveTxId;
    }
}

function initArweave() {
    return Arweave.init({
        host: 'arweave.net',
        port: 443,
        protocol: 'https',
    });
}

async function arweaveUpload(zipBuffer: Buffer, tags: Tag[]) {
    if (!jwk) throw '[ arweave ] No jwk wallet supplied';

    const arweave = initArweave();

    const dataSize = zipBuffer.length;
    const tx = await arweave.createTransaction({ data: zipBuffer }, jwk);
    for (const tag of tags) tx.addTag(tag.name, tag.value);

    await arweave.transactions.sign(tx, jwk);
    const response = await arweave.transactions.post(tx);

    console.log(`${response.status} - ${response.statusText}`);

    if (response.status !== 200) {
        // throw error if arweave tx wasn't posted
        throw `[ arweave ] Posting repo to arweave failed.\n\tError: '${
            response.status
        }' - '${
            response.statusText
        }'\n\tCheck if you have plenty $AR to upload ~${Math.ceil(
            dataSize / 1024
        )} KB of data.`;
    }

    return tx.id;
}

async function bundlrUpload(
    zipBuffer: Buffer,
    tags: Tag[],
    tryFunding?: boolean
) {
    if (!jwk) throw '[ bundlr ] No jwk wallet supplied';

    const bundlr = new Bundlr('http://node1.bundlr.network', 'arweave', jwk);
    await bundlr.ready();

    console.log(`[ bundlr ] Using wallet: ${bundlr.address}`);

    const atomicBalance = await bundlr.getLoadedBalance();
    // const convertedBalance = bundlr.utils.fromAtomic(atomicBalance);
    console.log(`[ bundlr ] wallet balance in bundlr node: ${atomicBalance}`);

    if (tryFunding) {
        const dataSize = zipBuffer.length;
        const price = await bundlr.getPrice(dataSize);
        console.log(`[ bundlr ] price to store ${dataSize} bytes: ${price}`);

        if (price > atomicBalance) {
            // let bundlr throw error if it cannot fund
            const response = await bundlr.fund(price.minus(atomicBalance));
            console.log(
                `[ bundlr ] Successfully funded! txID: ${response.id} - amount funded: ${response.quantity}`
            );
        }
    }

    // let bundlr throw error if it cannot fund
    const response = await bundlr.upload(zipBuffer, { tags });
    console.log(
        `[ bundlr ] Data uploaded -> https://arweave.net/${response.id}`
    );
    return response.id;
}
