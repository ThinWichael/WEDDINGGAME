const PREFIX = "weddinggame:";

export function storageGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function storageSet(key: string, value: unknown): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export function storageRemove(key: string): void {
  localStorage.removeItem(PREFIX + key);
}

export interface GamePlayerSession {
  gamePlayerId: string;
  nickname: string;
}

type GamePlayerSessionMap = Record<string, GamePlayerSession>;

const GAME_PLAYER_KEY = "gamePlayerSessions";

export function getGamePlayerSession(
  roomId: string
): GamePlayerSession | null {
  const map = storageGet<GamePlayerSessionMap>(GAME_PLAYER_KEY, {});
  return map[roomId] ?? null;
}

export function setGamePlayerSession(
  roomId: string,
  session: GamePlayerSession
): void {
  const map = storageGet<GamePlayerSessionMap>(GAME_PLAYER_KEY, {});
  map[roomId] = session;
  storageSet(GAME_PLAYER_KEY, map);
}

export function clearGamePlayerSession(roomId: string): void {
  const map = storageGet<GamePlayerSessionMap>(GAME_PLAYER_KEY, {});
  if (roomId in map) {
    delete map[roomId];
    storageSet(GAME_PLAYER_KEY, map);
  }
}

export function getHostPassword(): string | null {
  return storageGet<string | null>("hostPassword", null);
}

export function setHostPassword(pw: string): void {
  storageSet("hostPassword", pw);
}
