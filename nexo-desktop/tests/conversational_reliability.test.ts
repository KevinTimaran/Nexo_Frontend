import assert from "node:assert/strict";
import fs from "node:fs";
import type { AssistantMessage, CognitiveInsightUIBlock, ConceptMap, DiscoveryState, Message, UserMessage, Workspace } from "../src/domain/types";

// Minimal localStorage so the mock persistence layer behaves as in the app.
const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
  },
});

const { archetypeFor, initialDiscovery, recordUserInput } = await import("../src/services/ai/discovery");
const { classifyTurnIntent, isDefineIdeaRequest } = await import("../src/services/ai/intent");
const { appendUserMessageOnce, orchestrateAssistantTurn, planChatTurn, resolveQuestionLead, upsertAssistantTurn } = await import("../src/services/ai/chatOrchestration");
const { replyWithValidation, ResponseValidationError, validateAssistantResponse, visibleRationale } = await import("../src/services/ai/responseValidation");
const { selectCognitiveAssistance } = await import("../src/services/ai/cognitiveAssistance");
const { normalizeGenerativeUIBlock } = await import("../src/services/ai/generativeUi");
const { buildUserPrompt, getSystemInstruction } = await import("../src/services/ai/prompts");
const { useWorkspaceStore } = await import("../src/store/useWorkspaceStore");
const { mockServices } = await import("../src/services/mock");

const emptyMap: ConceptMap = { nodes: [], relations: [] };
let counter = 0;
const user = (text: string): UserMessage => ({ id: `u${++counter}`, eventId: `e${counter}`, role: "user", createdAt: "2026-11-10T00:00:00Z", text });
const assistant = (replyTo: string, text: string, extra: Partial<AssistantMessage> = {}): AssistantMessage => ({ id: `a${++counter}`, role: "assistant", createdAt: "2026-11-10T00:00:00Z", text, replyTo, requestId: replyTo, ...extra });
const ctx = (over: Partial<Parameters<typeof validateAssistantResponse>[1]> = {}) => ({
  projectName: "App de citas",
  map: emptyMap,
  history: [] as Message[],
  userText: "I want to create a dating app.",
  intent: "other" as const,
  lang: "en" as const,
  ...over,
});

const canned = (id = "cognitive:canned"): CognitiveInsightUIBlock => ({
  type: "cognitive_insight", id, version: 1, mode: "blind_spot",
  title: "El problema puede no ser la falta de herramientas",
  statement: "Los usuarios podrían disponer ya de calendarios o gestores de tareas; la dificultad puede estar en convertir requisitos académicos en acciones claras.",
  rationale: "Has descrito «I want to create a dating app.». Nada está confirmado.",
  linkedFactIds: ["intent"], linkedNodeIds: [], status: "proposed", explorationStatus: "idle", actionIds: [], validationOptions: ["Entrevistar estudiantes"],
});

