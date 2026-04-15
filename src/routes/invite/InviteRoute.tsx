import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { registerGuest } from "@/lib/api";

export default function InviteRoute() {
  const { roomId } = useParams<{ roomId: string }>();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [joinCeremony, setJoinCeremony] = useState(false);
  const [joinAfterParty, setJoinAfterParty] = useState(false);
  const [vegetarian, setVegetarian] = useState(false);
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId) return;
    setSubmitting(true);
    setError(null);
    try {
      await registerGuest({
        roomId,
        name: name.trim(),
        email: email.trim(),
        maritalStatus: maritalStatus.trim(),
        joinCeremony,
        joinAfterParty,
        vegetarian,
        message: message.trim(),
      });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (!roomId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p>連結錯誤，請使用邀請函中的完整網址。</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-3">
        <h1 className="text-2xl font-semibold">感謝你的回覆 💍</h1>
        <p className="text-muted-foreground">我們已經收到你的資料，婚禮現場見！</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">歡迎光臨</h1>
          <p className="text-sm text-muted-foreground mt-1">
            請填寫資料完成回覆
          </p>
        </div>

        <form
          onSubmit={handleRegister}
          className="space-y-5 border rounded-xl p-6 shadow-sm bg-card"
        >
          <div className="space-y-2">
            <Label htmlFor="name">暱稱 *</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="你希望顯示的名字"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maritalStatus">婚姻狀態 *</Label>
            <Input
              id="maritalStatus"
              required
              value={maritalStatus}
              onChange={(e) => setMaritalStatus(e.target.value)}
              placeholder="單身 / 熱戀中 / 已婚 / 其他"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="joinCeremony"
              type="checkbox"
              className="h-4 w-4"
              checked={joinCeremony}
              onChange={(e) => setJoinCeremony(e.target.checked)}
            />
            <Label htmlFor="joinCeremony">我會參加證婚儀式</Label>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="joinAfterParty"
              type="checkbox"
              className="h-4 w-4"
              checked={joinAfterParty}
              onChange={(e) => setJoinAfterParty(e.target.checked)}
            />
            <Label htmlFor="joinAfterParty">我會參加 after party</Label>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="vegetarian"
              type="checkbox"
              className="h-4 w-4"
              checked={vegetarian}
              onChange={(e) => setVegetarian(e.target.checked)}
            />
            <Label htmlFor="vegetarian">我是素食者</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">想對新人說的話</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="可留空"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "送出中..." : "送出"}
          </Button>
        </form>
      </div>
    </div>
  );
}
