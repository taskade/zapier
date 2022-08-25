import { ZObject, HttpRequestOptions, Bundle } from 'zapier-platform-core';

const perform = async (z: ZObject, bundle: Bundle) => {
  const options: HttpRequestOptions = {
    url: 'https:///www.taskade.com/graphql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      authorization: `bearer ${bundle.authData.access_token}`,
    },
    body: {
      operationName: 'ProjectNodesImportMutation',
      variables: {
        input: {
          clientMutationId: 'zapier-clientMutationId',
          documentID: bundle.inputData.project_id,
          nodeID: bundle.inputData.block_id || null,
          placement: 'BOTTOM',
          type: 'application/vnd.taskade.taskast',
          content: {
            type: 'fragment',
            children: [
              {
                type: 'text',
                text: {
                  ops: [
                    { insert: bundle.inputData.content },
                    { insert: '\n', attributes: { paragraph: true } },
                  ],
                },
                children: [],
                format: { node: 'checkbox' },
              },
            ],
          },
        },
      },
      query:
        'mutation ProjectNodesImportMutation($input: ProjectNodesImportInput\u0021) { projectNodesImport(input: $input) { clientMutationId nodeID document { id info } }}',
    },
  };

  return z.request('https:///www.taskade.com/graphql', options).then((response) => {
    response.throwForStatus();
    const results = response.json;

    return results;
  });
};

export default {
  key: 'create_task',
  noun: 'Task',
  display: {
    label: 'Create Task',
    description: 'Creates a Task in Taskade',
    hidden: false,
    important: true,
  },
  operation: {
    inputFields: [
      {
        key: 'space_id',
        label: 'Workspace or Folder',
        type: 'string',
        dynamic: 'get_all_spaces.id.name',
        required: false,
        list: false,
        altersDynamicFields: false,
      },
      {
        key: 'project_id',
        label: 'Project',
        type: 'string',
        dynamic: 'get_all_projects.id.title',
        required: true,
        list: false,
        altersDynamicFields: false,
      },
      {
        key: 'block_id',
        label: 'Block',
        type: 'string',
        dynamic: 'get_all_blocks.id.title',
        required: false,
        list: false,
        altersDynamicFields: false,
      },
      {
        key: 'content',
        label: 'Content',
        type: 'string',
        helpText: 'The content of the task.',
        required: true,
        list: false,
        altersDynamicFields: false,
      },
    ],
    sample: {
      data: {
        projectNodesImport: {
          clientMutationId: 'fc9ea891-db68-4ad0-a8e0-f06afd7da3d7',
          nodeID: '099630d4-267e-4b22-894b-08b69f3a4d79',
          document: {
            id: '77WDhinRapyT5FY8',
            info: {
              stats: {
                cleared: false,
                completed: false,
                totalCount: 1,
                completedCount: 0,
              },
              title: 'edittt patth',
              updatedBy: { id: 1, handle: 'ycyc' },
            },
          },
        },
      },
    },
    outputFields: [
      { key: 'data__projectNodesImport__clientMutationId' },
      { key: 'data__projectNodesImport__nodeID' },
      { key: 'data__projectNodesImport__document__id' },
      { key: 'data__projectNodesImport__document__info__stats__cleared' },
      { key: 'data__projectNodesImport__document__info__stats__completed' },
      { key: 'data__projectNodesImport__document__info__stats__totalCount' },
      {
        key: 'data__projectNodesImport__document__info__stats__completedCount',
      },
      { key: 'data__projectNodesImport__document__info__title' },
      { key: 'data__projectNodesImport__document__info__updatedBy__id' },
      { key: 'data__projectNodesImport__document__info__updatedBy__handle' },
    ],
    perform: perform,
  },
};
