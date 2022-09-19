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
      query: `query BlocksQuery($projectId: ID!) {document(id: $projectId) {id contents __typename }}`,
    },
    raw: true,
  };

  return z.request('https://www.taskade.com/graphql', options).then((response) => {
    response.throwForStatus();
    const results = response.json;

    const nodes: { format: any } = results.data.document.contents.nodes;
    const blocks = [];
    for (const [id, node] of Object.entries(nodes)) {
      if (node.format?.node === 'h1' || node.format?.node === 'h2') {
        blocks.push({ id: id, title: deltaToString(node.text.ops) });
      }
    }

    return blocks;
  });
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
