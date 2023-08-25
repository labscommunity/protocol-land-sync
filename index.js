import fs from 'fs';
import archiver from 'archiver';
import path from 'path';

import Bundlr from '@bundlr-network/client';
import Arweave from 'arweave';

import { config } from 'dotenv';

config();

const PATH = '.';
const DOTGIT_PATH = '.git';
const FILENAME = 'repo.zip';
const JWK = JSON.parse(process.env.WALLET);

async function zipRepo() {
    return new Promise((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 9 } });

        const chunks = [];

        archive.on('data', (chunk) => {
            chunks.push(chunk);
        });

        archive.on('end', () => {
            const zipBuffer = Buffer.concat(chunks);
            console.log('Repository zipped successfully');
            resolve(zipBuffer);
        });

        archive.on('error', (error) => {
            console.error('Error zipping repository:', error);
            reject(error);
        });

        const walk = (currentPath) => {
            const items = fs.readdirSync(currentPath);

            for (const item of items) {
                const itemPath = path.join(currentPath, item);
                if (fs.statSync(itemPath).isDirectory()) walk(itemPath);
                else
                    archive.file(itemPath, {
                        name: path.relative(PATH, itemPath),
                    });
            }
        };

        walk(DOTGIT_PATH);

        archive.finalize();
    });
}

async function uploadWithBundlr(zipBuffer, tryFunding) {
    const bundlr = new Bundlr('http://node1.bundlr.network', 'arweave', JWK);
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
                console.log('[ bundlr ] Error funding node ', e);
            }
        }
    }

    try {
        const tags = getTags(zipBuffer.length);
        const response = await bundlr.upload(zipBuffer, tags);
        console.log(
            `[ bundlr ] Data uploaded -> https://arweave.net/${response.id}`
        );
        return response.id;
    } catch (e) {
        console.log('[ bundlr ] Error uploading file ', e);
    }
}

async function uploadWithArweave(zipBuffer) {
    const arweave = Arweave.init({
        host: 'arweave.net',
        port: 443,
        protocol: 'https',
    });

    const dataSize = zipBuffer.length;
    const tx = await arweave.createTransaction(zipBuffer, JWK);
    for (tag of getTags(dataSize)) tx.addTag(tag.name, tag.value);

    await arweave.transactions.sign(tx, JWK);
    const response = await arweave.transactions.post(transaction);

    console.log(response.status);

    return tx.id;
}

function getTags(size) {
    return [
        { name: 'Content-Type', value: 'application/zip' },
        { name: 'File-Name', value: 'repo.zip' },
        { name: 'File-Size', value: `${size}` },
        { name: 'App-Name', value: 'protocol-land' },
    ];
}

(async () => {
    // zip the repo (only .git folder)
    let zipBuffer;

    try {
        zipBuffer = await zipRepo();
    } catch (error) {
        console.error('Error zipping repository:', error);
        process.exit(1);
    }

    // upload zipped repo to arweave using bundlr
    try {
        const bundlrTxId = await uploadWithBundlr(zipBuffer);
        console.log('Posted Tx to Bundlr: ', bundlrTxId);
    } catch (error) {
        console.error('Error uploading zipped repo with bundlr:', error);
        console.error('Trying with Arweave...');
        try {
            const arweaveTxId = await uploadWithArweave(zipBuffer);
            console.log('Posted Tx to Arweave: ', arweaveTxId);
        } catch (error) {
            console.error('Error uploading zipped repo with arweave:', error);
            process.exit(1);
        }
    }
})();
