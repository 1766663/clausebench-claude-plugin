import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// `claude plugin validate` is the authoritative check and runs in CI beside this. These are the parts of the
// contract it does not look at — the ones that would otherwise be found by a user whose install silently loaded
// nothing, or whose tool call hung. No dependencies: run with `node --test tests/`.

const ROOT = "plugins/clausebench";
const manifest = JSON.parse(readFileSync(`${ROOT}/.claude-plugin/plugin.json`, "utf8"));
const marketplace = JSON.parse(readFileSync(".claude-plugin/marketplace.json", "utf8"));

const frontmatter = (file) => {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(readFileSync(file, "utf8"));
  assert.ok(match, `${file} has no frontmatter`);
  return Object.fromEntries(
    match[1].split("\n").filter((l) => l.includes(":")).map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]),
  );
};

const hook = (input, args = []) =>
  execFileSync("node", [`${ROOT}/scripts/new-dependency.mjs`, ...args], { input, encoding: "utf8" });

describe("the plugin loads, and points at files that exist", () => {
  it("the manifest names the plugin in kebab-case and nothing unknown at the top level", () => {
    assert.match(manifest.name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    const known = new Set([
      "$schema", "name", "displayName", "version", "description", "author", "homepage", "repository", "license",
      "keywords", "metadata", "defaultEnabled", "dependencies", "settings", "userConfig", "channels", "skills",
      "commands", "agents", "hooks", "mcpServers", "lspServers", "outputStyles", "workflows", "experimental",
    ]);
    for (const key of Object.keys(manifest)) assert.ok(known.has(key), `unknown top-level field "${key}" is stripped at load`);
    assert.ok(manifest.author?.name, "author.name is required when author is set");
    for (const field of ["version", "description"]) assert.ok(manifest[field], `missing ${field}`);
  });

  it("every path the manifest and the hooks reference starts with ./ or ${CLAUDE_PLUGIN_ROOT} and exists", () => {
    const paths = [];
    const collect = (value) => {
      if (typeof value === "string") {
        if (value.startsWith("./")) paths.push(value);
        for (const m of value.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}(\/[\w./-]+)/g)) paths.push(`.${m[1]}`);
      } else if (Array.isArray(value)) value.forEach(collect);
      else if (value && typeof value === "object") Object.values(value).forEach(collect);
    };
    collect(manifest);
    collect(JSON.parse(readFileSync(`${ROOT}/hooks/hooks.json`, "utf8")));
    assert.ok(paths.length > 0, "no bundled file is referenced at all");
    for (const p of paths) {
      assert.ok(!p.includes(".."), `${p} escapes the plugin root`);
      assert.ok(existsSync(join(ROOT, p.slice(2))), `${p} does not exist`);
    }
  });

  it("every skill and command carries the frontmatter that makes it findable", () => {
    const skills = readdirSync(`${ROOT}/skills`);
    assert.ok(skills.length > 0);
    for (const skill of skills) {
      const meta = frontmatter(`${ROOT}/skills/${skill}/SKILL.md`);
      assert.equal(meta.name, skill, `${skill}: the directory and the name must agree`);
      // The description is the only thing the model sees when deciding whether to load a skill: one that does
      // not say when to use it is a skill that never runs.
      assert.ok(meta.description.length > 80, `${skill}: description too short to choose by`);
      assert.ok(meta.description.toLowerCase().includes("use when"), `${skill}: the description never says when to use it`);
    }
    for (const command of readdirSync(`${ROOT}/commands`)) {
      assert.ok(frontmatter(`${ROOT}/commands/${command}`).description, `${command}: no description`);
    }
  });

  it("the hook runs a bundled script in exec form, so a path with a space stays one argument", () => {
    const entry = JSON.parse(readFileSync(`${ROOT}/hooks/hooks.json`, "utf8")).hooks.PostToolUse[0].hooks[0];
    assert.equal(entry.type, "command");
    assert.ok(Array.isArray(entry.args), "shell form would re-parse the substituted path");
    assert.doesNotMatch(entry.command, /[ /]/, "the command is the executable only when args is set");
  });

  it("the hook says nothing unless a dependency manifest gained something", () => {
    const run = (event) => hook(JSON.stringify(event));
    // A file that is not a manifest: silence.
    assert.equal(run({ tool_input: { file_path: "/x/readme.md", new_string: "stripe.com" } }), "");
    // Nonsense on stdin: silence, not a crash in the middle of somebody's edit.
    assert.equal(hook("not json"), "");
    // A real addition: named, with the libraries that talk to nobody left out.
    const out = run({
      tool_input: {
        file_path: "/x/package.json",
        old_string: '"dependencies": {\n  "next": "15"\n}',
        new_string: '"dependencies": {\n  "next": "15",\n  "@sentry/node": "^8",\n  "lodash": "^4"\n}',
      },
    });
    const context = JSON.parse(out).hookSpecificOutput.additionalContext;
    assert.ok(context.includes("@sentry/node"));
    assert.ok(!context.includes("lodash"), "a package that runs in this process is not a sub-processor");
    assert.ok(!context.includes("next"), "what was already there is not new");
    assert.match(context, /do not guess/i, "the hook must not invite a guess");
  });

  it("the hook says nothing when its setting is false, before reading anything", () => {
    assert.equal(hook(JSON.stringify({ tool_input: { file_path: "/x/package.json", new_string: '"stripe": "^14"' } }), ["false"]), "");
  });

  it("the marketplace entry points at the plugin in this repository, at the same version", () => {
    assert.ok(marketplace.name && marketplace.owner?.name && Array.isArray(marketplace.plugins));
    const entry = marketplace.plugins.find((p) => p.name === manifest.name);
    assert.ok(entry, "the marketplace does not list this plugin");
    assert.equal(entry.source, `./${ROOT}`);
    assert.ok(existsSync(entry.source.slice(2)));
    if (entry.version) assert.equal(entry.version, manifest.version, "the marketplace and the manifest disagree on the version");
  });

  it("nothing promises compliance", () => {
    const banned = /ensures compliance|guarantees|fully automated compliance|replaces a lawyer|attorney-approved|legally verified/i;
    const walk = (dir) =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : /\.(md|mjs|json)$/.test(e.name) ? [join(dir, e.name)] : []);
    for (const file of [...walk(ROOT), "README.md", ".claude-plugin/marketplace.json"]) {
      assert.doesNotMatch(readFileSync(file, "utf8"), banned, `${file} promises something it cannot`);
    }
  });
});

