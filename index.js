const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const PATH = '.';
const FILENAME = 'repo.zip';

function loadIgnoreList() {
    const gitignorePath = path.join(PATH, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
        return gitignoreContent
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('#'));
    }
    return [];
}

async function zipRepo() {
    const ignoreList = loadIgnoreList();
    const zip = new JSZip();

    const filesToInclude = [];
    const ignoreSet = new Set(ignoreList);

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

    walk(PATH);

    for (const file of filesToInclude) {
        const content = fs.readFileSync(file);
        const relativePath = path.relative(PATH, file);
        zip.file(relativePath, content);
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(FILENAME, zipBuffer);

    console.log('Repository zipped successfully');
}

(async () => {
    await zipRepo().catch((error) => {
        console.error('Error zipping repository:', error);
        process.exit(1);
    });
})();
