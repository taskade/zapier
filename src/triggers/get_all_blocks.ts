import { Bundle, HttpRequestOptions, ZObject } from 'zapier-platform-core';

const perform = async (z: ZObject, bundle: Bundle) => {
  function deltaToString(delta: any) {
    return delta
      .filter((op: any) => typeof op.insert === 'string')
      .map((op: any) => op.insert)
      .join('')
      .trim();
  }

  const options: HttpRequestOptions = {
    url: 'https://www.taskade.com/graphql',
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'content-type': 'application/json',
      authorization: `bearer ${bundle.authData.access_token}`,
    },
    body: {
      operationName: 'BlocksQuery',
      variables: {
        projectId: bundle.inputData.project_id,
      },
      query: `
      query BlocksQuery($projectId: ID!) {
        document(id: $projectId) {
          id
          contents
        }
      }
      `,
    },
  };

  const response = await z.request('https://www.taskade.com/graphql', options);
  const data = response.json;

  if (data.errors && data.errors.length) {
    const error = data.errors[0];
    throw new z.errors.Error(
      (error.extensions && error.extensions.userPresentableMessage) || error.message,
      'invalid_input',
      400,
    );
  }

  const nodes: { format: any } = data.data?.document?.contents?.nodes;
  if (nodes != null) {
    const blocks = [];
    for (const [id, node] of Object.entries(nodes)) {
      if (node.format?.node === 'h1' || node.format?.node === 'h2') {
        blocks.push({ id: id, title: deltaToString(node.text.ops) });
      }
    }

    return blocks;
  } else {
    const error = data.errors ? data.errors[0].message : 'Something went wrong';
    throw new z.errors.Error(`Failed to get all blocks`, error, 400);
  }
};

export default {
  operation: {
    perform: perform,
    inputFields: [
      {
        key: 'space_id',
        type: 'string',
        label: 'Space ID',
        dynamic: 'get_all_spaces.id.name',
        required: false,
        list: false,
        altersDynamicFields: false,
      },
      {
        key: 'project_id',
        type: 'string',
        label: 'Project ID',
        dynamic: 'get_all_projects.id.title',
        required: true,
        list: false,
        altersDynamicFields: true,
      },
    ],
    sample: { id: '861d426a-6366-41c6-8452-810b07995b6c', title: '🚩 Backlog' },
    outputFields: [
      { key: 'id', label: 'ID' },
      { key: 'title', label: 'Title' },
    ],
  },
  key: 'get_all_blocks',
  noun: 'Blocks',
  display: {
    label: 'Get All Blocks',
    description: 'List all blocks from a project.',
    hidden: true,
    important: false,
  },
};
