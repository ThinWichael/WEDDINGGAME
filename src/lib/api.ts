import { APPS_SCRIPT_URL } from "./config";
import { gvizFetch } from "./gviz";
import type {
  GameState,
  GamePhase,
  GuestAuthResult,
  JoinGameInput,
  JoinGameResult,
  LiveCount,
  Question,
  QuestionType,
  RegisterGuestInput,
  Room,
  RoomStatus,
  VoterLists,
} from "./types";

interface AppsScriptResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Apps Script Web App uses text/plain to avoid CORS preflight.
 * The server reads the raw body and JSON.parses it.
 */
async function appsScriptPost<T>(
  action: string,
  body: object,
  hostPassword?: string
): Promise<T> {
  const res = await fetch(`${APPS_SCRIPT_URL}?action=${action}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ ...body, hostPassword }),
  });
  if (!res.ok) throw new Error(`Apps Script request failed: ${res.status}`);
  const json: AppsScriptResponse<T> = await res.json();
  if (!json.ok) throw new Error(json.error ?? "Apps Script returned error");
  return json.data as T;
}

export async function registerGuest(
  input: RegisterGuestInput
): Promise<GuestAuthResult> {
  return appsScriptPost("registerGuest", input);
}

export async function joinGame(input: JoinGameInput): Promise<JoinGameResult> {
  return appsScriptPost("joinGame", input);
}

export interface SubmitAnswerResult {
  alreadyAnswered: boolean;
  previousAnswer?: string;
}

export async function submitAnswer(input: {
  gamePlayerId: string;
  roomId: string;
  questionId: string;
  answer: string;
}): Promise<SubmitAnswerResult> {
  return appsScriptPost("submitAnswer", input);
}

export async function advanceState(
  input: { roomId: string; currentQuestionId: string; phase: GamePhase },
  hostPassword: string
): Promise<void> {
  await appsScriptPost("advanceState", input, hostPassword);
}

interface StateRow {
  roomId: string;
  currentQuestionId: string;
  phase: string;
  revealedAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export async function fetchGameState(roomId: string): Promise<GameState | null> {
  const rows = await gvizFetch<StateRow>({
    sheet: "State",
    query: `select * where A = '${roomId.replace(/'/g, "\\'")}'`,
  });
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    roomId: String(r.roomId),
    currentQuestionId: String(r.currentQuestionId),
    phase: (r.phase || "waiting") as GamePhase,
    revealedAt: String(r.revealedAt ?? ""),
    updatedAt: String(r.updatedAt ?? ""),
  };
}

interface LiveCountRow {
  roomId: string;
  questionId: string;
  yesCount: number | string;
  noCount: number | string;
  optionACount: number | string;
  optionBCount: number | string;
  optionCCount: number | string;
  optionDCount: number | string;
  [key: string]: unknown;
}

export async function fetchLiveCount(
  roomId: string,
  questionId: string
): Promise<LiveCount | null> {
  const rows = await gvizFetch<LiveCountRow>({
    sheet: "LiveCounts",
    query: `select * where A = '${roomId.replace(/'/g, "\\'")}' and B = '${questionId.replace(/'/g, "\\'")}'`,
  });
  if (rows.length === 0) return null;
  const r = rows[0];
  const num = (v: unknown) => Number(v) || 0;
  return {
    roomId: String(r.roomId),
    questionId: String(r.questionId),
    yesCount: num(r.yesCount),
    noCount: num(r.noCount),
    optionACount: num(r.optionACount),
    optionBCount: num(r.optionBCount),
    optionCCount: num(r.optionCCount),
    optionDCount: num(r.optionDCount),
  };
}

interface AnswerRow {
  gamePlayerId: string;
  answer: string;
  answeredAt: string;
  roomId: string;
  questionId: string;
  [key: string]: unknown;
}

interface GamePlayerRow {
  gamePlayerId: string;
  roomId: string;
  nickname: string;
  [key: string]: unknown;
}

