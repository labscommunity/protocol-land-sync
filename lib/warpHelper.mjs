import { WarpFactory } from 'warp-contracts';
import { v4 as uuidv4 } from 'uuid';
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

export function postRepoToWarp(
    jwk,
    contractTxId,
    repoInfo,
    pkgInfo,
    txId,
    owner
) {
    if (!repoInfo) {
        newRepo(jwk, contractTxId, {
            title: pkgInfo.name,
            description: pkgInfo.description,
            dataTxId: txId,
            owner,
        });
    } else {
        updateRepo(jwk, contractTxId, {
            id: repoInfo.id,
            title: pkgInfo.name,
            description: pkgInfo.description,
            dataTxId: txId,
            owner,
        });
    }
}

async function newRepo(jwk, contractTxId, info) {
    if (!info || !info.title || !info.dataTxId)
        throw ('[ warp ] Invalid info for new repo: ', info);

    const { title, description, dataTxId } = info;

    const contract = getWarp().contract(contractTxId).connect(jwk);

    const uuid = uuidv4();

    const payload = { id: uuid, name: title, description, dataTxId };

    try {
        console.log('[ warp ] Trying to initialize new repo: ', payload);
        await contract.writeInteraction({
            function: 'initialize',
            payload,
        });

        return { id: uuid };
    } catch (error) {
        throw ('[ warp ] Could not initialiaze new repo: ', error);
    }
}

async function updateRepo(jwk, contractTxId, info) {
    if (!info || !info.id || !info.title || !info.dataTxId)
        throw ('[ warp ] Invalid info for new repo: ', info);

    const { id, title, description, dataTxId } = info;

    const contract = getWarp().contract(contractTxId).connect(jwk);

    const payload = { id: info.id, name: title, description, dataTxId };
    try {
        console.log('[ warp ] Trying to update repo: ', payload);
        await contract.writeInteraction({
            function: 'updateRepositoryTxId',
            payload,
        });

        return { id: uuid };
    } catch (error) {
        throw ('[ warp ] Could not update new repo: ', error);
    }
}
