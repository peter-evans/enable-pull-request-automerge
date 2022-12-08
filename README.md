# Enable Pull Request Auto-merge
[![CI](https://github.com/peter-evans/enable-pull-request-automerge/workflows/CI/badge.svg)](https://github.com/peter-evans/enable-pull-request-automerge/actions?query=workflow%3ACI)
[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Enable%20Pull%20Request%20Automerge-blue.svg?colorA=24292e&colorB=0366d6&style=flat&longCache=true&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAM6wAADOsB5dZE0gAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAERSURBVCiRhZG/SsMxFEZPfsVJ61jbxaF0cRQRcRJ9hlYn30IHN/+9iquDCOIsblIrOjqKgy5aKoJQj4O3EEtbPwhJbr6Te28CmdSKeqzeqr0YbfVIrTBKakvtOl5dtTkK+v4HfA9PEyBFCY9AGVgCBLaBp1jPAyfAJ/AAdIEG0dNAiyP7+K1qIfMdonZic6+WJoBJvQlvuwDqcXadUuqPA1NKAlexbRTAIMvMOCjTbMwl1LtI/6KWJ5Q6rT6Ht1MA58AX8Apcqqt5r2qhrgAXQC3CZ6i1+KMd9TRu3MvA3aH/fFPnBodb6oe6HM8+lYHrGdRXW8M9bMZtPXUji69lmf5Cmamq7quNLFZXD9Rq7v0Bpc1o/tp0fisAAAAASUVORK5CYII=)](https://github.com/marketplace/actions/enable-pull-request-automerge)

A GitHub action to [enable auto-merge](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/automatically-merging-a-pull-request) on a pull request.

:warning: There are very specific conditions under which this action will work. See [Conditions](#conditions) for details.

## Usage

```yml
      - uses: peter-evans/enable-pull-request-automerge@v2
        with:
          token: ${{ secrets.PAT }}
          pull-request-number: 1
```

### Action inputs

| Name | Description | Default |
| --- | --- | --- |
| `token` | `GITHUB_TOKEN` (permissions `pull_requests: write`, `contents: write`) or a `repo` scoped [Personal Access Token (PAT)](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token). | `GITHUB_TOKEN` |
| `repository` | The target GitHub repository containing the pull request. | `github.repository` (Current repository) |
| `pull-request-number` | (**required**) The number of the target pull request | |
| `merge-method` | The merge method to use. `merge`, `rebase` or `squash`. | `merge` |

### Conditions

This action uses a GitHub API that only works under specific conditions. All of the following conditions must be true for this action to succeed.

1. The target repository must have [Allow auto-merge](https://docs.github.com/en/github/administering-a-repository/managing-auto-merge-for-pull-requests-in-your-repository) enabled in settings.
2. The pull request `base` must have a branch protection rule with at least one requirement enabled.
3. The pull request must be in a state where requirements have not yet been satisfied. If the pull request can already be merged, attempting to enable auto-merge will fail.

### Dependabot example

The following example will automerge dependabot pull requests.
Note that if you use the default `GITHUB_TOKEN`, as in the example, the merge will not trigger further workflow runs.
If you want to trigger further workflow runs, you will need to use a `repo` scoped [Personal Access Token (PAT)](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token).

```yml
name: Auto-merge Dependabot
on: pull_request

permissions:
  pull-requests: write
  contents: write

jobs:
  automerge:
    runs-on: ubuntu-latest
    if: github.actor == 'dependabot[bot]'
    steps:
      - uses: peter-evans/enable-pull-request-automerge@v2
        with:
          pull-request-number: ${{ github.event.pull_request.number }}
          merge-method: squash
```

### Create pull request example

In the following example [create-pull-request](https://github.com/peter-evans/create-pull-request) action is used to create a pull request containing some changes that we want to merge automatically once requirements have been satisfied.

```yml
      - uses: actions/checkout@v3

      # Make changes to pull request here

      - name: Create Pull Request
        id: cpr
        uses: peter-evans/create-pull-request@v3
        with:
          token: ${{ secrets.PAT }}

      - name: Enable Pull Request Automerge
        if: steps.cpr.outputs.pull-request-operation == 'created'
        uses: peter-evans/enable-pull-request-automerge@v2
        with:
          token: ${{ secrets.PAT }}
          pull-request-number: ${{ steps.cpr.outputs.pull-request-number }}
          merge-method: squash
```

If the "require pull request reviews" branch protection has been enabled we can optionally auto-approve the pull request by adding the following step to the example above.
The `if` condition makes sure we don't approve multiple times if the workflow executes more than once before the pull request merges.

```yml
      - name: Auto approve
        if: steps.cpr.outputs.pull-request-operation == 'created'
        uses: juliangruber/approve-pull-request-action@v2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          number: ${{ steps.cpr.outputs.pull-request-number }}
```

## License

[MIT](LICENSE)
