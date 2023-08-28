import fs from 'fs';
import archiver from 'archiver';
import path from 'path';

export async function zipRepo(zipRoot, zipFolder) {
    if (!zipFolder) zipFolder = zipRoot;

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
