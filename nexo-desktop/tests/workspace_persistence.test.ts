import assert from "node:assert/strict";
import { httpServices } from "../src/services/http";

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
  },
});

const project = { id: "http-revision-test", name: "Ferretería", description: "", status: "draft", icon: "lightbulb", updatedAt: "2026-11-09T00:00:00Z", nodeCount: 0 };
const node = (id: string, semanticKey = id) => ({ id, semanticKey, title: id, description: id, kind: "concept", metadata: "", status: "confirmed", x: 0, y: 0 });
let server = { project, map: { nodes: [] as ReturnType<typeof node>[], relations: [] }, messages: [] as unknown[], discovery: undefined as unknown, revision: 0 };
const seen = new Set<string>();
const attempts: Array<{ operationId: string; expectedRevision: number }> = [];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

globalThis.fetch = async (_input, init) => {
  if (init?.method !== "PUT") return json(server);
  const request = JSON.parse(String(init.body));
  attempts.push({ operationId: request.operationId, expectedRevision: request.expectedRevision });
  if (seen.has(request.operationId)) return json(server);
  if (request.expectedRevision !== server.revision) return json(server, 409);
  seen.add(request.operationId);
  server = { ...server, map: request.map, messages: request.messages, discovery: request.discovery, revision: server.revision + 1 };
  return json(server);
};

const loaded = await httpServices.workspace.load(project.id, "es");
assert.equal(loaded?.revision, 0);
await httpServices.workspace.save(project.id, { nodes: [node("first")], relations: [] }, [], undefined);
assert.equal(server.revision, 1);
assert.equal(server.map.nodes.length, 1);

server = { ...server, revision: 2, map: { nodes: [node("deleted-ai", "ai:deleted"), node("other-user")], relations: [] } };
const discovery = { lifecycle: "generated", archetype: "business", facts: [], requiredTopics: [], askedQuestionKeys: [], answeredQuestionKeys: [], generationLedger: {}, tombstones: ["ai:deleted"] } as const;
await httpServices.workspace.save(project.id, { nodes: [node("my-edit")], relations: [] }, [], discovery as never);
assert.equal(server.revision, 3);
assert.deepEqual(server.map.nodes.map((item) => item.id).sort(), ["my-edit", "other-user"]);
assert.deepEqual(attempts.slice(-2).map((item) => item.expectedRevision), [1, 2]);

const pendingKey = `nexo.pending.workspace.${project.id}`;
storage.set(pendingKey, JSON.stringify({ map: server.map, messages: server.messages, discovery, operationId: "recover-same-operation", baseRevision: 3 }));
const recovered = await httpServices.workspace.load(project.id, "es");
assert.equal(recovered?.revision, 4);
assert.equal(attempts.at(-1)?.operationId, "recover-same-operation");
assert.equal(storage.has(pendingKey), false);
await httpServices.workspace.load(project.id, "es");
assert.equal(server.revision, 4);
console.log("HTTP revision conflicts, tombstones, operation IDs and restart replay passed.");
