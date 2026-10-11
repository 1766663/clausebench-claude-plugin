#!/usr/bin/env node
// The registry, as tools an assistant can call (18).
//
// A stdio MCP server with no dependencies: it is installed into somebody else's repository, and a plugin that
// drags a package tree behind it is one people uninstall. Newline-delimited JSON-RPC 2.0 on stdin and stdout,
// which is what the stdio transport is.
//
// Nothing here decides anything about anybody's compliance. It answers what the registry holds and says when
// it does not hold it: "not in the registry" is an answer, and a guess dressed as one is the failure this
// whole product exists to prevent.

// A setting the user never filled can arrive as its own placeholder ("${user_config.api_key}") rather than empty:
// that is "not set", not a value.
const setting = (v) => { const t = (v || "").trim(); return !t || t.startsWith("${") ? "" : t; };
const BASE = (setting(process.env.CLAUSEBENCH_API_BASE) || "https://clausebench.com/api/v1").replace(/\/+$/, "");
// The sandbox key is public and documented (criterion 7 of spec 18): it answers on ten well-known records, so
// the plugin does something useful in the first minute without anybody asking us for anything.
const SANDBOX_KEY = "cbk_sandbox";
const KEY = setting(process.env.CLAUSEBENCH_API_KEY) || SANDBOX_KEY;
const USING_SANDBOX = KEY === SANDBOX_KEY;

const TOOLS = [
  {
    name: "resolve_vendors",
    description:
      "Match a dirty list of domains or company names against the vendor registry. Returns, for each input, either a confident match with the record's slug, a shortlist to choose from, or nothing. A domain that merely resembles a record is never a confident match.",
    inputSchema: {
      type: "object",
      properties: {
        inputs: {
          type: "array",
          items: { type: "string" },
          description: "Domains or names, e.g. [\"stripe.com\", \"Slack Technologies\", \"https://sentry.io/legal\"]",
        },
      },
      required: ["inputs"],
    },
  },
  {
    name: "vendor",
    description:
      "One vendor record by slug: contracting legal entity, country, transfer mechanism, UK transfer mechanism, the links to its DPA, sub-processor list and trust page, the data regions it offers, and when a person last confirmed the record.",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string", description: "The record's slug, e.g. \"stripe\"" } },
      required: ["slug"],
    },
  },
  {
    name: "subprocessor_summary",
    description:
      "A list of vendors summarised by jurisdiction and transfer mechanism, with the ones missing a DPA link or a sub-processor list named. Counting, not judging: no score and no verdict about anyone.",
    inputSchema: {
      type: "object",
      properties: { inputs: { type: "array", items: { type: "string" }, description: "Domains or names" } },
      required: ["inputs"],
    },
  },
  {
    name: "vendor_changes",
    description:
      "What changed in the registry since a moment — a DPA updated, a sub-processor list moved, a transfer mechanism changed — so a document that names these vendors can be brought up to date. Omit `slug` for everything.",
    inputSchema: {
      type: "object",
      properties: {
        since: { type: "string", description: "ISO timestamp; omit for the most recent changes" },
        slug: { type: "string", description: "One vendor's history, instead of the whole feed" },
        limit: { type: "number", description: "At most this many, default 50" },
      },
    },
  },
];

async function call(path, init = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${KEY}`, ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.headers || {}) },
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { error: text.slice(0, 400) };
  }
  if (!response.ok) {
    // The API refuses with a reason, never an empty answer that reads as missing data. Pass the reason on.
    const reason = body?.error || `The registry answered ${response.status}.`;
    throw new Error(USING_SANDBOX && response.status === 429
      ? `${reason} This is the public sandbox key; a key of your own has a quota.`
      : reason);
  }
  return body;
}

const note = (body) =>
  USING_SANDBOX
    ? { ...body, sandbox: "Answered on the public sandbox sample: ten well-known records and no others. An input that is missing here may still be in the registry." }
    : body;

async function runTool(name, args) {
  switch (name) {
    case "resolve_vendors":
      return note(await call("/vendors/resolve", { method: "POST", body: JSON.stringify({ inputs: args.inputs ?? [] }) }));
    case "vendor":
      return note(await call(`/vendors/${encodeURIComponent(String(args.slug ?? ""))}`));
    case "subprocessor_summary":
      return note(await call("/analyze/subprocessors", { method: "POST", body: JSON.stringify({ inputs: args.inputs ?? [] }) }));
    case "vendor_changes": {
      const query = new URLSearchParams();
      if (args.since) query.set("since", String(args.since));
      if (args.limit) query.set("limit", String(args.limit));
      const path = args.slug
        ? `/vendors/${encodeURIComponent(String(args.slug))}/changes`
        : "/changes";
      return note(await call(`${path}${query.size ? `?${query}` : ""}`));
    }
    default:
      throw new Error(`No such tool: ${name}`);
  }
}

// ---- the protocol ---------------------------------------------------------------------------------------

const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
const reply = (id, result) => send({ jsonrpc: "2.0", id, result });
const fail = (id, message) => send({ jsonrpc: "2.0", id, error: { code: -32000, message } });

async function handle(request) {
  const { id, method, params } = request;
  // A notification has no id and takes no answer.
  if (id === undefined || id === null) return;

  if (method === "initialize") {
    return reply(id, {
      protocolVersion: params?.protocolVersion ?? "2025-06-18",
      capabilities: { tools: {} },
      serverInfo: { name: "clausebench-registry", version: "0.1.0" },
    });
  }
  if (method === "tools/list") return reply(id, { tools: TOOLS });
  if (method === "tools/call") {
    try {
      const out = await runTool(params?.name, params?.arguments ?? {});
      return reply(id, { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] });
    } catch (e) {
      // An error the model can read and act on, rather than a dead tool call.
      return reply(id, { content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }], isError: true });
    }
  }
  if (method === "ping") return reply(id, {});
  return fail(id, `Unsupported method: ${method}`);
}

let buffer = "";
// Requests still in flight. Without this the server exits the moment stdin closes and an answer that was one
// fetch away is never written — which is what happens the first time anybody pipes a request into it to see
// whether it works.
let pending = 0;
let closed = false;
const done = () => { if (closed && pending === 0) process.exit(0); };

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let cut;
  while ((cut = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, cut).trim();
    buffer = buffer.slice(cut + 1);
    if (!line) continue;
    let request;
    try {
      request = JSON.parse(line);
    } catch {
      continue; // a line we cannot parse is not a request we can fail
    }
    pending += 1;
    void handle(request)
      .catch((e) => fail(request?.id ?? null, e instanceof Error ? e.message : String(e)))
      .finally(() => { pending -= 1; done(); });
  }
});
process.stdin.on("end", () => { closed = true; done(); });
