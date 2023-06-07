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

import { GithubCredentialsProvider } from '@backstage/integration';
import { createCreateGithubOrganizationAction } from './custom';
import {
  ActionContext,
  TemplateAction,
} from '@backstage/plugin-scaffolder-node';
import { getRootLogger } from '@backstage/backend-common';
import { Writable } from 'stream';

const fakeEnterpriseOrganizationClient = {
  createEnterpriseOrganization: jest
    .fn()
    .mockResolvedValue({ name: 'orgname', url: 'https://example.com/orgName' }),
  getEnterpriseInfo: jest
    .fn()
    .mockResolvedValue({ name: 'entrprisename', id: 'enterpriseid' }),
};

type CreateGithubOrganizationInput = ReturnType<
  typeof createCreateGithubOrganizationAction
> extends TemplateAction<infer U>
  ? U
  : never;

describe('createCreateGithubOrganizationAction', () => {
  let instance: TemplateAction<CreateGithubOrganizationInput>;

  beforeEach(() => {
    const fakeGithubCredentialsProvider: GithubCredentialsProvider = {
      getCredentials: jest.fn().mockReturnValue({
        headers: { token: 'token' },
        type: 'app',
      }),
    };

    instance = createCreateGithubOrganizationAction({
      githubCredentialsProvider: fakeGithubCredentialsProvider,
      enterpriseOrganizationClient: fakeEnterpriseOrganizationClient,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('all information is provided', () => {
    let input: CreateGithubOrganizationInput;
    let ctx: ActionContext<CreateGithubOrganizationInput>;
    beforeEach(() => {
      input = {
        organizationName: 'orgName',
        enterpriseSlug: 'enterpriseSlug',
        adminLogins: ['adminLogin1', 'adminLogin2'],
        billingEmail: 'billing@example.com',
        profileName: 'profileName',
      };
      ctx = {
        createTemporaryDirectory: jest.fn(),
        output: jest.fn(),
        logger: getRootLogger(),
        logStream: new Writable(),
        input,
        workspacePath: 'workspace',
      };
    });

    it('should create organization', async () => {
      await instance.handler(ctx);

      expect(
        fakeEnterpriseOrganizationClient.getEnterpriseInfo,
      ).toHaveBeenCalledWith(expect.anything(), 'enterpriseSlug');

      expect(
        fakeEnterpriseOrganizationClient.createEnterpriseOrganization,
      ).toHaveBeenCalledWith(expect.anything(), {
        login: 'orgName',
        enterpriseId: 'enterpriseid',
        adminLogins: ['adminLogin1', 'adminLogin2'],
        billingEmail: 'billing@example.com',
        profileName: 'profileName',
      });

      expect(ctx.output).toHaveBeenCalledWith(
        'organizationUrl',
        'https://example.com/orgName',
      );
    });
  });
});
