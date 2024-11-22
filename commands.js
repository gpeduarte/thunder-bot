import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

const SEARCH_COMMAND = {
  name: 'search',
  type: 1,
  description: 'Lookup vehicle info by common name',
  options: [
    {
      type: 3,
      name: 'vehicle',
      description: 'Vehicle to lookup',
      required: true,
    },
  ],
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const INFO_COMMAND = {
  name: 'info',
  type: 1,
  description: 'Lookup vehicle info by ID',
  options: [
    {
      type: 3,
      name: 'id',
      description: 'Identification to lookup',
      required: true,
    },
  ],
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const ALL_COMMANDS = [
  SEARCH_COMMAND, INFO_COMMAND
];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
