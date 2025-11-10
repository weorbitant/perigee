## perigee service for Slack bot

## 1. Description

Backend service to support *`@perigee`* bot. This is a bot addresseda in principle to pick the content of the message which triggered a thread and persist in some storage. So, it is intended to be called from a _side_ thread and **not** from the main conversation channel


## 2. Dependencies

To be defined, but for now: 

- A Notion page with a database you want store the information
- A service to run docker containers (k8s, app containers, app services, etc.). You could host on AWS or wherever indeed.

## 3. Configuration

### Environment

You will require to set the following environment variables (injecting on environment or via .env for development):
- `LOGGING_LEVEL`: `debug|info|warn|error`. Default `info`.
- `PORT`: port number. Default `5555`.
- `NOTION_INTEGRATION_TOKEN`: the integration token created in Notion for the pages you want to query over
- `NOTION_DB_ID`: database id in notion to persist and retrieve items
- `NOTION_API_VERSION`
- `SLACK_PERIGEE_APP_TOKEN`
- `SLACK_PERIGEE_BOT_TOKEN`
- `SLACK_PERIGEE_SIGNING_SECRET`

### Endpoints

TBD