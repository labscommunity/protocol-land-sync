import Arweave from 'arweave';
import Bundlr from '@bundlr-network/client';

export async function getAddress(jwk) {
    return await initArweave().wallets.jwkToAddress(jwk);
}

export async function uploadRepo(jwk, zipBuffer, tags) {
    try {
        // upload compressed repo using bundlr
        const bundlrTxId = await bundlrUpload(jwk, zipBuffer, tags);
        console.log('Posted Tx to Bundlr: ', bundlrTxId);
        return bundlrTxId;
    } catch (error) {
        console.log('Error uploading zipped repo with bundlr:', error);
        console.log('Trying with Arweave...');
        try {
            // bundlr failed -> try arweave instead
            const arweaveTxId = await arweaveUpload(jwk, zipBuffer, tags);
            console.log('Posted Tx to Arweave: ', arweaveTxId);
            return arweaveTxId;
        } catch (error) {
            throw ('[ plSync ] Upload to arweave failed: ', error);
        }
    }
}

function initArweave() {
    return Arweave.init({
        host: 'arweave.net',
        port: 443,
        protocol: 'https',
    });
}

async function arweaveUpload(jwk, zipBuffer, tags) {
    if (!jwk) throw '[ arweave ] No jwk wallet supplied';

    const arweave = initArweave();

    const dataSize = zipBuffer.length;
    const tx = await arweave.createTransaction({ data: zipBuffer }, jwk);
    for (const tag of tags) tx.addTag(tag.name, tag.value);

    await arweave.transactions.sign(tx, jwk);
    const response = await arweave.transactions.post(tx);

    console.log(response.status);

    return tx.id;
}

async function bundlrUpload(jwk, zipBuffer, tags, tryFunding) {
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
            try {
                const response = await bundlr.fund(price - atomicBalance);
                console.log(
                    `[ bundlr ] Successfully funded! txID: ${response.id} - amount funded: ${response.quantity}`
                );
            } catch (e) {
                throw ('[ bundlr ] Error funding node ', e);
            }
        }
    }

    try {
        const response = await bundlr.upload(zipBuffer, tags);
        console.log(
            `[ bundlr ] Data uploaded -> https://arweave.net/${response.id}`
        );
        return response.id;
    } catch (e) {
        throw ('[ bundlr ] Error uploading file ', e);
    }
}
