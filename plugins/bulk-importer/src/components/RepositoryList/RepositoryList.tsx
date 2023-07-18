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

import {
  InfoCard,
  Link,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import useAsync from 'react-use/lib/useAsync';
import { githubReposApiRef } from '../../api';
import { RestEndpointMethodTypes } from '@octokit/rest';
import Checkbox from '@mui/material/Checkbox';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import React, { useEffect, useState } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import { Button } from '@material-ui/core';
import { catalogApiRef } from '@backstage/plugin-catalog-react';

interface Row {
  id: number;
  name: string;
  owner: string;
  url: string;
  checked: boolean;
}

type RepositoryTableProps = {
  repositories: Row;
};

export const RepositoryTable = ({ repositories }: RepositoryTableProps) => {
  const catalogApi = useApi(catalogApiRef);

  const [rows, setRows] = useState<Row[]>([]);

  const handleImport = async () => {
    // eslint-disable-next-line no-console
    console.log('import clicked');

    // check if Reactjs compoennt Checkbox is checked

    // const results = Promise.all(rows.filter(row => row.checked === true).map(async row => {
    //   console.log(row)

    //   return await catalogApi.addLocation({
    //     type: 'url',
    //     target: row.url,
    //   });
    // }))

    // const results = await catalogApi.addLocation({
    //   type: "url",
    //   target: "https://github.com/kadel/hello-quarkus/blob/main/catalog-info.yaml",
    //   dryRun: true
    // })

    // console.log(results)

    // eslint-disable-next-line no-console
    console.log('end');
  };

  useEffect(() => {
    setRows(
      repositories.map(repo => {
        return {
          id: repo.id,
          name: repo.name,
          owner: repo.owner.login,
          url: repo.html_url,
          checked: false,
        };
      }),
    );
  }, [repositories]);

  const checkboxChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    id: number,
  ) => {
    // eslint-disable-next-line no-console
    console.log('checkboxChange called');
    // eslint-disable-next-line no-console
    console.log(id);
    // eslint-disable-next-line no-console
    console.log(e);
    setRows(
      rows.map(row => {
        if (row.id === id) {
          return {
            ...row,
            checked: !row.checked,
          };
        }
        return row;
      }),
    );
  };

  return (
    <InfoCard title="Repositories">
      <Button variant="contained" color="primary" onClick={handleImport}>
        Import Selected Repositories
      </Button>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Checkbox />
              </TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>URL</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.id}>
                <TableCell>
                  <Checkbox
                    checked={row.checked}
                    onChange={e => checkboxChange(e, row.id)}
                  />
                </TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.owner}</TableCell>
                <TableCell>
                  <Link to={row.url}>{row.url}</Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </InfoCard>
  );
};

export const RepositoryList = () => {
  const api = useApi(githubReposApiRef);
  const { value, loading, error } = useAsync(async (): Promise<
    RestEndpointMethodTypes['repos']['listForUser']['response']
  > => {
    return api.listRepositories({ owner: 'kadel' });
  }, []);

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  return <RepositoryTable repositories={value || []} />;
};
