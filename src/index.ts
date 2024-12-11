import 'cross-fetch/polyfill';

import { version as platformVersion } from 'zapier-platform-core';

import { authentication } from './authentication';
import CreateTask from './creates/createTask';
import GetAllAssignableMembers from './triggers/getAllAssignableMembers';
import GetAllBlocks from './triggers/getAllBlocks';
import GetAllProjects from './triggers/getAllProjects';
import GetAllSpaces from './triggers/getAllSpaces';
import TaskDue from './triggers/taskDue';

const { version } = require('../package.json');

export default {
  version,
  platformVersion,
  authentication,

  triggers: {
    [GetAllBlocks.key]: GetAllBlocks,
    [GetAllProjects.key]: GetAllProjects,
    [GetAllSpaces.key]: GetAllSpaces,
    [GetAllAssignableMembers.key]: GetAllAssignableMembers,
    [TaskDue.key]: TaskDue,
  },

  creates: {
    [CreateTask.key]: CreateTask,
  },
};
