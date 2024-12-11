import moment from 'moment-timezone';
import { Bundle, ZObject } from 'zapier-platform-core';

interface Zap {
  user: {
    timezone: string;
  };
}

interface DateRange {
  start: {
    date: string;
    time: string;
    timezone: string;
  };
  end?: {
    date: string;
    time: string;
    timezone: string;
  };
}

interface Task {
  id: string;
}

interface CreateTaskInput {
  taskId?: string;
  contentType: string;
  content: string;
  placement: string;
}

interface CreateTasksResponseOk {
  ok: true;
  item: Task[];
}

interface CreateTasksResponseError {
  ok: false;
  message: string;
}

type CreateTasksResponse = CreateTasksResponseOk | CreateTasksResponseError;

interface CreateDateResponseOk {
  ok: true;
  item: Task;
}

interface CreateDateResponseError {
  ok: false;
  message: string;
}

type CreateDateResponse = CreateDateResponseOk | CreateDateResponseError;

interface CreateAssigneeResponseOk {
  ok: true;
  item: Task;
}

interface CreateAssigneeResponseError {
  ok: false;
  message: string;
}

type CreateAssigneeResponse = CreateAssigneeResponseOk | CreateAssigneeResponseError;

function isZap(zap: any): zap is Zap {
  return typeof zap === 'object' && 'user' in zap && typeof zap.user === 'object';
}

const taskDueDateReqVariables = (z: ZObject, bundle: Bundle) => {
  let zapierProfileTimezone = 'Etc/UTC';
  if (isZap(bundle.meta.zap)) {
    zapierProfileTimezone = bundle.meta.zap.user.timezone;
  }

  let date: DateRange | null = null;

  if (bundle.inputData.start_date != null && bundle.inputData.end_date == null) {
    const startMoment = moment.tz(bundle.inputData.start_date, zapierProfileTimezone);
    date = {
      start: {
        date: startMoment.format('YYYY-MM-DD'),
        time: startMoment.format('HH:mm:ss'),
        timezone: zapierProfileTimezone,
      },
    };
  } else if (bundle.inputData.start_date != null && bundle.inputData.end_date != null) {
    const startMoment = moment.tz(bundle.inputData.start_date, zapierProfileTimezone);
    date = {
      start: {
        date: startMoment.format('YYYY-MM-DD'),
        time: startMoment.format('HH:mm:ss'),
        timezone: zapierProfileTimezone,
      },
    };
    const endMoment = moment.tz(bundle.inputData.end_date, zapierProfileTimezone);
    date.end = {
      date: endMoment.format('YYYY-MM-DD'),
      time: endMoment.format('HH:mm:ss'),
      timezone: zapierProfileTimezone,
    };
  } else if (bundle.inputData.start_date == null && bundle.inputData.end_date != null) {
    const startMoment = moment.tz(bundle.inputData.end_date, zapierProfileTimezone);
    date = {
      start: {
        date: startMoment.format('YYYY-MM-DD'),
        time: startMoment.format('HH:mm:ss'),
        timezone: zapierProfileTimezone,
      },
    };
  } else {
    return null;
  }

  return date;
};

const perform = async (z: ZObject, bundle: Bundle) => {
  let task: CreateTaskInput = {
    contentType: 'text/markdown',
    content: bundle.inputData.content,
    placement: 'beforeend',
  };
  if (bundle.inputData.block_id != null) {
    task = {
      taskId: bundle.inputData.block_id,
      contentType: 'text/markdown',
      content: bundle.inputData.content,
      placement: 'beforeend',
    };
  }
  const createTaskResponse = await z.request({
    url: `https://www.taskade.com/api/v1/projects/${bundle.inputData.project_id}/tasks`,
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${bundle.authData.access_token}`,
    },
    body: JSON.stringify({
      tasks: [task],
    }),
  });

  const createTaskData: CreateTasksResponse = createTaskResponse.json;

  if (!createTaskData.ok) {
    throw new z.errors.Error(createTaskData.message, 'invalid_input', 400);
  }

  const taskId = createTaskData.item[0]?.id ?? null;
  if (taskId == null) {
    throw new z.errors.Error('Missing task ID', 'invalid_input', 400);
  }

  const dateAddon = taskDueDateReqVariables(z, bundle);
  if (dateAddon != null) {
    const createDateResponse = await z.request({
      url: `https://www.taskade.com/api/v1/projects/${bundle.inputData.project_id}/tasks/${taskId}/date`,
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${bundle.authData.access_token}`,
      },
      body: JSON.stringify(dateAddon),
    });

    const createDateData: CreateDateResponse = createDateResponse.json;

    if (!createDateData.ok) {
      throw new z.errors.Error(createDateData.message, 'invalid_input', 400);
    }
  }

  if (bundle.inputData.member_id != null) {
    const createAssigneeResponse = await z.request({
      url: `https://www.taskade.com/api/v1/projects/${bundle.inputData.project_id}/tasks/${taskId}/assignees`,
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${bundle.authData.access_token}`,
      },
      body: JSON.stringify({ handles: [bundle.inputData.member_id] }),
    });

    const createAssigneeData: CreateAssigneeResponse = createAssigneeResponse.json;

    if (!createAssigneeData.ok) {
      throw new z.errors.Error(createAssigneeData.message, 'invalid_input', 400);
    }
  }

  return { taskId };
};

export default {
  key: 'create_task',
  noun: 'Task',
  display: {
    label: 'Create Task',
    description: 'Creates a Task in Taskade',
    hidden: false,
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
      taskId: '099630d4-267e-4b22-894b-08b69f3a4d79',
    },
    outputFields: [{ key: 'taskId' }],
    perform: perform,
  },
};
