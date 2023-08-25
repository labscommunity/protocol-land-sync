const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const PATH = '.';
const DOTGIT_PATH = '.git';
const FILENAME = 'repo.zip';

async function zipRepo() {
    const zip = new JSZip();
    const filesToInclude = [];

    const walk = (currentPath) => {
        const items = fs.readdirSync(currentPath);

        for (const item of items) {
            const itemPath = path.join(currentPath, item);
            if (fs.statSync(itemPath).isDirectory()) walk(itemPath);
            else filesToInclude.push(itemPath);
        }
    };

    walk(DOTGIT_PATH);

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