// ───────────── Scenario A — dating application ─────────────
{
  const m1 = user("I want to create a dating app.");
  let d = recordUserInput(initialDiscovery(false), m1);
  assert.equal(d.archetype, "software");
  assert.equal(d.facts.find((f) => f.key === "intent")?.value, m1.text);

  const observed = user("I would like help defining my idea because it is not very clear yet");
  const m2 = user("I am not sure how to define my idea.");
  for (const meta of [observed, m2]) {
    assert.ok(isDefineIdeaRequest(meta.text), `meta request not detected: ${meta.text}`);
    assert.equal(classifyTurnIntent(meta.text, true), "define_idea");
    const after = recordUserInput(d, meta);
    assert.deepEqual(after.facts, d.facts, "A request for help must never be stored as a project fact");
    const plan = planChatTurn({ text: meta.text, discovery: after, map: emptyMap, history: [] });
    assert.equal(plan.primary, "conversation");
    assert.equal(plan.maxPrimaryComponents, 0);
  }
  // The same sentence as a very first message must not become the project intent either.
  assert.equal(recordUserInput(initialDiscovery(false), observed).facts.length, 0);
  // ...but a first message that states a goal AND admits doubt keeps the goal.
  assert.equal(recordUserInput(initialDiscovery(false), user("I want to create a dating app but I am not sure how to define it")).facts[0]?.key, "intent");

  // The deterministic fallback no longer invents domain content for software projects.
  const withDetail = recordUserInput(d, user("It would connect people who share hobbies instead of only photos"));
  assert.equal(selectCognitiveAssistance(withDetail, emptyMap), undefined);

  // Observed failure: calendars / students for a dating app is rejected, never rendered.
  const bad = validateAssistantResponse(assistant(observed.id, "Podrías ayudar a los estudiantes con un gestor de tareas y un calendario académico."), ctx({ userText: observed.text, history: [m1].filter(Boolean) as Message[] }));
  assert.equal(bad.ok, false);
  assert.ok(bad.fatal.some((issue) => issue.code === "foreign_domain"));
  const cardOnly = validateAssistantResponse(assistant(observed.id, "Let's explore what makes your dating app different.", { ui: canned() }), ctx({ userText: observed.text, intent: "define_idea", discovery: d }));
  assert.equal(cardOnly.ok, true);
  assert.equal(cardOnly.message.ui, undefined, "No validation card for a request to define the idea");
  const good = validateAssistantResponse(assistant(observed.id, "Totally normal at this stage. A few directions for a dating app: matching by shared interests, by intent (friends vs. relationships), or by local events. Which one feels closest to what you imagine?"), ctx({ userText: observed.text, intent: "define_idea", discovery: d }));
  assert.equal(good.ok, true, JSON.stringify(good.fatal));
  assert.equal(good.message.action, "chat");

  // "appears" box never quotes the user.
  assert.equal(visibleRationale("Has descrito «I want to create a dating app.». Nada está confirmado."), "");
  assert.equal(visibleRationale("Why this appears: You said \"Hello, I have an idea for a dating app.\""), "");
  assert.notEqual(visibleRationale("Conviene aclarar qué hace diferente a tu app antes de diseñar funciones."), "");

  // The prompt carries the project identity and the intent, and never replays cognitive cards.
  const prompt = buildUserPrompt({ phase: "PHASE_1_DISCOVERY", lang: "en", userMessage: observed.text, projectName: "App de citas", turnIntent: "define_idea", messageHistory: [assistant(m1.id, "Hi", { ui: canned() })] });
  assert.ok(prompt.includes("PROYECTO ACTIVO") && prompt.includes("App de citas"));
  assert.ok(prompt.includes("INTENCIÓN DEL TURNO"));
  assert.ok(!prompt.includes("calendarios o gestores de tareas"), "Stale cognitive cards must not be replayed to the model");
}

// ───────────── archetype detection no longer uses substrings ─────────────
assert.equal(archetypeFor("I am happy with the explanation"), "general");
assert.equal(archetypeFor("Quiero abrir una ferretería de barrio"), "business");
assert.equal(archetypeFor("Quiero hacer una tesis sobre deserción"), "research");

// ───────────── Scenario B — hardware store ─────────────
{
  const m1 = user("Quiero abrir una ferretería en mi barrio porque la gente compra materiales equivocados");
  const d = recordUserInput(initialDiscovery(false), m1);
  assert.equal(d.archetype, "business");
  const c = ctx({ projectName: "Ferretería", userText: m1.text, lang: "es", discovery: d });
  const soft = validateAssistantResponse(assistant(m1.id, "Podrías lanzar una aplicación móvil con base de datos de clientes y un backend propio."), c);
  assert.equal(soft.ok, false, "Software-specific assumptions are rejected for a hardware store");
  const ok = validateAssistantResponse(assistant(m1.id, "Para entender el negocio conviene mirar quiénes compran, dónde está la competencia más cercana y cuánta inversión inicial necesitas. ¿Qué tipo de clientes te imaginas?"), c);
  assert.equal(ok.ok, true, JSON.stringify(ok.fatal));
}

