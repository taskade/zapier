import { Bundle, ZObject } from 'zapier-platform-core';

interface ProjectMember {
  handle: string;
  displayName: string;
}

interface ProjectMembersResponseOk {
  ok: true;
  items: ProjectMember[];
}

interface ProjectMembersResponseError {
  ok: false;
  message: string;
}

type ProjectMembersResponse = ProjectMembersResponseOk | ProjectMembersResponseError;

const perform = async (z: ZObject, bundle: Bundle) => {
  const response = await z.request({
    url: `https://www.taskade.com/api/v1/projects/${bundle.inputData.project_id}/members`,
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${bundle.authData.access_token}`,
    },
  });

  const data: ProjectMembersResponse = response.json;

  if (!data.ok) {
    throw new z.errors.Error(data.message, 'invalid_input', 400);
  }

  return data.items.map((i) => ({
    id: i.handle,
    displayName: i.displayName,
  }));
};

export default {
  operation: {
    perform: perform,
    inputFields: [
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
    sample: { id: '1', displayName: 'xiao ming' },
    outputFields: [
      { key: 'id', label: 'Handle' },
      { key: 'displayName', label: 'Display Name' },
    ],
  },
  key: 'get_all_assignable_members',
  noun: 'Assignable Members',
  display: {
    label: 'Get All Assignable Members',
    description: 'List all assignable members from a project.',
    hidden: true,
  },
};
