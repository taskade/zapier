import { Bundle, ZObject } from 'zapier-platform-core';

interface Project {
  id: string;
  name: string;
}

interface ProjectsResponseOk {
  ok: true;
  items: Project[];
}

interface ProjectsResponseError {
  ok: false;
  message: string;
}

type ProjectsResponse = ProjectsResponseOk | ProjectsResponseError;

const perform = async (z: ZObject, bundle: Bundle) => {
  if (bundle.inputData.space_id == null) {
    const response = await z.request({
      url: `https://www.taskade.com/api/v1/me/projects`,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${bundle.authData.access_token}`,
      },
    });

    const data: ProjectsResponse = response.json;

    if (!data.ok) {
      throw new z.errors.Error(data.message, 'invalid_input', 400);
    }

    return data.items.map((i) => ({ id: i.id, title: i.name }));
  }

  const response = await z.request({
    url: `https://www.taskade.com/api/v1/folders/${bundle.inputData.space_id}/projects`,
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${bundle.authData.access_token}`,
    },
  });

  const data: ProjectsResponse = response.json;

  if (!data.ok) {
    throw new z.errors.Error(data.message, 'invalid_input', 400);
  }

  return data.items.map((i) => ({ id: i.id, title: i.name }));
};

export default {
  operation: {
    perform: perform,
    inputFields: [
      {
        key: 'space_id',
        type: 'string',
        dynamic: 'get_all_spaces.id.name',
        label: 'Space ID',
        required: true,
        list: false,
        altersDynamicFields: false,
      },
    ],
    sample: { id: '8hoA5PtYfKroDifZ', title: 'Get Started with Taskade' },
    outputFields: [
      { key: 'id', label: 'ID' },
      { key: 'title', label: 'Title' },
    ],
    canPaginate: true,
  },
  key: 'get_all_projects',
  noun: 'Projects',
  display: {
    label: 'Get All Projects',
    description: "List all projects from a user's space.",
    hidden: true,
  },
};
