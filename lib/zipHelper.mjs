import fs from 'fs';
import archiver from 'archiver';
import path from 'path';

function writeBufferToFile(buffer, filename) {
    try {
        fs.writeFileSync(filename, buffer);
        console.log(`File "${filename}" written successfully.`);
    } catch (error) {
        console.error('Error writing file: ', error);
    }
}

function loadIgnoreList(rootPath) {
    const gitignorePath = path.join(rootPath, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
        return gitignoreContent
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('#'));
    }
    return [];
}

export async function zipRepo(zipRoot, zipFolder, hasGitignore) {
    if (!zipFolder) zipFolder = zipRoot;

    const ignoreSet = new Set(hasGitignore ? loadIgnoreList(zipRoot) : []);

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

                if (ignoreSet.has(item)) {
                    continue;
                }

                if (fs.statSync(itemPath).isDirectory()) walk(itemPath);
                else
                    archive.file(itemPath, {
                        name: path.relative(zipRoot, itemPath),
                    });
            }
        };

        walk(zipFolder);

        archive.finalize();
    });
}