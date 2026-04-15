import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { advanceState, fetchQuestions } from "@/lib/api";
import { useGameState, useLiveCount } from "@/lib/polling";
import { getHostPassword } from "@/lib/storage";
import type { Question } from "@/lib/types";

export default function HostControlRoute() {
  const { roomId } = useParams<{ roomId: string }>();
  const password = getHostPassword() ?? "";
  const [questions, setQuestions] = useState<Question[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { state } = useGameState(roomId, 1500);

  useEffect(() => {
    if (!roomId) return;
    fetchQuestions(roomId).then(setQuestions).catch(console.error);
  }, [roomId]);

  const currentIndex = useMemo(() => {
    if (!state?.currentQuestionId) return -1;
    return questions.findIndex((q) => q.questionId === state.currentQuestionId);
  }, [state, questions]);

  const currentQuestion = currentIndex >= 0 ? questions[currentIndex] : null;
  const { count } = useLiveCount(
    roomId,
    currentQuestion?.questionId,
    !!currentQuestion
  );

  async function doAdvance(
    targetQuestionId: string,
    phase: "waiting" | "answering" | "revealed" | "ended"
  ) {
    if (!roomId) return;
    setBusy(true);
    setErr(null);
    try {
      await advanceState(
        { roomId, currentQuestionId: targetQuestionId, phase },
        password
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          to="/host/rooms"
          className="text-sm underline underline-offset-2 text-muted-foreground"
        >
          ← 回 Room 列表
        </Link>
      </div>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">主持人控制台</h1>
          <p className="text-sm text-muted-foreground">Room: {roomId}</p>
        </div>
        <div className="text-right text-sm">
          <p>
            目前階段：
            <span className="font-mono ml-1">{state?.phase ?? "-"}</span>
          </p>
          <p>
            進度：{currentIndex >= 0 ? currentIndex + 1 : "-"} / {questions.length}
          </p>
        </div>
      </header>

      {currentQuestion ? (
        (() => {
          const yesLabel = currentQuestion.options[0]?.trim() || "YES";
          const noLabel = currentQuestion.options[1]?.trim() || "NO";
          const correctDisplay =
            currentQuestion.type === "yn"
              ? currentQuestion.correctAnswer === "yes"
                ? yesLabel
                : noLabel
              : currentQuestion.correctAnswer;
          return (
            <div className="border rounded-xl p-5 bg-card space-y-3">
              <p className="text-xs text-muted-foreground uppercase">
                第 {currentQuestion.order} 題 ({currentQuestion.type})
              </p>
              <p className="text-lg font-medium">{currentQuestion.text}</p>
              {currentQuestion.type === "yn" ? (
                <p className="text-sm">
                  {yesLabel}: {count?.yesCount ?? 0} · {noLabel}:{" "}
                  {count?.noCount ?? 0}
                </p>
              ) : (
                <ul className="text-sm space-y-1">
                  {currentQuestion.options.map((o, i) => {
                    const key = String.fromCharCode(65 + i);
                    const counts = count
                      ? [
                          count.optionACount,
                          count.optionBCount,
                          count.optionCCount,
                          count.optionDCount,
                        ]
                      : [0, 0, 0, 0];
                    return (
                      <li key={key}>
                        {key}. {o} — {counts[i] ?? 0} 票
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                正確答案：{correctDisplay}
              </p>
            </div>
          );
        })()
      ) : (
        <div className="border rounded-xl p-5 bg-card text-sm text-muted-foreground">
          尚未開始，請按「開始遊戲」載入第一題。
        </div>
      )}

      {err && (
        <p className="text-sm text-destructive text-center">{err}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          disabled={busy || questions.length === 0}
          onClick={() => {
            const first = questions[0];
            if (first) doAdvance(first.questionId, "answering");
          }}
        >
          開始遊戲 / 第一題
        </Button>
        <Button
          variant="outline"
          disabled={busy || !currentQuestion || state?.phase !== "answering"}
          onClick={() =>
            currentQuestion &&
            doAdvance(currentQuestion.questionId, "revealed")
          }
        >
          公佈答案
        </Button>

        <Button
          variant="outline"
          disabled={busy || currentIndex <= 0}
          onClick={() => {
            const prev = questions[currentIndex - 1];
            if (prev) doAdvance(prev.questionId, "answering");
          }}
        >
          上一題
        </Button>
        <Button
          disabled={busy || currentIndex < 0 || currentIndex >= questions.length - 1}
          onClick={() => {
            const next = questions[currentIndex + 1];
            if (next) doAdvance(next.questionId, "answering");
          }}
        >
          下一題
        </Button>

        <Button
          variant="destructive"
          className="col-span-2"
          disabled={busy}
          onClick={() =>
            currentQuestion &&
            doAdvance(currentQuestion.questionId, "ended")
          }
        >
          結束遊戲
        </Button>
      </div>
    </div>
  );
}
