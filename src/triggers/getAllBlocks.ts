import { Bundle, ZObject } from 'zapier-platform-core';

interface Block {
  id: string;
  text: string;
}

interface BlocksResponseOk {
  ok: true;
  items: Block[];
}

interface BlocksResponseError {
  ok: false;
  message: string;
}

type BlocksResponse = BlocksResponseOk | BlocksResponseError;

const perform = async (z: ZObject, bundle: Bundle) => {
  const response = await z.request({
    url: `https://www.taskade.com/api/v1/projects/${bundle.inputData.project_id}/blocks`,
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${bundle.authData.access_token}`,
    },
  });

  const data: BlocksResponse = response.json;

  if (!data.ok) {
    throw new z.errors.Error(data.message, 'invalid_input', 400);
  }

  return data.items.map((i) => ({ id: i.id, title: i.text }));
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
  },
};
