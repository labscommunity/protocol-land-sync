import fs from 'fs';
import path from 'path';
import util from 'util';

export function getTags(owner, title, description, existingRepoInfo) {
    return [
        { name: 'App-Name', value: 'Protocol.Land' },
        { name: 'Content-Type', value: 'application/zip' },
        { name: 'Creator', value: owner },
        { name: 'Title', value: title },
        { name: 'Description', value: description },
        {
            name: 'Type',
            value:
                !existingRepoInfo || !existingRepoInfo.id
                    ? 'repo-create'
                    : 'repo-update',
        },
    ];
}

export async function removeCacheFolder() {
    const readdir = util.promisify(fs.readdir);
    const rmdir = util.promisify(fs.rmdir);
    const unlink = util.promisify(fs.unlink);
    const stat = util.promisify(fs.stat);

    async function removeFolderAndContents(folderPath) {
        try {
            const entries = await readdir(folderPath);

            for (const entry of entries) {
                const entryPath = path.join(folderPath, entry);
                const entryStat = await stat(entryPath);

                if (entryStat.isDirectory()) {
                    await removeFolderAndContents(entryPath);
                } else {
                    await unlink(entryPath);
                }
            }

            await rmdir(folderPath);
            console.log(`Folder "${folderPath}" and its contents removed.`);
        } catch (error) {
            console.error('Error removing folder and contents:', error);
        }
    }

    // Check if "cache" folder exists
    const __dirname = '.';
    const cacheFolderPath = path.join(__dirname, 'cache'); // Adjust the path if needed
    fs.stat(cacheFolderPath, async (err, stats) => {
        if (!err) {
            // "cache" folder exists, remove it and its contents
            await removeFolderAndContents(cacheFolderPath);
        }
    });
}
