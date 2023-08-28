import { WarpFactory } from 'warp-contracts';
import { getAddress } from './arweaveHelper.mjs';

const getWarp = () => WarpFactory.forMainnet();

export async function getRepos(jwk, contractTxId) {
    const address = await getAddress(jwk);
    const contract = getWarp().contract(contractTxId).connect(jwk);

    try {
        const response = await contract.viewState({
            function: 'getRepositoriesByOwner',
            payload: {
                owner: address,
            },
        });
        return response.result;
    } catch (error) {
        throw ('[ warp ] Could not retrieve repositories by owner', error);
    }
}

export async function newRepo(info) {
    console.log('Called New Repo: ', info);
}

export async function updateRepo(info) {
    console.log('Called Update Repo: ', info);
}
