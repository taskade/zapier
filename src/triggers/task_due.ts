import { Bundle, HttpRequestOptions, ZObject } from 'zapier-platform-core';

const perform = async (z: ZObject, bundle: Bundle) => {
  const payload = {
    spaceName: bundle.cleanedRequest.spaceName,
    spaceID: bundle.cleanedRequest.spaceID,
    projectName: bundle.cleanedRequest.projectName,
    projectID: bundle.cleanedRequest.projectID,
    id: bundle.cleanedRequest.id,
    text: bundle.cleanedRequest.text,
    isCompleted: bundle.cleanedRequest.isCompleted,
    assignees: bundle.cleanedRequest.assignees,
    taskStartDate: bundle.cleanedRequest.taskStartDate,
    taskStartTime: bundle.cleanedRequest.taskStartTime,
    taskStartTimezone: bundle.cleanedRequest.taskStartTimezone,
    taskEndDate: bundle.cleanedRequest.taskEndDate,
    taskEndTime: bundle.cleanedRequest.taskEndTime,
    taskEndTimezone: bundle.cleanedRequest.taskEndTimezone,
  };

  return [payload];
};

const performList = async (z: ZObject, bundle: Bundle) => {
  const options: HttpRequestOptions = {
    url: 'https://www.taskade.com/webhooks/zapier/taskdue/performlist',
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${bundle.authData.access_token}`,
    },
    params: {
      spaceId: bundle.inputData.space_id != null ? bundle.inputData.space_id : null,
      projectId: bundle.inputData.project_id != null ? bundle.inputData.project_id : null,
    },
  };

  return z
    .request('https://www.taskade.com/webhooks/zapier/taskdue/performlist', options)
    .then((response) => {
      response.throwForStatus();
      const results = response.json;

      return results.results;
    });
};

const performSubscribe = async (z: ZObject, bundle: Bundle) => {
  const options: HttpRequestOptions = {
    url: 'https://www.taskade.com/webhooks/zapier/subscribe',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${bundle.authData.access_token}`,
    },
    params: {},
    body: {
      hookUrl: bundle.targetUrl,
      triggerType: 'TaskDue',
      spaceId: bundle.inputData.space_id != null ? bundle.inputData.space_id : null,
      projectId: bundle.inputData.project_id != null ? bundle.inputData.project_id : null,
    },
  };

  return z
    .request('https://www.taskade.com/webhooks/zapier/subscribe', options)
    .then((response) => {
      response.throwForStatus();
      const results = response.json;

      // You can do any parsing you need for results here before returning them

      return results;
    });
};

const performUnsubscribe = async (z: ZObject, bundle: Bundle) => {
  const options: HttpRequestOptions = {
    url: 'https://www.taskade.com/webhooks/zapier/unsubscribe',
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${bundle.authData.access_token}`,
    },
    params: {
      // @ts-ignore
      hookId: bundle.subscribeData.hookId,
    },
  };

  return z.request('https://www.taskade.com/webhooks/zapier/unsubscribe', options);
  // return z.request(options).then((response) => z.JSON.parse(response.content));
};

export default {
  operation: {
    perform: perform,
    inputFields: [
      {
        key: 'space_id',
        type: 'string',
        label: 'Workspace or Folder',
        helpText:
          'Select the workspace or folder where the project is located. Leave blank to monitor all projects for due dates.',
        dynamic: 'get_all_spaces.id.name',
        required: false,
        list: false,
        altersDynamicFields: false,
      },
      {
        key: 'project_id',
        type: 'string',
        label: 'Project',
        helpText:
          'Select a project to monitor. Leave blank to monitor all projects in selected workspace or folder.',
        dynamic: 'get_all_projects.id.title',
        required: false,
        list: false,
        altersDynamicFields: false,
      },
    ],
    type: 'hook',
    performList: performList,
    performSubscribe: performSubscribe,
    performUnsubscribe: performUnsubscribe,
    sample: {
      spaceName: 'space name',
      projectName: 'project name',
      id: 'node-id',
      text: 'task content',
      isCompleted: false,
      assignees: [],
      taskStartDate: null,
      taskStartTime: null,
      taskStartTimezone: null,
      taskEndDate: '2022-06-16',
      taskEndTime: null,
      taskEndTimezone: 'Asia/Singapore',
    },
    outputFields: [
      { key: 'spaceName' },
      { key: 'projectName' },
      { key: 'id' },
      { key: 'text' },
      { key: 'isCompleted', type: 'boolean' },
      { key: 'taskStartDate' },
      { key: 'taskStartTime' },
      { key: 'taskStartTimezone' },
      { key: 'taskEndDate' },
      { key: 'taskEndTime' },
      { key: 'taskEndTimezone' },
    ],
  },
  key: 'task_due',
  noun: 'Task with Due Date',
  display: {
    label: 'Task Due',
    description: 'Triggers when a task is due.',
    hidden: false,
    important: true,
  },
};
