# Security

Please report a vulnerability in this plugin or in the clausebench API privately to **privacy@clausebench.com**
rather than in a public issue. We aim to acknowledge reports within three working days.

What the plugin can do on your machine:

- `mcp/server.mjs` — a stdio MCP server with no dependencies; it makes HTTPS requests to the clausebench API only.
- `scripts/new-dependency.mjs` — a `PostToolUse` hook on `Write|Edit` that exits at once unless the file is a
  dependency manifest, makes no network call, and can be switched off in the plugin settings.

Neither installs packages, reads credentials, or touches files outside the tool call it is handed.
More about clausebench's security: https://clausebench.com/trust/security
