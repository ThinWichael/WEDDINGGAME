import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteQuestion,
  fetchQuestions,
  upsertQuestion,
} from "@/lib/api";
import { listQuestionImages, resolveQuestionImage } from "@/lib/questionImages";
import { getHostPassword } from "@/lib/storage";
import type { Question, QuestionType } from "@/lib/types";

interface DraftQuestion {
  questionId?: string;
  order: number;
  type: QuestionType;
  text: string;
  imageKey: string;
  options: string[];
  correctAnswer: string;
}

const emptyDraft = (order: number): DraftQuestion => ({
  order,
  type: "yn",
  text: "",
  imageKey: "",
  options: ["", "", "", ""],
  correctAnswer: "yes",
});

const toDraft = (q: Question): DraftQuestion => ({
  questionId: q.questionId,
  order: q.order,
  type: q.type,
  text: q.text,
  imageKey: q.imageKey,
  options: [0, 1, 2, 3].map((i) => q.options[i] ?? ""),
  correctAnswer: q.correctAnswer,
});

export default function HostQuestionsRoute() {
  const { roomId } = useParams<{ roomId: string }>();
  const hostPassword = getHostPassword() ?? "";
  const images = listQuestionImages();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftQuestion[]>([]);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    setError(null);
    try {
      const qs = await fetchQuestions(roomId);
      setQuestions(qs);
      setDrafts(qs.map(toDraft));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    reload();
  }, [reload]);

  function updateDraft(index: number, patch: Partial<DraftQuestion>) {
    setDrafts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function addDraft() {
    setDrafts((prev) => [...prev, emptyDraft(prev.length + 1)]);
  }

  async function saveDraft(index: number) {
    if (!roomId) return;
    const d = drafts[index];
    if (!d.text.trim()) {
      alert("題目內容不能空");
      return;
    }
    setBusy(true);
    try {
      const cleanedOptions =
        d.type === "single"
          ? d.options.map((o) => o.trim()).filter((o) => o.length > 0)
          : [d.options[0]?.trim() || "", d.options[1]?.trim() || ""];
      await upsertQuestion(
        {
          questionId: d.questionId,
          roomId,
          order: d.order,
          type: d.type,
          text: d.text.trim(),
          imageKey: d.imageKey,
          options: cleanedOptions,
          correctAnswer: d.correctAnswer,
        },
        hostPassword
      );
      await reload();
    } catch (e) {
      alert("儲存失敗：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  async function removeDraft(index: number) {
    const d = drafts[index];
    if (!d.questionId) {
      // unsaved, just drop
      setDrafts((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    if (!confirm("確定刪除這題？此操作無法還原。")) return;
    setBusy(true);
    try {
      await deleteQuestion(d.questionId, hostPassword);
      await reload();
    } catch (e) {
      alert("刪除失敗：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">題目編輯</h1>
          <p className="text-sm text-muted-foreground font-mono">{roomId}</p>
        </div>
        <Link
          to="/host/rooms"
          className="text-sm underline underline-offset-2"
        >
          ← 回 Room 列表
        </Link>
      </header>

      {loading && <p className="text-center text-muted-foreground">載入中...</p>}
      {error && <p className="text-center text-destructive">{error}</p>}

      <div className="space-y-4">
        {drafts.map((d, i) => (
          <QuestionEditor
            key={d.questionId ?? `new-${i}`}
            index={i}
            draft={d}
            images={images}
            busy={busy}
            exists={!!d.questionId}
            onChange={(patch) => updateDraft(i, patch)}
            onSave={() => saveDraft(i)}
            onRemove={() => removeDraft(i)}
          />
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addDraft} className="w-full">
        + 新增一題
      </Button>

      {questions.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          共 {questions.length} 題
        </p>
      )}
    </div>
  );
}

interface QuestionEditorProps {
  index: number;
  draft: DraftQuestion;
  images: { key: string; url: string }[];
  busy: boolean;
  exists: boolean;
  onChange: (patch: Partial<DraftQuestion>) => void;
  onSave: () => void;
  onRemove: () => void;
}

function QuestionEditor({
  index,
  draft,
  images,
  busy,
  exists,
  onChange,
  onSave,
  onRemove,
}: QuestionEditorProps) {
  const imageUrl = resolveQuestionImage(draft.imageKey);
  return (
    <div className="border rounded-xl p-5 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">第 {index + 1} 題</h3>
        <span className="text-xs text-muted-foreground">
          {exists ? "已儲存" : "未儲存"}
        </span>
      </div>

      <div className="space-y-2">
        <Label>題型</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={draft.type === "yn" ? "default" : "outline"}
            onClick={() =>
              onChange({ type: "yn", correctAnswer: "yes", options: ["", "", "", ""] })
            }
          >
            是非題
          </Button>
          <Button
            type="button"
            size="sm"
            variant={draft.type === "single" ? "default" : "outline"}
            onClick={() => onChange({ type: "single", correctAnswer: "A" })}
          >
            單選題
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>題目內容</Label>
        <Textarea
          value={draft.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="例如：新郎新娘第一次約會是在哪裡？"
        />
      </div>

      <div className="space-y-2">
        <Label>順序</Label>
        <Input
          type="number"
          min={1}
          value={draft.order}
          onChange={(e) =>
            onChange({ order: Number(e.target.value) || 1 })
          }
          className="w-24"
        />
      </div>

      <div className="space-y-2">
        <Label>題目圖片（選填）</Label>
        <select
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={draft.imageKey}
          onChange={(e) => onChange({ imageKey: e.target.value })}
        >
          <option value="">（無圖片）</option>
          {images.map((img) => (
            <option key={img.key} value={img.key}>
              {img.key}
            </option>
          ))}
        </select>
        {imageUrl && (
          <img
            src={imageUrl}
            alt={draft.imageKey}
            className="rounded-md max-h-40 border"
          />
        )}
        {!imageUrl && draft.imageKey && (
          <p className="text-xs text-destructive">
            找不到圖片：{draft.imageKey}（請放到 src/assets/questions/）
          </p>
        )}
      </div>

      {draft.type === "yn" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>YES / NO 客製顯示文字（選填）</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={draft.options[0] ?? ""}
                onChange={(e) => {
                  const next = [...draft.options];
                  next[0] = e.target.value;
                  onChange({ options: next });
                }}
                placeholder="留空 = YES"
              />
              <Input
                value={draft.options[1] ?? ""}
                onChange={(e) => {
                  const next = [...draft.options];
                  next[1] = e.target.value;
                  onChange({ options: next });
                }}
                placeholder="留空 = NO"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              例如改成「新郎 / 新娘」、「小貓 / 小狗」；賓客看到的按鈕跟天平標籤會跟著換
            </p>
          </div>

          <div className="space-y-2">
            <Label>正確答案</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={draft.correctAnswer === "yes" ? "default" : "outline"}
                onClick={() => onChange({ correctAnswer: "yes" })}
              >
                {draft.options[0]?.trim() || "YES"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={draft.correctAnswer === "no" ? "default" : "outline"}
                onClick={() => onChange({ correctAnswer: "no" })}
              >
                {draft.options[1]?.trim() || "NO"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>選項（空白的選項會被忽略）</Label>
          {draft.options.map((opt, i) => {
            const key = String.fromCharCode(65 + i);
            return (
              <div key={key} className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={draft.correctAnswer === key ? "default" : "outline"}
                  className="w-12 shrink-0"
                  onClick={() => onChange({ correctAnswer: key })}
                >
                  {key}
                </Button>
                <Input
                  value={opt}
                  onChange={(e) => {
                    const next = [...draft.options];
                    next[i] = e.target.value;
                    onChange({ options: next });
                  }}
                  placeholder={`選項 ${key}`}
                />
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">
            綠色按鈕 = 正確答案
          </p>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="button" onClick={onSave} disabled={busy}>
          {exists ? "更新" : "儲存"}
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={onRemove}
          disabled={busy}
        >
          {exists ? "刪除" : "取消"}
        </Button>
      </div>
    </div>
  );
}