// ───────────── Scenario C — academic research ─────────────
{
  const m1 = user("Quiero hacer una tesis sobre por qué estudiantes abandonan ingeniería");
  const d = recordUserInput(initialDiscovery(false), m1);
  assert.equal(d.archetype, "research");
  const c = ctx({ projectName: "Tesis deserción", userText: m1.text, lang: "es", discovery: d });
  assert.equal(validateAssistantResponse(assistant(m1.id, "Define tu modelo de negocio y la monetización de la investigación."), c).ok, false);
  assert.equal(validateAssistantResponse(assistant(m1.id, "Conviene precisar la pregunta de investigación, la población de estudiantes y el método (encuestas o entrevistas). ¿Con qué población trabajarías?"), c).ok, true, "Students are legitimate here because the user mentioned them");
}

// ───────────── Scenario D — context isolation ─────────────
{
  const store = useWorkspaceStore.getState();
  const project = (id: string, name: string) => ({ id, name, description: "", status: "draft" as const, icon: "lightbulb" as const, updatedAt: "", nodeCount: 0 });
  const dating: Workspace = { project: project("p-dating", "App de citas"), map: emptyMap, messages: [user("I want to create a dating app.")], discovery: recordUserInput(initialDiscovery(false), user("I want to create a dating app.")) };
  const hardware: Workspace = { project: project("p-hw", "Ferretería"), map: emptyMap, messages: [user("Quiero abrir una ferretería")], discovery: recordUserInput(initialDiscovery(false), user("Quiero abrir una ferretería")) };
  store.setWorkspace(dating);
  store.setWorkspace(hardware);
  const live = useWorkspaceStore.getState();
  assert.equal(live.workspace?.project.id, "p-hw");
  assert.ok(live.workspace?.messages.every((m) => !/dating/i.test(m.text)));
  assert.ok(live.workspace?.discovery?.facts.every((f) => !/dating/i.test(f.value)));
  assert.ok(live.discoveryMessages.every((m) => !/dating/i.test(m.content)));
  store.setWorkspace(null);
  assert.equal(useWorkspaceStore.getState().discoveryMessages.length, 1, "Clearing the workspace resets the conversation view");
  assert.deepEqual(useWorkspaceStore.getState().discoverySelectedOptions, {});

  // A hardware answer that drifts into the other project's domain is rejected.
  const leak = validateAssistantResponse(assistant("x", "Podrías añadir swipe y matches para atraer más clientes."), ctx({ projectName: "Ferretería", userText: "Quiero abrir una ferretería", lang: "es", discovery: hardware.discovery }));
  assert.equal(leak.ok, false);
  assert.ok(leak.fatal.some((i) => i.code === "foreign_domain"));

  // Source-level guards for the async races that cannot run without a DOM.
  const view = fs.readFileSync("src/features/workspace/WorkspaceView.tsx", "utf8");
  assert.ok(view.includes("let cancelled = false;") && view.includes("return () => { cancelled = true; };"), "Workspace load must be cancellable");
  assert.ok((view.match(/latestNow\.project\.id !== latest\.project\.id/g) ?? []).length >= 2, "Research and validation must re-check the project after awaiting");
  assert.ok(!view.includes("Antes de pedirte otro dato"), "Canned replacement text must be gone");
  assert.ok(view.includes("replyWithValidation"), "Main chat must go through the validation boundary");
  assert.ok(fs.readFileSync("src/features/spatial/SpatialChatPanel.tsx", "utf8").includes("replyWithValidation"), "Spatial chat must use the same pipeline");
}

