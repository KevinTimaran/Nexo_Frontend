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
const discovery = { lifecycle: "generated", archetype: "business", facts: [{ key: "suggestion:a:idea", value: "Proposal", status: "unconfirmed", sourceMessageIds: ["assistant-a"], kind: "suggestion", memoryState: "rejected", origin: "ai_suggestion", decisionEventId: "reject-a" }], requiredTopics: [], askedQuestionKeys: [], answeredQuestionKeys: [], generationLedger: {}, tombstones: ["ai:deleted"] } as const;
await httpServices.workspace.save(project.id, { nodes: [node("my-edit")], relations: [] }, [], discovery as never);
assert.equal(server.revision, 3);
assert.deepEqual(server.map.nodes.map((item) => item.id).sort(), ["my-edit", "other-user"]);
assert.deepEqual(attempts.slice(-2).map((item) => item.expectedRevision), [1, 2]);
assert.equal((server.discovery as typeof discovery).facts[0].memoryState, "rejected");
assert.deepEqual((server.discovery as typeof discovery).facts[0].sourceMessageIds, ["assistant-a"]);

const pendingKey = `nexo.pending.workspace.${project.id}`;
storage.set(pendingKey, JSON.stringify({ map: server.map, messages: server.messages, discovery, operationId: "recover-same-operation", baseRevision: 3 }));
const recovered = await httpServices.workspace.load(project.id, "es");
assert.equal(recovered?.revision, 4);
assert.equal(attempts.at(-1)?.operationId, "recover-same-operation");
assert.equal(storage.has(pendingKey), false);
await httpServices.workspace.load(project.id, "es");
assert.equal(server.revision, 4);
assert.equal((server.discovery as typeof discovery).facts[0].decisionEventId, "reject-a");

const canonicalNode = {
  ...node("fact-intent", "intent"),
  semanticKind: "user_fact",
  semanticState: "confirmed",
  provenanceOrigin: "user_message",
  sourceFactIds: ["intent"],
  sourceMessageIds: ["hardware-user-1"],
  manuallyEditedFields: ["title"],
  layout: { board2d: { x: 340, y: 180 }, neural3d: { x: 4, y: -2, z: 8 } },
};
const canonicalRelation = {
  id: "relation-intent-customer",
  from: canonicalNode.id,
  to: "customer-node",
  type: "supports",
  semanticType: "supports",
  semanticKey: "intent->customers:supports",
  origin: "ai_initial",
  sourceFactIds: ["intent", "customers"],
  sourceMessageIds: ["hardware-user-1", "hardware-user-2"],
};
const graphDiscovery = { ...discovery, tombstones: ["deleted-semantic-key"] };
await httpServices.workspace.save(project.id, { nodes: [canonicalNode], relations: [canonicalRelation] }, [], graphDiscovery as never);
const graphReload = await httpServices.workspace.load(project.id, "es");
assert.equal(graphReload?.map.nodes[0].id, "fact-intent");
assert.equal(graphReload?.map.nodes[0].semanticState, "confirmed");
assert.deepEqual(graphReload?.map.nodes[0].sourceMessageIds, ["hardware-user-1"]);
assert.deepEqual(graphReload?.map.nodes[0].layout, canonicalNode.layout);
assert.deepEqual(graphReload?.map.nodes[0].manuallyEditedFields, ["title"]);
assert.equal(graphReload?.map.relations[0].id, canonicalRelation.id);
assert.equal(graphReload?.map.relations[0].semanticType, "supports");
assert.deepEqual(graphReload?.map.relations[0].sourceFactIds, ["intent", "customers"]);
assert.ok(graphReload?.discovery?.tombstones.includes("deleted-semantic-key"));
console.log("HTTP revision conflicts, tombstones, operation IDs and restart replay passed.");
