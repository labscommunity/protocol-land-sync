import crypto from 'crypto';
import { getActivePublicKey } from './arweaveHelper';
import { getWallet, initArweave } from './common';
import { isCryptoKey } from 'util/types';

type PrivateState = {
    iv: string;
    encKeys: Record<string, string>;
    version: string;
    pubKeys: string[];
};

const arweave = initArweave();

async function deriveAddress(publicKey: string) {
    const pubKeyBuf = arweave.utils.b64UrlToBuffer(publicKey);
    const sha512DigestBuf = await crypto.subtle.digest('SHA-512', pubKeyBuf);

    return arweave.utils.bufferTob64Url(new Uint8Array(sha512DigestBuf));
}

async function encryptDataWithExistingKey(
    file: ArrayBuffer,
    aesKey: any,
    iv: Uint8Array
) {
    let key = aesKey;

    if (!isCryptoKey(aesKey)) {
        key = await crypto.subtle.importKey(
            'raw',
            aesKey,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt']
        );
    }

    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        file
    );

    return encrypted;
}

async function decryptAesKeyWithPrivateKey(encryptedAesKey: Uint8Array) {
    const privateKey = getWallet();
    const key = await crypto.subtle.importKey(
        'jwk',
        privateKey,
        {
            name: 'RSA-OAEP',
            hash: 'SHA-256',
        },
        false,
        ['decrypt']
    );

    const options = {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
    };

    const decryptedAesKey = await crypto.subtle.decrypt(
        options,
        key,
        encryptedAesKey
    );

    return new Uint8Array(decryptedAesKey);
}

export async function encryptRepo(
    repoArrayBuf: ArrayBuffer,
    privateStateTxId: string
) {
    const pubKey = getActivePublicKey();
    const address = await deriveAddress(pubKey);

    const response = await fetch(`https://arweave.net/${privateStateTxId}`);
    const privateState = (await response.json()) as PrivateState;

    const encAesKeyStr = privateState.encKeys[address]!;
    const encAesKeyBuf = arweave.utils.b64UrlToBuffer(encAesKeyStr);

    const aesKey = (await decryptAesKeyWithPrivateKey(
        encAesKeyBuf
    )) as unknown as ArrayBuffer;
    const ivArrBuff = arweave.utils.b64UrlToBuffer(privateState.iv);

    const encryptedRepo = await encryptDataWithExistingKey(
        repoArrayBuf,
        aesKey,
        ivArrBuff
    );

    return Buffer.from(encryptedRepo);
}
