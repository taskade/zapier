import { ApolloClient, ApolloError, createHttpLink, gql, InMemoryCache } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { DateDuration, MomentHelpers } from '@taskade/readymade-datetime';
import moment from 'moment-timezone';
import { v4 as uuidv4 } from 'uuid';
import { Bundle, ZObject } from 'zapier-platform-core';

interface Zap {
  user: {
    timezone: string;
  };
}

function isZap(zap: any): zap is Zap {
  return typeof zap === 'object' && 'user' in zap && typeof zap.user === 'object';
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

  let dateDuration: DateDuration;
  if (bundle.inputData.start_date != null && bundle.inputData.end_date == null) {
    dateDuration = DateDuration.fromDateRangeDesc({
      start: MomentHelpers.toDateTimeDesc(
        moment.tz(bundle.inputData.start_date, zapierProfileTimezone),
      ),
    });

    variables.input.dateAttachment = dateDuration.toDateRangeDesc();
  } else if (bundle.inputData.start_date != null && bundle.inputData.end_date != null) {
    dateDuration = DateDuration.fromDateRangeDesc({
      start: MomentHelpers.toDateTimeDesc(
        moment.tz(bundle.inputData.start_date, zapierProfileTimezone),
      ),
      end: MomentHelpers.toDateTimeDesc(
        moment.tz(bundle.inputData.end_date, zapierProfileTimezone),
      ),
    });
    variables.input.dateAttachment = dateDuration.toDateRangeDesc();
  } else if (bundle.inputData.start_date == null && bundle.inputData.end_date != null) {
    dateDuration = DateDuration.fromDateRangeDesc({
      start: MomentHelpers.toDateTimeDesc(
        moment.tz(bundle.inputData.end_date, zapierProfileTimezone),
      ),
    });
    variables.input.dateAttachment = dateDuration.toDateRangeDesc();
  } else {
    return null;
  }

  variables.input.dateAttachment = dateDuration.toDateRangeDesc();
  return variables;
};

const perform = async (z: ZObject, bundle: Bundle) => {
  const httpLink = createHttpLink({
    uri: 'https://www.taskade.com/graphql',
  });

  const authLink = setContext((_, { headers }) => {
    return {
      headers: {
        ...headers,
        authorization: bundle.authData.access_token ? `Bearer ${bundle.authData.access_token}` : '',
      },
    };
  });

  const client = new ApolloClient({
    name: 'zapier',
    link: authLink.concat(httpLink),
    cache: new InMemoryCache({
      addTypename: false,
    }),
  });

  // Create node
  let nodeImportResult;
  try {
    nodeImportResult = await client.mutate({
      mutation: gql`
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
    });
  } catch (error) {
    if (error instanceof ApolloError) {
      throw new z.errors.Error(error.message, 'invalid_input', 400);
    }
  }

  if (nodeImportResult == null) {
    throw new z.errors.Error('Internal Server Error');
  }

  const nodeImportData = nodeImportResult.data.projectNodesImport;

  if (
    bundle.inputData.start_date == null &&
    bundle.inputData.end_date == null &&
    bundle.inputData.member_id == null
  ) {
    return nodeImportData;
  }

  // Create due date addon
  const dateAddonVariables = nodeDueDateReqVariables(z, bundle, nodeImportData.nodeID);
  if (dateAddonVariables != null) {
    try {
      const dateAddonResult = await client.mutate({
        mutation: gql`
          mutation ProjectNodesDueDateUpdateMutation($input: ProjectNodesDueDateUpdateInput!) {
            projectNodesDueDateUpdate(input: $input) {
              clientMutationId
              ok
            }
          }
        `,
        variables: dateAddonVariables,
      });

      if (dateAddonResult.data.projectNodesDueDateUpdate.ok) {
        nodeImportData.node = {
          ...dateAddonVariables.input.dateAttachment,
        };
      }
    } catch (error) {
      if (error instanceof ApolloError) {
        throw new z.errors.Error(error.message, 'invalid_input', 400);
      }
    }
  }

  // Create assignee addon
  if (bundle.inputData.member_id != null) {
    try {
      const assigneeAddonResult = await client.mutate({
        mutation: gql`
          mutation ProjectNodesAssignmentUpdateMutation(
            $input: ProjectNodesAssignmentUpdateInput!
          ) {
            projectNodesAssignmentUpdate(input: $input) {
              clientMutationId
              ok
            }
          }
        `,
        variables: {
          input: {
            clientMutationId: uuidv4(),
            projectId: bundle.inputData.project_id,
            nodeIds: [nodeImportData.nodeID],
            assigneeId: bundle.inputData.member_id,
          },
        },
      });

      if (assigneeAddonResult.data.projectNodesAssignmentUpdate.ok) {
        nodeImportData.node = {
          ...nodeImportData.node,
          assignees: [bundle.inputData.member_id],
        };
      }
    } catch (error) {
      if (error instanceof ApolloError) {
        throw new z.errors.Error(error.message, 'invalid_input', 400);
      }
    }
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
      {
        key: 'member_id',
        label: 'Assign to',
        type: 'string',
        dynamic: 'get_all_assignable_members.id.displayName',
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
      { key: 'clientMutationId' },
      { key: 'nodeID' },
      { key: 'document__id' },
      { key: 'document__info__stats__cleared' },
      { key: 'document__info__stats__completed' },
      { key: 'document__info__stats__totalCount' },
      {
        key: 'document__info__stats__completedCount',
      },
      { key: 'document__info__title' },
      { key: 'document__info__updatedBy__id' },
      { key: 'document__info__updatedBy__handle' },
      { key: 'node__start__date' },
      { key: 'node__start__time' },
      { key: 'node__start__timezone' },
      { key: 'node__end__date' },
      { key: 'node__end__time' },
      { key: 'node__end__timezone' },
      { key: 'node__assignees' },
    ],
    perform: perform,
  },
};
