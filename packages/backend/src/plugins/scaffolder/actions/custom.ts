/*
 * Copyright 2023 The Backstage Authors
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

import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  GithubCredentialsProvider,
  ScmIntegrationRegistry,
} from '@backstage/integration';
import { graphql } from '@octokit/graphql';
import type { GraphQlQueryResponseData } from '@octokit/graphql';

type EnterpriseInfo = {
  name: string;
  id: string;
};

type OrganizationInfo = {
  name: string;
  url: string;
};

type CreateEnterpriseOrganizationInput = {
  adminLogins: string[];
  billingEmail: string;
  clientMutationId?: string;
  enterpriseId: string;
  login: string;
  profileName: string;
};

type EnterpriseOrganizationClient = {
  getEnterpriseInfo: (
    graphqlClient: typeof graphql,
    slug: string,
  ) => Promise<EnterpriseInfo>;
  createEnterpriseOrganization: (
    graphqlClient: typeof graphql,
    options: CreateEnterpriseOrganizationInput,
  ) => Promise<OrganizationInfo>;
};

export interface createCreateGithubOrganizationActionOptions {
  integrations: ScmIntegrationRegistry;
  githubCredentialsProvider: GithubCredentialsProvider;
  enterpriseOrganizationClient?: EnterpriseOrganizationClient;
}

const defaultEnterpriseOrganizationClient: EnterpriseOrganizationClient = {
  getEnterpriseInfo: async (
    graphqlClient: typeof graphql,
    slug: string,
  ): Promise<EnterpriseInfo> => {
    const data = await graphqlClient<GraphQlQueryResponseData>(
      `#graphql
            query getEnterprise($slug: String!){
                enterprise(slug: $slug) {
                    name
                    id
                }
            }
        `,
      { slug: slug },
    );
    if (!data.enterprise) {
      throw new Error(`Enterprise ${slug} not found`);
    }
    return data.enterprise;
  },
  createEnterpriseOrganization: async (
    graphqlClient: typeof graphql,
    options: CreateEnterpriseOrganizationInput,
  ): Promise<OrganizationInfo> => {
    const data = await graphqlClient<GraphQlQueryResponseData>(
      `#graphql
                mutation createEnterpriseOrganization ($input: CreateEnterpriseOrganizationInput!) {
                    createEnterpriseOrganization (input: $input) {
                        clientMutationId
                        organization {
                            name
                            url
                        }
                    }
                }
            `,
      { input: options },
    );

    if (
      !data.createEnterpriseOrganization ||
      !data.createEnterpriseOrganization.organization
    ) {
      throw new Error(
        `Failed to create organization with input: ${JSON.stringify(options)}`,
      );
    }

    return data.createEnterpriseOrganization.organization;
  },
};

export const createCreateGithubOrganizationAction = (
  options: createCreateGithubOrganizationActionOptions,
) => {
  const {
    integrations,
    githubCredentialsProvider,
    enterpriseOrganizationClient = defaultEnterpriseOrganizationClient,
  } = options;

  return createTemplateAction<{
    organizationName: string;
    enterpriseSlug: string;
    adminLogins: string[];
    billingEmail: string;
    profileName: string;
    token?: string;
    host?: string;
  }>({
    id: 'kadel:org:create',
    schema: {
      input: {
        required: [
          'organizationName',
          'enterpriseSlug',
          'adminLogins',
          'billingEmail',
          'profileName',
        ],
        type: 'object',
        properties: {
          organizationName: {
            type: 'string',
            title: 'Organization name',
            description: 'Name of the GitHub organization to create',
          },
          enterpriseSlug: {
            type: 'string',
            title: 'Enterprise slug',
            description:
              'Slug for the GitHub enterprise to create the organization in',
          },
          adminLogins: {
            type: 'array',
            title: 'Admin logins',
            description:
              'Logins of the GitHub users to add as admins to the organization',
          },
          billingEmail: {
            type: 'string',
            title: 'Billing Email',
            description: 'Billing email for the organization',
          },
          profileName: {
            type: 'string',
            tile: 'Profile Name',
            title: 'The profile name of the new organization.',
          },
          host: {
            type: 'string',
            title: 'Github Enterprise Host',
            description:
              'The domain name of the GitHub Enterprise instance to create the organization in. The host needs to be defined integrations in app-config.yaml',
          },
        },
      },
      output: {
        type: 'object',
        properties: {
          organizationUrl: {
            type: 'string',
            title: 'Organization URL',
            description: 'Full URL of a newly created GitHub organization',
          },
        },
      },
    },
    async handler(ctx) {
      const { input, output } = ctx;

      const host = input.host || 'github.com';

      const { token: credentialProviderToken } =
        await githubCredentialsProvider.getCredentials({
          url: `https://${host}/user`,
        });

      console.log('XXXX');
      console.log(host);
      console.log(credentialProviderToken);

      const graphqlClient = graphql.defaults({
        // TODO get it from integration config
        baseUrl: `https://${host}/api/v3`,
        headers: {
          authorization: `token ${credentialProviderToken}`,
        },
      });

      const enterprise = await enterpriseOrganizationClient.getEnterpriseInfo(
        graphqlClient,
        input.enterpriseSlug,
      );

      const organization =
        await enterpriseOrganizationClient.createEnterpriseOrganization(
          graphqlClient,
          {
            adminLogins: input.adminLogins,
            billingEmail: input.billingEmail,
            enterpriseId: enterprise.id,
            login: input.organizationName,
            profileName: input.profileName,
          },
        );

      output('organizationUrl', organization.url);
    },
  });
};
