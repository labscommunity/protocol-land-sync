import * as fs from 'fs';
import * as archiver from 'archiver';
import * as path from 'path';

const PATH = '.';
const FILENAME = 'repo.zip';

function loadIgnoreList(): string[] {
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

    return new Promise<Buffer>((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 9 } });

        const chunks: Buffer[] = [];

        archive.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
        });

        archive.on('end', () => {
            const zipBuffer = Buffer.concat(chunks);
            console.log('Repository zipped successfully');
            resolve(zipBuffer);
        });

        archive.on('error', (error: Error) => {
            console.error('Error zipping repository:', error);
            reject(error);
        });

        // glob has options to ignore files
        archive.glob(`{.,}**/{.,}*`, {
            cwd: PATH,
            ignore: ignoreList,
            skip: ignoreList,
        });
        archive.finalize();
    });
}

(async () => {
    const zipBuffer = await zipRepo().catch((error) => {
        process.exit(1);
    });

    fs.writeFile(FILENAME, zipBuffer, (error) => {
        if (error) {
            console.error('Error writing zip buffer to file:', error);
            process.exit(1);
        } else {
            console.log('Zip buffer written to repo.zip');
        }
    });
})();
