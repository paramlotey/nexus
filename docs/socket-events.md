# Socket.io Events

## Authentication

Clients connect using the existing JWT access token:

```ts
io(API_URL, {
  auth: {
    token: accessToken,
  },
});
```

Connections without a valid access token are rejected.

## Automatic Rooms

Every authenticated socket automatically joins:

```text
user:<userId>
```

This room is used for user-specific events such as notifications.

## Client to Server

### `workspace:join`

Joins a workspace realtime channel.

```json
{
  "workspaceId": "..."
}
```

The server verifies that the authenticated user is a `WorkspaceMember` before
joining `workspace:<workspaceId>`.

Acknowledgement:

```json
{
  "success": true
}
```

or:

```json
{
  "success": false,
  "error": "Workspace access denied"
}
```

### `workspace:leave`

```json
{
  "workspaceId": "..."
}
```

## Server to Client

### `notification:new`

Emitted to `user:<userId>` after a new Notification has been persisted.

```json
{
  "_id": "...",
  "workspaceId": "...",
  "userId": "...",
  "actorId": "...",
  "type": "TASK_ASSIGNED",
  "title": "New task assigned",
  "message": "You were assigned to \"Implement login\"",
  "entityType": "TASK",
  "entityId": "...",
  "metadata": {},
  "createdAt": "2026-09-20T15:00:00.000Z"
}
```

### `workspace:joined`

Emitted after successful workspace-room authorization.

### `workspace:left`

Emitted after leaving a workspace room.
