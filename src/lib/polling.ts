import { useEffect, useRef, useState } from "react";
import { fetchGameState, fetchLiveCount } from "./api";
import type { GameState, LiveCount } from "./types";

const STATE_POLL_MS = 2000;
const LIVECOUNT_POLL_MS = 1500;

export interface UseGameStateResult {
  state: GameState | null;
  loading: boolean;
  error: string | null;
}

export function useGameState(
  roomId: string | undefined,
  intervalMs: number = STATE_POLL_MS
): UseGameStateResult {
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    async function tick() {
      try {
        const next = await fetchGameState(roomId!);
        if (cancelled || !mountedRef.current) return;
        setState(next);
        setError(null);
      } catch (e) {
        if (cancelled || !mountedRef.current) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false);
      }
    }

    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [roomId, intervalMs]);

  return { state, loading, error };
}

export interface UseLiveCountResult {
  count: LiveCount | null;
  error: string | null;
}

export function useLiveCount(
  roomId: string | undefined,
  questionId: string | undefined,
  active: boolean,
  intervalMs: number = LIVECOUNT_POLL_MS
): UseLiveCountResult {
  const [count, setCount] = useState<LiveCount | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !roomId || !questionId) return;
    let cancelled = false;

    async function tick() {
      try {
        const next = await fetchLiveCount(roomId!, questionId!);
        if (cancelled) return;
        setCount(next);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      }
    }

    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [roomId, questionId, active, intervalMs]);

  return { count, error };
}
