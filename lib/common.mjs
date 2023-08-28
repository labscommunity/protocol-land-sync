export function getTags(size) {
    return [
        { name: 'Content-Type', value: 'application/zip' },
        { name: 'File-Name', value: 'repo.zip' },
        { name: 'File-Size', value: `${size}` },
        { name: 'App-Name', value: 'protocol-land' },
    ];
}
