import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

export function writeBufferToFile(buffer, filename) {
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

export async function zipRepoJsZip(mainPath, zipRoot, zipFolder, hasGitignore) {
    if (!zipFolder) zipFolder = zipRoot;

    const ignoreSet = new Set(hasGitignore ? loadIgnoreList(zipRoot) : []);

    const zip = new JSZip();

    const filesToInclude = [];

    const walk = (currentPath) => {
        const items = fs.readdirSync(currentPath);

        for (const item of items) {
            const itemPath = path.join(currentPath, item);

            if (ignoreSet.has(item)) {
                continue;
            }

            if (fs.statSync(itemPath).isDirectory()) {
                walk(itemPath);
            } else {
                filesToInclude.push(itemPath);
            }
        }
    };
    walk(zipFolder);

    for (const file of filesToInclude) {
        const content = fs.readFileSync(file);
        const relativePath = `${mainPath ? mainPath + '/' : ''}${path.relative(
            zipRoot,
            file
        )}`;
        zip.file(relativePath, content);
    }

    return await zip.generateAsync({ type: 'nodebuffer' });
}
