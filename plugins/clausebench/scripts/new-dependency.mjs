#!/usr/bin/env node
// A new dependency is a new company (18, 23).
//
// The question "who is this vendor, where are they registered, and do they publish a DPA" is asked, if it is
// asked at all, months later, by somebody filling in a sub-processor list from memory. The moment it can be
// answered cheaply is the moment the package is added — before it is in production and before anybody has to
// argue for taking it out again.
//
// This hook does no network call of its own. A hook that reached out on every edit would be slow and rude; it
// names what was added and leaves the looking-up to the assistant, which has the registry tools already.
//
// Its scope: it reads the one tool call it is handed, and acts only when the file written is a dependency manifest
// (the list below). Any other edit — any other file — ends the script before anything in it is looked at. It reads
// no other file, no environment variable and nothing outside the project.

import { basename } from "node:path";

const MANIFESTS = new Set([
  "package.json", "requirements.txt", "pyproject.toml", "Gemfile", "go.mod", "composer.json",
  "docker-compose.yml", "docker-compose.yaml",
]);

// Packages that run in the caller's own process and talk to nobody are not sub-processors. This is a short
// list of obvious cases, not a judgement: anything not here is offered to the assistant to decide.
const NOT_A_VENDOR = /^(@types\/|eslint|prettier|typescript$|vitest|jest|tsx$|tsup$|rimraf$|dotenv$|zod$|lodash)/;

const read = async () => {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  return text;
};

const packagesIn = (text) => {
  const found = new Set();
  // A dependency line in any of the manifests above: a quoted key, a bare requirement, a module path.
  for (const m of text.matchAll(/"([@a-z0-9][\w@./-]{1,80})"\s*:\s*"[^"]*"/gi)) found.add(m[1]);
  for (const m of text.matchAll(/^\s*([a-z0-9][\w.-]{1,60})\s*(?:[=<>~!]=|>=|<=)/gim)) found.add(m[1]);
  for (const m of text.matchAll(/^\s+([a-z0-9.-]+\/[\w.\-/]+)\s+v[\d.]/gim)) found.add(m[1]);
  // An image or a hostname in compose is a service, not a package, and it is the strongest signal of all.
  for (const m of text.matchAll(/\b([a-z0-9-]+(?:\.[a-z0-9-]+)+\.[a-z]{2,})\b/g)) found.add(m[1]);
  return found;
};

// Switched off in the plugin's settings ("Notice new dependencies"): leave at once, without reading anything.
if (String(process.argv[2] ?? "true").trim().toLowerCase() === "false") process.exit(0);

try {
  const event = JSON.parse((await read()) || "{}");
  const file = String(event?.tool_input?.file_path ?? "");
  if (!file || !MANIFESTS.has(basename(file))) process.exit(0);

  // What the edit put there, minus what it took away. A Write carries the whole file, so everything in it is
  // "added" — which is right the first time and noisy afterwards, so a Write is only reported when the file is
  // small enough to be a first version.
  const input = event.tool_input ?? {};
  const added = input.new_string ?? (typeof input.content === "string" && input.content.length < 4000 ? input.content : "");
  if (!added) process.exit(0);
  const before = packagesIn(String(input.old_string ?? ""));
  const names = [...packagesIn(String(added))].filter((n) => !before.has(n) && !NOT_A_VENDOR.test(n)).slice(0, 12);
  if (!names.length) process.exit(0);

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext:
        `${basename(file)} gained: ${names.join(", ")}. If any of these is a hosted service rather than a library ` +
        `that runs in this process, it is a new sub-processor. Resolve them with the clausebench-registry ` +
        `\`resolve_vendors\` tool and tell the user, in one short paragraph, the contracting legal entity, the ` +
        `country and whether a DPA link is on record — and say plainly which ones the registry does not hold. ` +
        `Do not look an entity up elsewhere and do not guess one. If none of them is a hosted service, say nothing.`,
    },
  }));
} catch {
  // A hook that fails must not be an event in the conversation: the edit succeeded either way.
  process.exit(0);
}
