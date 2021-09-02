import * as core from '@actions/core'
import {GithubHelper} from './github-helper'
import {inspect} from 'util'

async function run(): Promise<void> {
  try {
    const inputs = {
      token: core.getInput('token'),
      repository: core.getInput('repository'),
      pullRequestNumber: Number(core.getInput('pull-request-number')),
      mergeMethod: core.getInput('merge-method')
    }
    core.debug(`Inputs: ${inspect(inputs)}`)

    const [owner, repo] = inputs.repository.split('/')
    core.debug(`Repo: ${inspect(repo)}`)

    const githubHelper = new GithubHelper(inputs.token)

    core.info('Fetching pull request ID')
    const pullRequestId = await githubHelper.getPullRequestId(
      owner,
      repo,
      inputs.pullRequestNumber
    )
    core.debug(`PullRequestId: ${inspect(pullRequestId)}`)

    core.info(`Enabling auto-merge on pull request ID ${pullRequestId}`)
    const res = await githubHelper.enablePullRequestAutomerge(
      pullRequestId,
      inputs.mergeMethod.toUpperCase()
    )
    core.debug(`AutoMergeRequest: ${inspect(res)}`)

    if (res.enabledAt) {
      core.info(`Auto-merge successfully enabled by ${res.enabledBy.login}`)
    } else {
      throw Error('Failed to enable auto-merge')
    }
  } catch (error: any) {
    core.setFailed(error.message)
  }
}

run()
