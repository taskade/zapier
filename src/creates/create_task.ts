import { DateDuration, MomentHelpers } from '@taskade/readymade-datetime';
import moment from 'moment-timezone';
import { v4 as uuidv4 } from 'uuid';
import { Bundle, HttpRequestOptions, ZObject } from 'zapier-platform-core';

interface Zap {
  user: {
    timezone: string;
  };
}

function isZap(zap: { id: string } | undefined | Zap): zap is Zap {
  return (zap as Zap).user != null;
}

const nodeDueDateReqVariables = (z: ZObject, bundle: Bundle, nodeId: string) => {
  const variables = {
    input: {
      clientMutationId: uuidv4(),
      dateAttachment: {},
      nodeIds: [nodeId],
      projectId: bundle.inputData.project_id,
    },
  };

  let zapierProfileTimezone = 'Etc/UTC';
  if (isZap(bundle.meta.zap)) {
    zapierProfileTimezone = bundle.meta.zap.user.timezone;
  }

  let dateDuration: DateDuration | null = null;
  if (bundle.inputData.start_date != null && bundle.inputData.end_date == null) {
    dateDuration = DateDuration.fromDateRangeDesc({
      start: MomentHelpers.toDateTimeDesc(
        moment.tz(bundle.inputData.start_date, zapierProfileTimezone),
      ),
    });

    variables.input.dateAttachment = dateDuration.toDateRangeDesc();
  }

  if (bundle.inputData.start_date != null && bundle.inputData.end_date != null) {
    dateDuration = DateDuration.fromDateRangeDesc({
      start: MomentHelpers.toDateTimeDesc(
        moment.tz(bundle.inputData.start_date, zapierProfileTimezone),
      ),
      end: MomentHelpers.toDateTimeDesc(
        moment.tz(bundle.inputData.end_date, zapierProfileTimezone),
      ),
    });
    variables.input.dateAttachment = dateDuration.toDateRangeDesc();
  }

  if (bundle.inputData.start_date == null && bundle.inputData.end_date != null) {
    dateDuration = DateDuration.fromDateRangeDesc({
      start: MomentHelpers.toDateTimeDesc(
        moment.tz(bundle.inputData.end_date, zapierProfileTimezone),
      ),
    });
    variables.input.dateAttachment = dateDuration.toDateRangeDesc();
  }

  if (dateDuration == null) {
    return null;
  }

  variables.input.dateAttachment = dateDuration.toDateRangeDesc();
  return variables;
};

const perform = async (z: ZObject, bundle: Bundle) => {
  const nodeImportReqOpts: HttpRequestOptions = {
    url: 'https://www.taskade.com/graphql',
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
          clientMutationId: uuidv4(),
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
      query: `
      mutation ProjectNodesImportMutation($input: ProjectNodesImportInput!) {
        projectNodesImport(input: $input) {
          clientMutationId
          nodeID
          document {
            id
            info
          }
        }
      }
      `,
    },
  };
  const nodeImportRes = await z.request('https://www.taskade.com/graphql', nodeImportReqOpts);
  const nodeImportData = nodeImportRes.json;

  if (bundle.inputData.start_date == null && bundle.inputData.end_date == null) {
    return nodeImportData;
  }

  const variables = nodeDueDateReqVariables(
    z,
    bundle,
    nodeImportData.data.projectNodesImport.nodeID,
  );
  if (variables == null || Object.keys(variables.input.dateAttachment).length === 0) {
    return nodeImportData;
  }

  const nodeDueDateReqOpts: HttpRequestOptions = {
    url: 'https://www.taskade.com/graphql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      authorization: `bearer ${bundle.authData.access_token}`,
    },
    body: {
      operationName: 'ProjectNodesDueDateUpdateMutation',
      variables,
      query: `
      mutation ProjectNodesDueDateUpdateMutation($input: ProjectNodesDueDateUpdateInput!) {
        projectNodesDueDateUpdate(input: $input) {
          clientMutationId
          ok
        }
      }
      `,
    },
  };

  const nodeDueDateRes = await z.request('https://www.taskade.com/graphql', nodeDueDateReqOpts);
  const nodeDueDateData = nodeDueDateRes.json;
  if (nodeDueDateData.errors && nodeDueDateData.errors.length) {
    const error = nodeDueDateData.errors[0];
    throw new z.errors.Error(
      (error.extensions && error.extensions.userPresentableMessage) || error.message,
      'invalid_input',
      400,
    );
  }

  if (nodeDueDateData.data.projectNodesDueDateUpdate.ok) {
    nodeImportData.data.projectNodesImport.node = {
      ...variables.input.dateAttachment,
    };
  }

  return nodeImportData;
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
      {
        key: 'start_date',
        label: 'Start Date',
        type: 'datetime',
        helpText: 'The start date of the task.',
        required: false,
        list: false,
        altersDynamicFields: false,
      },
      {
        key: 'end_date',
        label: 'End Date',
        type: 'datetime',
        helpText: 'The end date of the task.',
        required: false,
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