describe("the MCP server speaks the protocol", () => {
  const drive = (requests) =>
    execFileSync("node", [`${ROOT}/mcp/server.mjs`], {
      input: requests.map((r) => JSON.stringify(r)).join("\n") + "\n",
      encoding: "utf8",
      env: { ...process.env, CLAUSEBENCH_API_BASE: "http://127.0.0.1:1/never" },
    }).split("\n").filter(Boolean).map((l) => JSON.parse(l));

  it("answers initialize and lists its tools", () => {
    const [init, list] = drive([
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
      { jsonrpc: "2.0", id: 2, method: "tools/list" },
    ]);
    assert.equal(init.result.serverInfo.name, "clausebench-registry");
    assert.ok(init.result.capabilities.tools);
    const names = list.result.tools.map((t) => t.name);
    assert.ok(names.includes("resolve_vendors"));
    assert.ok(names.includes("vendor_changes"));
    for (const tool of list.result.tools) {
      assert.equal(tool.inputSchema.type, "object");
      assert.ok(tool.description.length > 60, `${tool.name}: too short to choose by`);
    }
  });

  it("a registry it cannot reach is an error the model can read, not a hang or a lie", () => {
    const [answer] = drive([{ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "vendor", arguments: { slug: "stripe" } } }]);
    assert.equal(answer.result.isError, true);
    assert.ok(answer.result.content[0].text.length > 0);
  });

  it("a notification is not answered, and an unknown method is refused", () => {
    const answers = drive([
      { jsonrpc: "2.0", method: "notifications/initialized" },
      { jsonrpc: "2.0", id: 9, method: "resources/list" },
    ]);
    assert.equal(answers.length, 1);
    assert.ok(answers[0].error.message.includes("resources/list"));
  });
});