// ───────────── Scenario E/G — 16 messages, no repeated or unrelated cards ─────────────
{
  const script = [
    "Quiero crear una app de citas para personas que comparten aficiones",
    "No estoy seguro de cómo definir mi idea",
    "¿Qué la haría diferente de otras apps?",
    "Creo que la gente está cansada de los perfiles basados solo en fotos",
    "Mi público serían adultos de 25 a 35 años en ciudades medianas",
    "También quiero enfocarme en amistades además de pareja",
    "¿Qué riesgos ves?",
    "No lo sé todavía",
    "Decidí que empezaremos solo en una ciudad",
    "Propón ideas accionables para el lanzamiento",
    "Cuéntame más sobre cómo verificar perfiles",
    "Solo quiero seguir explicando",
    "El modelo sería gratuito con funciones premium",
    "¿Cómo puedo mejorar la seguridad de los usuarios?",
    "Haz una hoja de ruta para los primeros 90 dias",
    "Gracias, eso es todo por ahora",
  ];
  let discovery = initialDiscovery(false);
  let messages: Message[] = [];
  for (const text of script) {
    const u = user(text);
    messages = appendUserMessageOnce(messages, u);
    discovery = recordUserInput(discovery, u);
    const plan = planChatTurn({ text, discovery, map: emptyMap, history: messages });
    // A misbehaving provider attaches the same canned card to every answer.
    const raw = assistant(u.id, "Entiendo. Sigamos afinando tu app de citas.", { ui: canned("cognitive:always"), action: "questionnaire", readyForStructuring: true });
    const checked = validateAssistantResponse(raw, ctx({ userText: text, lang: "es", intent: classifyTurnIntent(text, true), discovery, history: messages.slice(0, -1) }));
    const shown = orchestrateAssistantTurn(checked.message, plan, messages);
    messages = upsertAssistantTurn(messages, shown);
    if (plan.maxPrimaryComponents === 0) assert.equal(shown.ui, undefined, `Ordinary conversation must not trigger a card: "${text}"`);
    assert.ok(!/calendario|estudiante|gestor de tareas/i.test(shown.text));
  }
  const cards = messages.filter((m) => m.role === "assistant" && m.ui);
  assert.ok(cards.length <= 1, `Same card must never repeat (got ${cards.length})`);
  assert.equal(messages.filter((m) => m.role === "user").length, script.length, "No user message is lost");
  assert.equal(messages.filter((m) => m.role === "assistant").length, script.length, "Exactly one answer per question");
  assert.ok(discovery.facts.some((f) => f.key === "intent" && /citas/.test(f.value)), "The original idea is still in memory after 16 turns");
  assert.ok(!discovery.facts.some((f) => /estudiante|calendario/i.test(f.value)));
  // Idempotent replays.
  assert.equal(upsertAssistantTurn(messages, messages[messages.length - 1] as AssistantMessage).length, messages.length);
}

// ───────────── Scenario F — recovery ─────────────
{
  const c = ctx({ userText: "I want to create a dating app and need ideas", discovery: initialDiscovery(false) });
  const base = (text: string) => ({ message: assistant("u", text), newNodes: [], newRelations: [] });

  // Malformed structured output is dropped, not repaired with invented content.
  assert.equal(normalizeGenerativeUIBlock({ type: "cognitive_insight", mode: "certain_answer", title: "x", statement: "y", rationale: "z" }), undefined);
  assert.equal(normalizeGenerativeUIBlock({ type: "unknown_widget" }), undefined);

  // Retry with correction succeeds on the second attempt.
  const notes: Array<string | undefined> = [];
  const recovered = await replyWithValidation(async (note) => { notes.push(note); await new Promise((r) => setTimeout(r, 5)); return notes.length === 1 ? base("Students could use a task manager to plan their semester.") : base("You could try matching people by shared hobbies or by local events. Which one appeals to you more?"); }, c);
  assert.equal(notes.length, 2);
  assert.equal(notes[0], undefined);
  assert.ok(notes[1] && notes[1].includes("App de citas"), "The retry carries the project identity");
  assert.ok(recovered.response.message.text.includes("hobbies"));

  // Persistent failure produces an error, never a fabricated answer.
  let calls = 0;
  await assert.rejects(
    replyWithValidation(async () => { calls++; return base("Texto que le dirás al usuario"); }, c),
    (error: unknown) => error instanceof ResponseValidationError,
  );
  assert.equal(calls, 2, "One initial attempt and exactly one retry");

  // Provider failures propagate untouched (the UI shows an honest error and keeps the user message).
  await assert.rejects(replyWithValidation(async () => { throw new Error("network down"); }, c), /network down/);

  // Fabricated statistics are rejected.
  assert.equal(validateAssistantResponse(assistant("u", "Around 70% of dating apps fail according to a recent study of the market."), c).ok, false);

  // Duplicate answers for the same request collapse into one message.
  const u = user("hola idea");
  let messages: Message[] = appendUserMessageOnce([], u);
  messages = upsertAssistantTurn(messages, assistant(u.id, "Primera"));
  messages = upsertAssistantTurn(messages, assistant(u.id, "Segunda (reintento)"));
  assert.equal(messages.filter((m) => m.role === "assistant").length, 1);
  assert.equal((messages[1] as AssistantMessage).text, "Segunda (reintento)");
}

