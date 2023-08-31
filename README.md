# Protocol Land Sync

Package to sync git repos into Protocol Land

## Usage

### Github Actions

1. Open the github repo you want to sync to Protocol Land and add a new secret
   (Repo -> Settings -> Secrets and variables -> Actions -> New Repository Secret)

2. Fill in `WALLET` for "Name", your Arweave wallet's JWK in the "Secret" field and then click on the "Add secret" button.
3. Switch into the Actions tab and click "New workflow"
4. On the "Choose a workflow" page, click on "set up a workflow yourself"
5. Paste this into the `.yml` file:

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
            - uses: actions/checkout@v3
            - uses: actions/setup-node@v3
              with:
                  node-version: 18.x

            - run: npx @7i7o/pl-sync
              env:
                  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
                  REPO_TITLE: ${{ github.event.repository.name }}
                  REPO_DESCRIPTION: ${{ github.event.repository.description }}
                  WALLET: ${{ secrets.WALLET }}
```

> **NOTE**: Notice that this GH Action will run on every push to the 'main' branch. If you read the comments on the `.yml` code, you can change it to be run manually by commenting the 3 lines after the `on:` and uncommenting the `workflow_dispatch:` line.

### Locally

1. You need a node package manager installed (`npm`, `yarn` or `pnpm`) to run it locally.

2. Set up a `.env` file in the root folder with `WALLET='YOUR_WALLET_JWK_HERE'` and paste your Arweave wallet's JWK in there

3. From the root folder of your repo, run Run `npx @7i7o/pl-sync`, `yarn @7i7o/pl-sync` or `pnpx @7i7o/pl-sync` depending on which package manager you have installed.

4. Go into [Protocol Land's page](https://protocol-land.vercel.app/) and login with your Arweave wallet.
