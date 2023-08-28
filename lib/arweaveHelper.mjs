import Arweave from 'arweave';
import { getTags } from './common.mjs';

function initArweave() {
    return Arweave.init({
        host: 'arweave.net',
        port: 443,
        protocol: 'https',
    });
}

export async function arweaveUpload(jwk, zipBuffer) {
    if (!jwk) throw '[ arweave ] No jwk wallet supplied';

    const arweave = initArweave();

    const dataSize = zipBuffer.length;
    const tx = await arweave.createTransaction({ data: zipBuffer }, jwk);
    for (const tag of getTags(dataSize)) tx.addTag(tag.name, tag.value);

    await arweave.transactions.sign(tx, jwk);
    const response = await arweave.transactions.post(tx);

    console.log(response.status);

    return tx.id;
}

export async function getAddress(jwk) {
    return await initArweave().wallets.jwkToAddress(jwk);
}
