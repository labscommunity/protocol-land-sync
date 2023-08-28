import Bundlr from '@bundlr-network/client';
import { getTags } from './common.mjs';

export async function bundlrUpload(jwk, zipBuffer, tryFunding) {
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
        const response = await bundlr.upload(
            zipBuffer,
            getTags(zipBuffer.length)
        );
        console.log(
            `[ bundlr ] Data uploaded -> https://arweave.net/${response.id}`
        );
        return response.id;
    } catch (e) {
        throw ('[ bundlr ] Error uploading file ', e);
    }
}
