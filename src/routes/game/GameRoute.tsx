import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BalanceBar } from "@/components/BalanceBar";
import { VoteBars } from "@/components/VoteBars";
import { VoterLists } from "@/components/VoterLists";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { VoteStamp } from "@/components/VoteStamp";
import { fetchQuestions, joinGame, submitAnswer } from "@/lib/api";
import { useGameState, useLiveCount, useVoterLists } from "@/lib/polling";
import { isVerdictQuestion, resolveWinner } from "@/lib/verdict";
import { resolveQuestionImage } from "@/lib/questionImages";
import {
  clearGamePlayerSession,
  getGamePlayerSession,
  setGamePlayerSession,
  type GamePlayerSession,
} from "@/lib/storage";
import type { Question } from "@/lib/types";
import logoImg from "@/assets/couples/michael-lily/logo.webp";
import xiSymbol from "@/assets/couples/michael-lily/xi-symbol.webp";

export default function GameRoute() {
  const { roomId } = useParams<{ roomId: string }>();
  const [session, setSession] = useState<GamePlayerSession | null>(() =>
    roomId ? getGamePlayerSession(roomId) : null
  );

  if (!roomId) {
    return <CenterBox>連結錯誤，請使用完整網址。</CenterBox>;
  }

  if (!session) {
    return (
      <NicknameGate
        roomId={roomId}
        onJoined={(s) => {
          setGamePlayerSession(roomId, s);
          setSession(s);
        }}
      />
    );
  }

  return (
    <GamePlaying
      roomId={roomId}
      session={session}
      onChangeNickname={() => {
        clearGamePlayerSession(roomId);
        setSession(null);
      }}
    />
  );
}

// ---------- Nickname gate ----------

