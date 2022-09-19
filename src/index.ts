import { version as platformVersion } from 'zapier-platform-core';

import { authentication } from './authentication';
import CreateTask from './creates/create_task';
import GetAllBlocks from './triggers/get_all_blocks';
import GetAllProjects from './triggers/get_all_projects';
import GetAllSpaces from './triggers/get_all_spaces';
import TaskDue from './triggers/task_due';

const { version } = require('../package.json');

export default {
  version,
  platformVersion,
  authentication,

  triggers: {
    [GetAllBlocks.key]: GetAllBlocks,
    [GetAllProjects.key]: GetAllProjects,
    [GetAllSpaces.key]: GetAllSpaces,
    [TaskDue.key]: TaskDue,
  },

  creates: {
    [CreateTask.key]: CreateTask,
  },
};
