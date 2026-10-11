# Changelog

## 0.2.1 — 2026-10-11
- A setting left unset arrives as its placeholder on a fresh install; the MCP server now treats that as unset and uses the sandbox key and the default address.

## 0.2.0 — 2026-10-11
- Published as its own repository and marketplace (`/plugin marketplace add 1766663/clausebench-claude-plugin`).
- The dependency hook can be switched off in the plugin settings ("Notice new dependencies").
- The description and README state exactly what leaves your machine.
- `hooks/hooks.json` in the current format.

## 0.1.0 — 2026-09-29
- First version: the registry MCP server, `/clausebench:subprocessors`, `/clausebench:dpa`, three skills and the
  dependency hook.
