# Protocol Land Sync

The Protocol Land Sync package simplifies the process of syncing Git repositories with Protocol Land.

## Usage

To sync a repository with Protocol Land, you can either run it manually from your local Git repository's root folder or set up a GitHub Action if your repository is hosted on GitHub.

For both methods, **you need an Arweave wallet with some $AR** to pay for the upload.

### GitHub Actions

#### From the GitHub Webpage

1. Open the repository you want to sync to Protocol Land on github.com. Then, go into:

    Settings Tab -> Secrets and variables -> Actions -> New Repository Secret

2. Add a new secret with `WALLET` for "Name," your Arweave wallet's JWK in the "Secret" field, and click the "Add secret" button.

3. Switch to the Actions tab and click "New workflow."

4. On the "Choose a workflow" page, click "set up a workflow yourself."

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
              run: npx @protocol.land/sync
              env:
                  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
                  REPO_TITLE: ${{ github.event.repository.name }}
                  REPO_DESCRIPTION: ${{ github.event.repository.description }}
                  WALLET: ${{ secrets.WALLET }}
                # ORGANIZATION_ID: 37f219ba-df6b-40f6-89c9-a28c699967fd ## if you want to sync to an organization
                # ORGANIZATION_NAME: protocol-land ## if you want to sync to an organization

```

> [!NOTE]
> This GitHub Action **will run on every push to the 'main' branch**.
> If you want to run it manually, comment the lines after `on:` and uncomment the `workflow_dispatch:` line.
>
> You can also comment the entire `'Checkout all branches'` section if you only want to sync the main branch.

#### From Your Local Git Folder

Follow `1.` and `2.` from the previous section to set up a GitHub Secret.

3. Create a file called `protocol-land-sync.yml` in a subfolder called `.github/workflows` under your repo's root (create the folder if it doesn't exist).

4. Paste the same contents as in step `5.` in the previous section.

5. Commit and push to your remote Git repo.

### Locally (Without GitHub Action)

1. Install a node package manager (`npm` or `pnpm`) to run it locally.

2. Ensure you have a `.gitignore` for all the files you don't want synced.

3. Navigate to the root folder of your repository and create a `.env` file.
   Inside the `.env` file, include the following lines:

    ```dosini
    WALLET='YOUR_WALLET_JWK_HERE'
    REPO_TITLE='Your Repo Name Here'
    REPO_DESCRIPTION='Your Repo Description Here'
    ORGANIZATION_ID='Your Organization ID Here'
    ```

    Replace `'YOUR_WALLET_JWK_HERE'` with your Arweave wallet's JWK (JSON Web Key). 

    These environment variables (`WALLET`, `REPO_TITLE`, and `REPO_DESCRIPTION`) are crucial for setting up your repository and providing a meaningful description.


4. **(optional)** Checkout locally all the branches you want synced. The tool uploads all the branches you have checked out locally with Git.
   Run this bash command to checkout all the remote branches:

    ```bash
    default_branch=$(git branch | grep '*' | sed 's/\* //') && for abranch in $(git branch -a | grep -v HEAD | grep remotes | sed "s/remotes\/origin\///g"); do git checkout $abranch ; done && git checkout $default_branch
    ```

5. From the root directory of your repository, execute the following command based on your preferred package manager:

    ```bash
    # Using npx
    npx @protocol.land/sync

    # Or using pnpx
    pnpx @protocol.land/sync
    ```

    Choose the appropriate command corresponding to the package manager installed on your system.

6. Go to [Protocol Land's page](https://protocol.land/) and log in with the Arweave wallet you used to sync your repo.