// ───────────── Scenario H — persistence ─────────────
{
  const created = await mockServices.projects.create({ name: "App de citas", description: "Citas por aficiones" });
  const u = user("I want to create a dating app.");
  const discovery: DiscoveryState = recordUserInput(initialDiscovery(false), u);
  const messages: Message[] = [u, assistant(u.id, "Great idea. What makes it different?")];
  await mockServices.workspace.save(created.id, emptyMap, messages, discovery);
  const raw = JSON.parse(storage.get(`nexo.mock.workspace.v2.${created.id}`)!);
  assert.deepEqual(raw.discovery.facts, discovery.facts, "Accepted facts are persisted verbatim");
  const loaded = await mockServices.workspace.load(created.id, "es");
  assert.equal(loaded?.project.id, created.id);
  assert.equal(loaded?.messages.length, 2);
  assert.equal(loaded?.discovery?.facts.find((f) => f.key === "intent")?.value, u.text);
  assert.equal(loaded?.discovery?.archetype, "software");
}

// ───────────── Announced questions are never left dangling ─────────────
{
  const lead = "Excelente, ahora sabemos que el público son jóvenes adultos. Necesito un poco más de información. Por favor, responde las siguientes preguntas:";
  assert.ok(!/preguntas:\s*$/.test(resolveQuestionLead(lead)), "Dangling announcement is removed when there is nothing to ask");
  const withQuestion = resolveQuestionLead(lead, "¿Qué funciones serían imprescindibles?");
  assert.ok(withQuestion.endsWith("¿Qué funciones serían imprescindibles?") && !withQuestion.includes("siguientes preguntas"));
  assert.equal(resolveQuestionLead("Cuéntame más sobre tu público."), "Cuéntame más sobre tu público.", "Normal text is untouched");
  // Through orchestration: the provider announced questions but the plan only allows conversation.
  const discovery = recordUserInput(initialDiscovery(false), user("Quiero crear una app de citas para jóvenes"));
  const plan = planChatTurn({ text: "Jóvenes adultos", discovery, map: emptyMap, history: [] });
  const shown = orchestrateAssistantTurn(assistant("u", lead, { discoveryQuestions: [{ id: "q1", question: "¿Qué funciones serían imprescindibles?", options: [], type: "single", allowCustom: true }], action: "questionnaire" }), { ...plan, primary: "conversation", maxPrimaryComponents: 0 }, []);
  assert.ok(shown.text.endsWith("¿Qué funciones serían imprescindibles?"), "The user still sees the question the model announced");
}

