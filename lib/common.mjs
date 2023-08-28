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
