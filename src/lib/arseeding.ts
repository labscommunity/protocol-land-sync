import { ArweaveSigner, getTokenTagByEver } from 'arseeding-js';
import { createAndSubmitItem } from 'arseeding-js/cjs/submitOrder';
import { payOrder } from 'arseeding-js/cjs/payOrder';
import { Config } from 'arseeding-js/cjs/types';
import { Tag } from 'arweave/node/lib/transaction';
import { getWallet, initArweave } from './common';
import Everpay, { ChainType } from 'everpay';

const newEverpayByRSA = (arJWK: any, arAddress: string): Everpay => {
    const everpay = new Everpay({
        account: arAddress,
        chainType: 'arweave' as ChainType,
        arJWK: arJWK,
    });
    return everpay;
};

function getSigner() {
    const wallet = getWallet();
    const signer = new ArweaveSigner(wallet);
    return signer;
}

async function paymentSigner() {
    const wallet = getWallet();
    const arAddress = await initArweave().wallets.jwkToAddress(wallet);
    const signer = newEverpayByRSA(wallet, arAddress);
    return signer;
}

async function getSupportedTokens() {
    try {
        const info = await new Everpay().info();
        const supportedTokens = info.tokenList
            .filter((token) => token.chainType.includes('arweave'))
            .map((token) => token.symbol.toLowerCase());
        return supportedTokens;
    } catch (err) {}

    return ['xyz', 'ardrive', 'pia', 'vrt', 'u', 'stamp'];
}

export async function arseedingUpload(zipBuffer: Buffer, tags: Tag[]) {
    try {
        const signer = getSigner();

        const options = { tags };
        const arseedUrl = 'https://arseed.web3infra.dev';
        const tokenSymbol = process.env.ARSEEDING_TOKEN_SYMBOL ?? 'AR';
        const supportedTokens = await getSupportedTokens();
        if (!supportedTokens.includes(tokenSymbol.toLowerCase())) {
            throw new Error(
                `[ arseeding ] Arseeding Token ${tokenSymbol} not supported currently.`
            );
        }
        const tokenTags = await getTokenTagByEver(tokenSymbol);
        const config: Config = {
            signer,
            path: '',
            arseedUrl,
            tag: tokenTags[0]!,
        };

        const order = await createAndSubmitItem(zipBuffer, options, config);

        const paySigner = await paymentSigner();
        // @ts-ignore
        const everHash = await payOrder(paySigner, order);

        if (!everHash || !everHash.startsWith('0x')) {
            throw new Error(
                `[ arseeding ] Posting repo with ArSeeding failed. ${everHash}`
            );
        }

        return order.itemId as string;
    } catch (error: any) {
        if ((error?.message || '').includes('[ arseeding ]')) {
            throw error;
        }
        throw new Error(
            `[ arseeding ] Posting repo with ArSeeding failed. ${error}`
        );
    }
}