// ───────────── Kill switch: an explicit closing ends the conversation ─────────────
{
  const idea = user("Quiero crear una app de citas para jóvenes que comparten aficiones");
  const base = recordUserInput(initialDiscovery(false), idea);
  assert.equal(base.lifecycle, "discovering");
  for (const phase of ["PHASE_1_DISCOVERY", "PHASE_2_STRUCTURING", "PHASE_3_EXPANSION"] as const) {
    const sys = getSystemInstruction(phase, "es", "App de citas");
    assert.ok(sys.includes("REGLA DE CIERRE INMEDIATO (KILL SWITCH)") && sys.includes('"action": "ready"'), `${phase} must carry the kill switch`);
  }
  for (const phrase of ["Ya tenemos lo básico, ¿qué sigue?", "Estructúrame esto", "pasemos a lo siguiente", "Ya está bien así", "That's enough, structure this", "We have the basics, what's next?"]) {
    assert.equal(classifyTurnIntent(phrase, true), "close", phrase);
  }
  assert.equal(classifyTurnIntent("Ya tenemos lo básico, ¿qué sigue?", false), "other", "Nothing to close before an idea exists");
  assert.equal(classifyTurnIntent("También quiero agregar un sistema de chat", true), "other");
  assert.equal(classifyTurnIntent("¿Qué funciones tiene Tinder?", true), "other");

  const closing = user("Ya tenemos lo básico, ¿qué sigue?");
  const closed = recordUserInput(base, closing);
  assert.deepEqual(closed.facts, base.facts, "A closing phrase is never stored as a project fact");
  assert.equal(closed.lifecycle, "ready");
  const plan = planChatTurn({ text: closing.text, discovery: closed, map: emptyMap, history: [] });
  assert.equal(plan.primary, "closing");
  const stubborn = assistant(closing.id, "Me parece genial. ¿Te gustaría hacer un cronograma para el lanzamiento?", {
    action: "questionnaire", ui: canned("timeline:x"),
    discoveryQuestions: [{ id: "q9", question: "¿Qué cronograma prefieres?", options: ["Semanal"], type: "single", allowCustom: true }],
  });
  const forced = orchestrateAssistantTurn(stubborn, plan, []);
  assert.equal(forced.action, "ready");
  assert.equal(forced.readyForStructuring, true);
  assert.deepEqual(forced.discoveryQuestions, []);
  assert.equal(forced.ui, undefined);
  assert.ok(!/[?¿]/.test(forced.text), "No question may survive a closing turn");
  assert.ok(/generar el tablero/i.test(forced.text));
  const clean = orchestrateAssistantTurn(assistant(closing.id, "Perfecto, tengo toda la información. Procedo a generar el tablero de tu proyecto."), plan, []);
  assert.equal(clean.text, "Perfecto, tengo toda la información. Procedo a generar el tablero de tu proyecto.", "A good closing message is kept as written");
  // After the graph exists the same phrase is ordinary conversation, not another closing.
  assert.notEqual(planChatTurn({ text: closing.text, discovery: { ...closed, lifecycle: "generated" }, map: emptyMap, history: [] }).primary, "closing");
  // The validation boundary also strips questions on a closing turn.
  const validated = validateAssistantResponse(assistant(closing.id, "Perfecto, avancemos.", { discoveryQuestions: stubborn.discoveryQuestions }), ctx({ userText: closing.text, intent: "close", lang: "es", discovery: closed }));
  assert.deepEqual(validated.message.discoveryQuestions, []);

  // The closing card replaces the composer in the UI.
  const store = useWorkspaceStore.getState();
  const readyMsg = assistant(closing.id, "Perfecto, tengo toda la información.", { action: "ready", readyForStructuring: true });
  store.setWorkspace({ project: { id: "p-close", name: "App de citas", description: "", status: "draft", icon: "lightbulb", updatedAt: "", nodeCount: 0 }, map: emptyMap, messages: [idea, closing, readyMsg], discovery: closed });
  const msgs = useWorkspaceStore.getState().discoveryMessages;
  assert.equal(msgs[msgs.length - 1].type, "ready");
  store.setWorkspace(null);
  const chatSource = fs.readFileSync("src/features/workspace/FullScreenDiscoveryChat.tsx", "utf8");
  assert.ok(chatSource.includes("✨ Generar Arquitectura del Proyecto") && chatSource.includes("isClosingTurn") && chatSource.includes("btn-primary"));
  const viewSource = fs.readFileSync("src/features/workspace/WorkspaceView.tsx", "utf8");
  assert.ok(viewSource.includes('orchestration.primary !== "closing"'), "Phase 3 must not downgrade a closing turn back to chat");
}

console.log("✓ Conversational reliability: scenarios A–H passed");