function NicknameGate({
  roomId,
  onJoined,
}: {
  roomId: string;
  onJoined: (session: GamePlayerSession) => void;
}) {
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictNickname, setConflictNickname] = useState<string | null>(null);

  async function attemptJoin(confirmExisting: boolean) {
    const value = nickname.trim();
    if (!value) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await joinGame({
        roomId,
        nickname: value,
        confirmExisting,
      });
      if (result.conflict) {
        setConflictNickname(result.nickname);
        return;
      }
      onJoined({
        gamePlayerId: result.gamePlayerId,
        nickname: result.nickname,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <GameLayout>
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-semibold">加入遊戲</h1>
            <p className="text-sm text-muted-foreground">
              輸入一個暱稱就可以開始玩囉
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              attemptJoin(false);
            }}
            className="space-y-5 border rounded-xl p-6 shadow-sm bg-card"
          >
            <div className="space-y-2">
              <Label htmlFor="nickname">暱稱</Label>
              <Input
                id="nickname"
                required
                autoFocus
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="輸入顯示名稱"
                disabled={submitting}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "處理中..." : "加入遊戲"}
            </Button>
          </form>
        </div>
      </GameLayout>

      {conflictNickname && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setConflictNickname(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl border space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">該暱稱已被使用</h2>
              <p className="text-sm text-muted-foreground">
                「{conflictNickname}」已經有人用了。如果這個暱稱就是你本人，
                可以直接登入繼續遊戲；不然請換一個暱稱。
              </p>
            </div>
            <div className="space-y-2">
              <Button
                className="w-full"
                disabled={submitting}
                onClick={() => {
                  setConflictNickname(null);
                  attemptJoin(true);
                }}
              >
                {submitting ? "登入中..." : "我就是該暱稱使用者，登入"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={submitting}
                onClick={() => setConflictNickname(null)}
              >
                重新輸入其他暱稱
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------- Game UI ----------

function GamePlaying({
  roomId,
  session,
  onChangeNickname,
}: {
  roomId: string;
  session: GamePlayerSession;
  onChangeNickname: () => void;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [answeredByQuestion, setAnsweredByQuestion] = useState<
    Record<string, string>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [alreadyAnsweredNotice, setAlreadyAnsweredNotice] = useState<
    string | null
  >(null);

  const { state, loading, error } = useGameState(roomId);

  useEffect(() => {
    fetchQuestions(roomId)
      .then(setQuestions)
      .catch((e) =>
        setQuestionsError(e instanceof Error ? e.message : String(e))
      );
  }, [roomId]);

  const currentQuestion = useMemo(() => {
    if (!state?.currentQuestionId) return null;
    return (
      questions.find((q) => q.questionId === state.currentQuestionId) ?? null
    );
  }, [state, questions]);

  const { count } = useLiveCount(
    roomId,
    currentQuestion?.questionId,
    state?.phase === "answering" || state?.phase === "revealed"
  );
  const { voters } = useVoterLists(
    roomId,
    currentQuestion?.questionId,
    state?.phase === "revealed"
  );

  useEffect(() => {
    setAlreadyAnsweredNotice(null);
  }, [state?.currentQuestionId]);

  if (loading) return <CenterBox>載入中...</CenterBox>;
  if (error) return <CenterBox>讀取遊戲狀態失敗：{error}</CenterBox>;
  if (questionsError)
    return <CenterBox>讀取題目失敗：{questionsError}</CenterBox>;
  if (!state) return <CenterBox>找不到這個 Room。</CenterBox>;

  if (state.phase === "waiting") {
    return (
      <CenterBox>
        <h1 className="text-2xl font-semibold mb-3">敬請期待 ✨</h1>
        <p className="text-muted-foreground">
          嗨 {session.nickname}，遊戲即將開始，請稍候。
        </p>
        <ChangeNicknameLink onClick={onChangeNickname} />
      </CenterBox>
    );
  }

  if (state.phase === "ended") {
    return (
      <CenterBox>
        <h1 className="text-2xl font-semibold mb-3">謝謝你的參與 💍</h1>
        <p className="text-muted-foreground">祝福新人百年好合、永浴愛河！</p>
      </CenterBox>
    );
  }

  if (!currentQuestion) {
    return (
      <CenterBox>
        等待主持人出題中...
        <ChangeNicknameLink onClick={onChangeNickname} />
      </CenterBox>
    );
  }

  const committedAnswer = answeredByQuestion[currentQuestion.questionId] ?? null;
  const alreadySubmitted = committedAnswer !== null;

  async function handleAnswer(answer: string) {
    if (!currentQuestion) return;
    if (alreadySubmitted || submitting) return;
    setSubmitting(true);
    setAlreadyAnsweredNotice(null);
    try {
      const result = await submitAnswer({
        gamePlayerId: session.gamePlayerId,
        roomId,
        questionId: currentQuestion.questionId,
        answer,
      });
      const committed = result.alreadyAnswered
        ? (result.previousAnswer ?? answer)
        : answer;
      setAnsweredByQuestion((prev) => ({
        ...prev,
        [currentQuestion.questionId]: committed,
      }));
      if (result.alreadyAnswered) {
        setAlreadyAnsweredNotice("您已回答過囉！");
      }
    } catch (e) {
      alert("送出失敗：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSubmitting(false);
    }
  }

  const revealed = state.phase === "revealed";
  const yesCount = count?.yesCount ?? 0;
  const noCount = count?.noCount ?? 0;
  const optionCounts = count
    ? [
        count.optionACount,
        count.optionBCount,
        count.optionCCount,
        count.optionDCount,
      ]
    : [0, 0, 0, 0];
  const yesLabel = currentQuestion.options[0]?.trim() || "YES";
  const noLabel = currentQuestion.options[1]?.trim() || "NO";
  const verdict = isVerdictQuestion(currentQuestion.correctAnswer);
  const effectiveWinner = resolveWinner(
    currentQuestion.correctAnswer,
    currentQuestion.type === "yn"
      ? { yes: yesCount, no: noCount }
      : {
          A: optionCounts[0],
          B: optionCounts[1],
          C: optionCounts[2],
          D: optionCounts[3],
        }
  );
  const winnerLabel =
    currentQuestion.type === "yn"
      ? effectiveWinner === "yes"
        ? yesLabel
        : effectiveWinner === "no"
          ? noLabel
          : ""
      : effectiveWinner
        ? `${effectiveWinner}. ${currentQuestion.options[effectiveWinner.charCodeAt(0) - 65] ?? ""}`
        : "";

  return (
    <GameLayout>
      <div className="w-full max-w-lg space-y-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.questionId}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            className="text-center space-y-2"
          >
            <p className="text-xs text-wedding-gold-soft uppercase tracking-wider">
              第 {currentQuestion.order} 題
            </p>
            <h1 className="font-serif text-2xl md:text-3xl font-bold tracking-widest leading-snug text-wedding-gold">
              {currentQuestion.text}
            </h1>
          </motion.div>
        </AnimatePresence>

        {currentQuestion.type === "yn" ? (
          <BalanceBar
            yesCount={yesCount}
            noCount={noCount}
            revealed={revealed}
            yesLabel={yesLabel}
            noLabel={noLabel}
            yesImage={resolveQuestionImage(currentQuestion.yesImageKey)}
            noImage={resolveQuestionImage(currentQuestion.noImageKey)}
          />
        ) : (
          <VoteBars
            options={currentQuestion.options}
            counts={optionCounts}
            correctKey={effectiveWinner}
            revealed={revealed}
          />
        )}

        {currentQuestion.type === "yn" ? (
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              className={
                "relative h-14 text-base text-wedding-gold border-wedding-gold-soft/60 hover:bg-wedding-gold-soft/10 hover:text-wedding-gold " +
                (committedAnswer === "yes" ? "disabled:opacity-100" : "")
              }
              variant="outline"
              disabled={alreadySubmitted || revealed || submitting}
              onClick={() => handleAnswer("yes")}
            >
              {yesLabel}
              {committedAnswer === "yes" && <VoteStamp />}
            </Button>
            <Button
              size="lg"
              className={
                "relative h-14 text-base text-wedding-gold border-wedding-gold-soft/60 hover:bg-wedding-gold-soft/10 hover:text-wedding-gold " +
                (committedAnswer === "no" ? "disabled:opacity-100" : "")
              }
              variant="outline"
              disabled={alreadySubmitted || revealed || submitting}
              onClick={() => handleAnswer("no")}
            >
              {noLabel}
              {committedAnswer === "no" && <VoteStamp />}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.options.map((opt, i) => {
              const key = String.fromCharCode(65 + i);
              const isChosen = committedAnswer === key;
              return (
                <Button
                  key={key}
                  size="lg"
                  className={
                    "relative h-12 justify-start text-wedding-gold border-wedding-gold-soft/60 hover:bg-wedding-gold-soft/10 hover:text-wedding-gold " +
                    (isChosen ? "disabled:opacity-100" : "")
                  }
                  variant="outline"
                  disabled={alreadySubmitted || revealed || submitting}
                  onClick={() => handleAnswer(key)}
                >
                  {key}. {opt}
                  {isChosen && <VoteStamp />}
                </Button>
              );
            })}
          </div>
        )}

        {alreadyAnsweredNotice && (
          <p className="text-center text-sm font-medium text-amber-600">
            {alreadyAnsweredNotice}
          </p>
        )}
        {alreadySubmitted && !alreadyAnsweredNotice && !revealed && (
          <p className="text-center text-sm text-wedding-gold-soft">
            已送出，等待主持人公佈答案...
          </p>
        )}
        {revealed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center space-y-2"
          >
            <p className="text-sm text-wedding-gold-soft">
              {verdict ? "裁決結果" : "正確答案"}
            </p>
            {effectiveWinner === "" ? (
              <p className="text-3xl font-bold text-wedding-gold">平手 🤝</p>
            ) : (
              <motion.p
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.35,
                  type: "spring",
                  stiffness: 180,
                  damping: 10,
                }}
                className="text-4xl font-bold text-emerald-600 drop-shadow-sm"
              >
                {winnerLabel}
              </motion.p>
            )}
            {currentQuestion.type === "yn" && (
              <p className="text-xs text-muted-foreground font-mono">
                <AnimatedNumber value={yesCount} /> vs{" "}
                <AnimatedNumber value={noCount} />
              </p>
            )}
          </motion.div>
        )}
        {revealed && voters && (
          <VoterLists
            type={currentQuestion.type}
            options={
              currentQuestion.type === "yn"
                ? [yesLabel, noLabel]
                : currentQuestion.options
            }
            correctAnswer={effectiveWinner}
            yesVoters={voters.yesVoters}
            noVoters={voters.noVoters}
            optionVoters={[
              voters.optionAVoters,
              voters.optionBVoters,
              voters.optionCVoters,
              voters.optionDVoters,
            ]}
          />
        )}

        {/* <div className="pt-2">
          <ChangeNicknameLink onClick={onChangeNickname} />
        </div> */}
      </div>
    </GameLayout>
  );
}

function ChangeNicknameLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 mx-auto block text-xs text-muted-foreground underline underline-offset-2"
    >
      改暱稱
    </button>
  );
}

function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-8">
      <img
        src={logoImg}
        alt="豪華的婚禮"
        className="w-56 sm:w-64 md:w-72 shrink-0"
        fetchPriority="high"
        decoding="async"
      />
      <div className="flex-1 w-full flex items-center justify-center py-6">
        {children}
      </div>
      <img
        src={xiSymbol}
        alt="喜喜"
        className="w-20 sm:w-24 md:w-28 shrink-0 opacity-90"
        decoding="async"
      />
    </div>
  );
}

function CenterBox({ children }: { children: React.ReactNode }) {
  return (
    <GameLayout>
      <div className="text-center">{children}</div>
    </GameLayout>
  );
}
