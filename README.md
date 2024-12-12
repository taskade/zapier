# Zapier
Zapier integration for Taskade.

## Overview
This repository contains the Zapier integration for Taskade. For more details on how to use the integration, check out the [Zapier Integration Guide](https://help.taskade.com/en/articles/8958540-zapier-integration).

## Features
- Automate task management and workflows.
- Connect Taskade with popular apps like Slack, Gmail, Google Sheets, and more.
- Trigger actions in Taskade based on events in other apps, or vice versa.

## Prerequisites
Before using this project, ensure you have the following:
- [Zapier CLI](https://docs.zapier.com/platform/build-cli/overview#quick-setup-guide) installed.
- A valid Taskade account.
- Node.js installed on your machine.
- Yarn package manager.

## Development Workflow

### Bump version
1. Update version in `package.json`

### Build
1. `yarn build`
2. `zapier build`
3. `zapier push`

### Log
1. `zapier logs`
2. `zapier logs --type=console`
3. `zapier logs --type=http --detailed`