export async function fetchVoterLists(
  roomId: string,
  questionId: string
): Promise<VoterLists> {
  // Fetch all rows for the room-level sheets and filter client-side.
  // Data volume is small (≤30 players × ~10 questions), and this keeps us
  // independent of column-letter positions — we use header labels only,
  // matching how gvizFetch keys its results.
  const [answerRows, playerRows] = await Promise.all([
    gvizFetch<AnswerRow>({ sheet: "Answers" }),
    gvizFetch<GamePlayerRow>({ sheet: "GamePlayers" }),
  ]);

  const nicknameById = new Map<string, string>();
  for (const p of playerRows) {
    if (String(p.roomId) !== roomId) continue;
    nicknameById.set(String(p.gamePlayerId), String(p.nickname));
  }

  const result: VoterLists = {
    roomId,
    questionId,
    yesVoters: [],
    noVoters: [],
    optionAVoters: [],
    optionBVoters: [],
    optionCVoters: [],
    optionDVoters: [],
  };

  const sorted = answerRows
    .filter(
      (a) =>
        String(a.roomId) === roomId && String(a.questionId) === questionId
    )
    .sort((a, b) =>
      String(a.answeredAt).localeCompare(String(b.answeredAt))
    );

  for (const a of sorted) {
    const nick = nicknameById.get(String(a.gamePlayerId)) ?? "(匿名)";
    const ans = String(a.answer).toLowerCase();
    if (ans === "yes") result.yesVoters.push(nick);
    else if (ans === "no") result.noVoters.push(nick);
    else if (ans === "a") result.optionAVoters.push(nick);
    else if (ans === "b") result.optionBVoters.push(nick);
    else if (ans === "c") result.optionCVoters.push(nick);
    else if (ans === "d") result.optionDVoters.push(nick);
  }

  return result;
}

interface QuestionRow {
  questionId: string;
  roomId: string;
  order: number | string;
  type: string;
  text: string;
  imageKey: string;
  yesImageKey: string;
  noImageKey: string;
  optionsJson: string;
  correctAnswer: string;
  [key: string]: unknown;
}

export async function fetchQuestions(roomId: string): Promise<Question[]> {
  const rows = await gvizFetch<QuestionRow>({
    sheet: "Questions",
    query: `select * where B = '${roomId.replace(/'/g, "\\'")}' order by C asc`,
  });
  return rows.map((r) => ({
    questionId: String(r.questionId),
    roomId: String(r.roomId),
    order: Number(r.order) || 0,
    type: (String(r.type) || "yn") as Question["type"],
    text: String(r.text),
    imageKey: String(r.imageKey ?? ""),
    yesImageKey: String(r.yesImageKey ?? ""),
    noImageKey: String(r.noImageKey ?? ""),
    options: r.optionsJson ? safeJsonParse<string[]>(String(r.optionsJson), []) : [],
    correctAnswer: String(r.correctAnswer ?? ""),
  }));
}

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

// ---------- Host CRUD ----------

export async function verifyHost(hostPassword: string): Promise<void> {
  await appsScriptPost("verifyHost", {}, hostPassword);
}

interface RoomRow {
  roomId: string;
  name: string;
  status: string;
  createdAt: string;
  [key: string]: unknown;
}

export async function fetchRooms(): Promise<Room[]> {
  const rows = await gvizFetch<RoomRow>({
    sheet: "Rooms",
    query: "select * order by D desc",
  });
  return rows.map((r) => ({
    roomId: String(r.roomId),
    name: String(r.name),
    status: (String(r.status) || "draft") as RoomStatus,
    createdAt: String(r.createdAt ?? ""),
  }));
}

export async function createRoom(
  input: { name: string; status?: RoomStatus },
  hostPassword: string
): Promise<{ roomId: string }> {
  return appsScriptPost("createRoom", input, hostPassword);
}

export async function updateRoom(
  input: { roomId: string; name?: string; status?: RoomStatus },
  hostPassword: string
): Promise<void> {
  await appsScriptPost("updateRoom", input, hostPassword);
}

export async function deleteRoom(
  roomId: string,
  hostPassword: string
): Promise<void> {
  await appsScriptPost("deleteRoom", { roomId }, hostPassword);
}

export interface UpsertQuestionInput {
  questionId?: string;
  roomId: string;
  order: number;
  type: QuestionType;
  text: string;
  imageKey: string;
  yesImageKey: string;
  noImageKey: string;
  options: string[];
  correctAnswer: string;
}

export async function upsertQuestion(
  input: UpsertQuestionInput,
  hostPassword: string
): Promise<{ questionId: string }> {
  const payload = {
    questionId: input.questionId,
    roomId: input.roomId,
    order: input.order,
    type: input.type,
    text: input.text,
    imageKey: input.imageKey,
    yesImageKey: input.yesImageKey,
    noImageKey: input.noImageKey,
    optionsJson: JSON.stringify(input.options),
    correctAnswer: input.correctAnswer,
  };
  return appsScriptPost("upsertQuestion", payload, hostPassword);
}

export async function deleteQuestion(
  questionId: string,
  hostPassword: string
): Promise<void> {
  await appsScriptPost("deleteQuestion", { questionId }, hostPassword);
}

export async function createGuest(
  input: { roomId: string; inviteToken: string },
  hostPassword: string
): Promise<{ guestId: string }> {
  return appsScriptPost("createGuest", input, hostPassword);
}
