import { promises as fsPromises } from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { exec } from 'child_process';

const PL_TMP_PATH = '.protocol.land';

export async function writeBufferToFile(buffer: Buffer, filename: string) {
    try {
        await fsPromises.writeFile(filename, buffer);
        console.log(`File "${filename}" written successfully.`);
    } catch (error) {
        console.error('Error writing file: ', error);
    }
}

export async function getGitTrackedFiles() {
    return new Promise<string[]>((resolve, reject) => {
        exec('git ls-files', { encoding: 'utf-8' }, (error, stdout) => {
            if (error) {
                reject(new Error('Error getting git tracked files'));
            } else {
                resolve(stdout.trim().split('\n'));
            }
        });
    });
}

export async function getGitDir() {
    return new Promise<string>((resolve, reject) => {
        exec(
            'git rev-parse --git-dir',
            { encoding: 'utf-8' },
            (error, stdout) => {
                if (error) {
                    reject(new Error('Error getting git directory'));
                } else {
                    resolve(stdout.trim());
                }
            }
        );
    });
}

export async function zipRepoJsZip(
    mainPath: string,
    zipRoot: string,
    folderToZip?: string
) {
    if (!folderToZip) folderToZip = zipRoot;

    const filesToInclude: string[] = [];

    const gitdir = await getGitDir();

    const ignoreFilesList = [path.join(gitdir, PL_TMP_PATH)];

    const walk = async (currentPath: string) => {
        const items = await fsPromises.readdir(currentPath);

        for (const item of items) {
            const itemPath = path.join(currentPath, item);

            if (
                ignoreFilesList.some((ignorePath) =>
                    itemPath.startsWith(ignorePath)
                )
            ) {
                continue;
            }

            const stats = await fsPromises.stat(itemPath);

            if (stats.isDirectory()) {
                await walk(itemPath);
            } else {
                filesToInclude.push(itemPath);
            }
        }
    };

    await walk(gitdir);

    const gitTrackedFiles = await getGitTrackedFiles();

    filesToInclude.push(...gitTrackedFiles);

    const zip = new JSZip();

    for (const file of filesToInclude) {
        const content = await fsPromises.readFile(file);
        const relativePath = `${mainPath ? mainPath + '/' : ''}${path.relative(
            zipRoot,
            file
        )}`;
        zip.file(relativePath, content);
    }

    return await zip.generateAsync({ type: 'nodebuffer' });
}
