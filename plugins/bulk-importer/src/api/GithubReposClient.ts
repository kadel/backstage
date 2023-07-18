/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  ScmIntegrationRegistry,
  readGithubIntegrationConfigs,
} from '@backstage/integration';
import { ScmAuthApi } from '@backstage/integration-react';
import { GithubReposApi } from './GithubReposApi';
import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';
import { ConfigApi, OAuthApi } from '@backstage/core-plugin-api';
import { QueryParams, RepoInfo } from './types';
import { parseLocationRef } from '@backstage/catalog-model';
import { InputError } from '@backstage/errors';
import { graphql } from '@octokit/graphql';

/**
 * A client for fetching information about GitHub actions.
 *
 * @public
 */
export class GithubReposClient implements GithubReposApi {
  private readonly configApi: ConfigApi;
  private readonly scmAuthApi: ScmAuthApi;

  constructor(options: { configApi: ConfigApi; scmAuthApi: ScmAuthApi }) {
    this.configApi = options.configApi;
    this.scmAuthApi = options.scmAuthApi;
  }

  private async getOctokit(hostname: string = 'github.com'): Promise<Octokit> {
    const { token } = await this.scmAuthApi.getCredentials({
      url: `https://${hostname}/`,
      additionalScope: {
        customScopes: {
          github: ['repo'],
        },
      },
    });
    const configs = readGithubIntegrationConfigs(
      this.configApi.getOptionalConfigArray('integrations.github') ?? [],
    );
    const githubIntegrationConfig = configs.find(v => v.host === hostname);
    const baseUrl = githubIntegrationConfig?.apiBaseUrl;
    return new Octokit({ auth: token, baseUrl });
  }

  async listRepositories(
    params: QueryParams,
  ): Promise<RestEndpointMethodTypes['repos']['listForUser']['response']> {
    const { host, owner } = params;

    const octokit = await this.getOctokit(host);

    const data = await octokit.paginate(octokit.repos.listForUser, {
      username: owner,
    });

    return data;

    // const graphQLWithAuth = graphql.defaults({
    //   baseUrl,
    //   headers: {
    //     authorization: `token ${token}`,
    //   },
    // });

    // const response: QueryResponse = await graphQLWithAuth(
    //   reposQuery,
    //   params,
    // );
  }
}
