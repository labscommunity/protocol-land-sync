const fs = require('fs');
const archiver = require('archiver');
const path = require('path');

const PATH = '.';
const DOTGIT_PATH = '.git';
const FILENAME = 'repo.zip';

async function zipRepo() {
    return new Promise((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 9 } });

        const output = fs.createWriteStream(FILENAME);

        output.on('close', () => {
            console.log('Repository zipped successfully');
            resolve();
        });

        archive.on('error', (error) => {
            console.error('Error zipping repository:', error);
            reject(error);
        });

        archive.pipe(output);

        const walk = (currentPath) => {
            const items = fs.readdirSync(currentPath);

            for (const item of items) {
                const itemPath = path.join(currentPath, item);
                if (fs.statSync(itemPath).isDirectory()) walk(itemPath);
                else
                    archive.file(itemPath, {
                        name: path.relative(PATH, itemPath),
                    });
            }
        };

        walk(DOTGIT_PATH);

        archive.finalize();
    });
}

(async () => {
    await zipRepo().catch((error) => {
        console.error('Error zipping repository:', error);
        process.exit(1);
    });
})();
