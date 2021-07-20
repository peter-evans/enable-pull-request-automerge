import {Octokit} from '@octokit/core'
import * as OctokitTypes from '@octokit/types'

type OctokitClient = InstanceType<typeof Octokit>

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
    const response =
      await this.octokit.graphql<EnablePullRequestAutoMergeResponse>(
        query,
        params
      )
    return response.enablePullRequestAutoMerge.pullRequest.autoMergeRequest
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
