import * as core from '@actions/core'
import {Octokit as Core} from '@octokit/core'
import * as OctokitTypes from '@octokit/types'
import {HttpsProxyAgent} from 'https-proxy-agent'

const Octokit = Core.plugin(autoProxyAgent)
type OctokitClient = InstanceType<typeof Octokit>

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Octokit plugin to support the https_proxy environment variable
function autoProxyAgent(octokit: Core) {
  const proxy = process.env.https_proxy || process.env.HTTPS_PROXY
  if (!proxy) return

  const agent = new HttpsProxyAgent(proxy)
  octokit.hook.before('request', options => {
    options.request.agent = agent
  })
}

export class GithubHelper {
  private octokit: OctokitClient

  constructor(token: string) {
    this.octokit = new Octokit({
      auth: token,
      baseUrl: process.env['GITHUB_API_URL'] || 'https://api.github.com'
    })
  }

  async getPullRequestId(
    owner: string,
    repo: string,
    pullRequestNumber: number
  ): Promise<string> {
    const params: OctokitTypes.RequestParameters = {
      owner: owner,
      repo: repo,
      pullRequestNumber: pullRequestNumber
    }
    const query = `query GetPullRequestId($owner: String!, $repo: String!, $pullRequestNumber: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $pullRequestNumber) {
          id
        }
      }
    }`
    const response = await this.octokit.graphql<GetPullRequestIdResponse>(
      query,
      params
    )
    return response.repository.pullRequest.id
  }

  async enablePullRequestAutomerge(
    pullRequestId: string,
    mergeMethod: string
  ): Promise<AutoMergeRequest> {
    let attempts = 0
    // We retry here because the GitHub API may return with errors due to the
    // PR not yet being in a state where automerge can yet be enabled. Example
    // error messages from the API include:
    //  - "Pull request is in unstable status"
    //  - "Pull request is in clean status"
    do {
      if (attempts > 0) {
        await sleep(5_000)
      }
      const params: OctokitTypes.RequestParameters = {
        pullRequestId: pullRequestId,
        mergeMethod: mergeMethod
      }
      const query = `mutation ($pullRequestId: ID!, $mergeMethod: PullRequestMergeMethod!) {
        enablePullRequestAutoMerge(input: {
          pullRequestId: $pullRequestId,
          mergeMethod: $mergeMethod
        }) {
          pullRequest {
            autoMergeRequest {
              enabledAt
              enabledBy {
                login
              }
            }
          }
        }
      }`
      try {
        const response =
          await this.octokit.graphql<EnablePullRequestAutoMergeResponse>(
            query,
            params
          )
        return response.enablePullRequestAutoMerge.pullRequest.autoMergeRequest
      } catch (e) {
        core.warning(e instanceof Error ? e : e + '')
        continue
      }
    } while (++attempts < 5)

    throw new Error('Failed to enable pull request automerge.')
  }
}

type GetPullRequestIdResponse = {
  repository: {
    pullRequest: {
      id: string
    }
  }
}

type AutoMergeRequest = {
  enabledAt?: string
  enabledBy: {
    login: string
  }
}

type EnablePullRequestAutoMergeResponse = {
  enablePullRequestAutoMerge: {
    pullRequest: {
      autoMergeRequest: AutoMergeRequest
    }
  }
}
