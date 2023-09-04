# Protocol Land Sync

Package to sync git repos into Protocol Land

## Usage

To sync a repo into Protocol Land you can either run it manually from your local git repo's root folder, or you can set up a Github Action if you have it hosted in Github.

For both methods, **you need an Arweave wallet with some $AR** to pay for the upload, unless your repo uses less than 100KB of data.

### Github Actions

#### From the Github webpage

1. In github.com, open the repo you want to sync to Protocol Land and add a new secret
   (Repo -> Settings -> Secrets and variables -> Actions -> New Repository Secret)

2. Fill in `WALLET` for "Name", your Arweave wallet's JWK in the "Secret" field and then click on the "Add secret" button.

3. Switch into the Actions tab and click "New workflow"

4. On the "Choose a workflow" page, click on "set up a workflow yourself"

5. Paste this into the `.yml` file and commit the changes:

```yaml
name: Protocol Land Sync
on:
    # Run with every push to 'main' branch:
    push:
        branches:
            - 'main'
    # Run Manually:
    #workflow_dispatch:

jobs:
    build:
        runs-on: ubuntu-latest
        steps:
            - name: 'Checkout repo (default branch)'
              uses: actions/checkout@v3
              with:
                  # fetch all history for all branches:
                  fetch-depth: 0
            - name: 'Checkout all branches'
              run: |
                  default_branch=$(git branch | grep '*' | sed 's/\* //')
                  for abranch in $(git branch -a | grep -v HEAD | grep remotes | sed "s/remotes\/origin\///g"); do git checkout $abranch ; done
                  git checkout $default_branch
                  git branch -a
            - name: 'Setup node 18'
              uses: actions/setup-node@v3
              with:
                  node-version: 18.x
            - name: 'Sync repo to Protocol Land'
              run: npx @7i7o/pl-sync
              env:
                  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
                  REPO_TITLE: ${{ github.event.repository.name }}
                  REPO_DESCRIPTION: ${{ github.event.repository.description }}
                  WALLET: ${{ secrets.WALLET }}
```

> **NOTE**: Notice that this GH Action **will run on every push to the 'main' branch**.
> If you read the comments on the `.yml` code, you can change it to be run manually by commenting the 3 lines after the `on:` and uncommenting the `workflow_dispatch:` line.
>
> You can also comment the whole `'Checkout all branches'` section if you only want to sync the main branch.

#### From your local git folder

Follow `1.` and `2.` from the previous section to set up a Github Secret

3. Create a file called `pl-sync.yml` in a subfolder called `.github/workflows` under your repo's root (create the folder if it doesn't exist).

4. Paste the same contents as in the step `5.` in the previous section.

5. Commit and push to your remote git repo.

### Locally (without Github Action)

1. You need a node package manager installed (`npm`, `yarn` or `pnpm`) to run it locally.

2. Make sure you have a `.gitignore` for all the files you don't want synced.

3. In your repo's root foler, set up a `.env` file with `WALLET='YOUR_WALLET_JWK_HERE'` and paste your Arweave wallet's JWK in that environment variable. If your repo (compressed) is larger than 100kb, you have to fund your wallet with enough $AR to pay for the transaction.

4. **(optional)** Checkout locally all the branches you want synced. The tool uploads all the branches you have checkout locally with git.
   You can run this bash command to checkout all the remote branches:

    `default_branch=$(git branch | grep '*' | sed 's/\* //') && for abranch in $(git branch -a | grep -v HEAD | grep remotes | sed "s/remotes\/origin\///g"); do git checkout $abranch ; done && git checkout $default_branch`

5. From the root folder of your repo, run Run `npx @7i7o/pl-sync`, `yarn @7i7o/pl-sync` or `pnpx @7i7o/pl-sync` depending on which package manager you have installed.

6. Go into [Protocol Land's page](https://protocol-land.vercel.app/) and login with the Arweave wallet you used to sync your repo.
