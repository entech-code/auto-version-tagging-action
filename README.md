# Auto Version Tagging Action

[![GitHub Super-Linter](https://github.com/actions/javascript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/javascript-action/actions/workflows/ci.yml/badge.svg)

Automatically increment and tag your GitHub repository versions with this shared GitHub Action. It simplifies the process of version management, especially for projects following semantic versioning. The action reads a version file in your repository, increments it based on the input, and tags the repository with a new version tag, following a custom or default prefix.

## Features

- Fetches and increments project version based on the current latest version.
- Supports semantic versioning.
- Allows custom tag prefixes to suit different project environments or versioning schemes.
- Automatically updates a version file in your repository with the new version.
- Creates a new tag in the repository for the new version.

## Usage

To use the Auto Version Tagging Action in your GitHub Actions workflow, follow these steps:

1. **Set up the Workflow File**

   - Create a `.github/workflows` directory in your repository if it doesn't exist.
   - Add a new YAML file for your workflow (e.g., `.github/workflows/versioning.yml`).

2. **Configure the Workflow**

   Add the following content to your workflow file, customizing the inputs (`token`, `majorVersion`, and `tagPrefix`) as needed:

   ```yaml
   name: Auto Version Tagging

   on:
     push:
       branches:
         - main

   jobs:
     tag-version:
       runs-on: ubuntu-latest
       steps:
       - uses: actions/checkout@v2

       - name: Increment and Tag Version
         uses: entech-code/auto-version-tagging-action@v1
         with:
           token: ${{ secrets.GITHUB_TOKEN }}
           majorVersion: 1 # Set your major version
           tagPrefix: 'v' # Customize your tag prefix for version
   ```

3. **Inputs**

   The action accepts the following inputs:

   - `token` (**required**): Your GitHub token for authentication.
   - `majorVersion`: The major version of the release. The scripts changes only minor and patch versions.
   - `tagPrefix`: A prefix for tags (e.g., `v` for version tags like `v1.0.0`). Defaults to an `v`.

4. **Outputs**

   The action provides the following outputs:

   - `version`: The new version number.
   - `tag`: The full tag name created by the action.


## Initial Setup

After you've cloned the repository to your local machine or codespace, you'll
need to perform some initial setup steps before you can develop your action.

> [!NOTE]
>
> You'll need to have a reasonably modern version of
> [Node.js](https://nodejs.org) handy. If you are using a version manager like
> [`nodenv`](https://github.com/nodenv/nodenv) or
> [`nvm`](https://github.com/nvm-sh/nvm), you can run `nodenv install` in the
> root of your repository to install the version specified in
> [`package.json`](./package.json). Otherwise, 20.x or later should work!

1. :hammer_and_wrench: Install the dependencies

   ```bash
   npm install
   ```

1. :building_construction: Package the JavaScript for distribution

   ```bash
   npm run bundle
   ```

1. :white_check_mark: Run the tests

   ```bash
   $ npm test

   PASS  ./index.test.js
     ✓ throws invalid number (3ms)
     ✓ wait 500 ms (504ms)
     ✓ test runs (95ms)

   ...
   ```

## Usage

After testing, you can create version tag(s) that developers can use to
reference different stable versions of your action. For more information, see
[Versioning](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)
in the GitHub Actions toolkit.

To include the action in a workflow in another repository, you can use the
`uses` syntax with the `@` symbol to reference a specific branch, tag, or commit
hash.

```yaml
steps:
  - name: Checkout
    id: checkout
    uses: actions/checkout@v4

  - name: Run my Action
    id: run-action
    uses: actions/javascript-action@v1 # Commit with the `v1` tag
    with:
      milliseconds: 1000

  - name: Print Output
    id: output
    run: echo "${{ steps.run-action.outputs.time }}"
```
