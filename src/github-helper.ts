import * as core from '@actions/core'
import {Octokit as Core} from '@octokit/core'
import * as OctokitTypes from '@octokit/types'
import {GraphqlResponseError} from '@octokit/graphql'
import {HttpsProxyAgent} from 'https-proxy-agent'

const Octokit = Core.plugin(autoProxyAgent)
type OctokitClient = InstanceType<typeof Octokit>

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
    } catch (error) {
      if (error instanceof GraphqlResponseError) {
        if (
          error.errors?.some(e =>
            /pull request is in (clean|unstable) status/i.test(e.message)
          )
        ) {
          core.error(
            'Unable to enable automerge. Make sure you have enabled branch protection with at least one status check marked as required. See https://github.com/peter-evans/enable-pull-request-automerge#conditions for more information.'
          )
        }
      }
      throw error
    }
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
