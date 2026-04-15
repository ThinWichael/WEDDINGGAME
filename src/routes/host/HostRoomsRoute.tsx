import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createRoom,
  deleteRoom,
  fetchRooms,
  updateRoom,
} from "@/lib/api";
import { getHostPassword } from "@/lib/storage";
import type { Room, RoomStatus } from "@/lib/types";

interface QrModalState {
  title: string;
  url: string;
}

const STATUSES: RoomStatus[] = ["draft", "waiting", "playing", "ended"];

export default function HostRoomsRoute() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<QrModalState | null>(null);

  const hostPassword = getHostPassword() ?? "";

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRooms(await fetchRooms());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await createRoom({ name: newName.trim() }, hostPassword);
      setNewName("");
      await reload();
    } catch (e) {
      alert("建立失敗：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusChange(room: Room, status: RoomStatus) {
    if (status === room.status) return;
    const previousStatus = room.status;
    // Optimistic update: reflect the new status immediately in the UI,
    // then roll back if the server call fails.
    setRooms((prev) =>
      prev.map((r) => (r.roomId === room.roomId ? { ...r, status } : r))
    );
    setStatusUpdatingId(room.roomId);
    try {
      await updateRoom({ roomId: room.roomId, status }, hostPassword);
    } catch (e) {
      setRooms((prev) =>
        prev.map((r) =>
          r.roomId === room.roomId ? { ...r, status: previousStatus } : r
        )
      );
      alert("更新失敗：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setStatusUpdatingId((id) => (id === room.roomId ? null : id));
    }
  }

  async function handleRename(room: Room) {
    const name = prompt("新名字", room.name);
    if (!name || name === room.name) return;
    setBusy(true);
    try {
      await updateRoom({ roomId: room.roomId, name }, hostPassword);
      await reload();
    } catch (e) {
      alert("改名失敗：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  const baseOrigin = `${window.location.origin}${import.meta.env.BASE_URL}`;

  function inviteUrl(room: Room) {
    return `${baseOrigin}invite/${room.roomId}`;
  }

  function gameUrl(room: Room) {
    return `${baseOrigin}game/${room.roomId}`;
  }

  async function copyToClipboard(label: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      alert(`已複製${label}：\n${url}`);
    } catch {
      prompt("複製失敗，請手動複製：", url);
    }
  }

  async function handleDelete(room: Room) {
    if (
      !confirm(
        `確定要刪除「${room.name}」嗎？\n這會連帶刪除此 Room 的所有題目、賓客與答題紀錄，無法還原。`
      )
    )
      return;
    setBusy(true);
    try {
      await deleteRoom(room.roomId, hostPassword);
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
          <h1 className="text-2xl font-semibold">婚禮遊戲後台</h1>
          <p className="text-sm text-muted-foreground">GameRoom 管理</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            localStorage.removeItem("weddinggame:hostPassword");
            navigate("/host/login");
          }}
        >
          登出
        </Button>
      </header>

      <form
        onSubmit={handleCreate}
        className="flex gap-2 items-end border rounded-xl p-4 bg-card"
      >
        <div className="flex-1 space-y-1">
          <Label htmlFor="newName">新 GameRoom 名稱</Label>
          <Input
            id="newName"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="例如：大衛和小美的婚禮"
          />
        </div>
        <Button type="submit" disabled={busy || !newName.trim()}>
          建立
        </Button>
      </form>

      {loading && <p className="text-center text-muted-foreground">載入中...</p>}
      {error && <p className="text-center text-destructive">{error}</p>}

      {!loading && rooms.length === 0 && (
        <p className="text-center text-muted-foreground">
          還沒有任何 Room，建立第一個開始吧。
        </p>
      )}

      {qrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setQrModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl border space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">{qrModal.title}</h2>
              <button
                type="button"
                onClick={() => setQrModal(null)}
                className="text-2xl leading-none text-muted-foreground hover:text-foreground"
                aria-label="關閉"
              >
                ×
              </button>
            </div>
            <div className="flex justify-center bg-white p-4 rounded-lg">
              <QRCodeSVG
                value={qrModal.url}
                size={320}
                level="M"
                marginSize={2}
              />
            </div>
            <p className="text-xs font-mono text-center text-muted-foreground break-all">
              {qrModal.url}
            </p>
            <p className="text-[11px] text-center text-muted-foreground">
              用手機相機或掃碼 App 對準即可開啟
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rooms.map((room) => (
          <div
            key={room.roomId}
            className="border rounded-xl p-4 bg-card space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold truncate">{room.name}</h2>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  {room.roomId}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {statusUpdatingId === room.roomId && (
                  <span className="text-xs text-muted-foreground animate-pulse">
                    儲存中…
                  </span>
                )}
                <select
                  className="text-sm border rounded-md px-2 py-1 bg-background disabled:opacity-60"
                  value={room.status}
                  disabled={statusUpdatingId === room.roomId}
                  onChange={(e) =>
                    handleStatusChange(room, e.target.value as RoomStatus)
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="rounded-md bg-muted p-2 space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  邀請連結（RSVP 問卷）
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono flex-1 truncate">
                    {inviteUrl(room)}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard("邀請連結", inviteUrl(room))}
                  >
                    複製
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setQrModal({
                        title: `${room.name}・邀請連結`,
                        url: inviteUrl(room),
                      })
                    }
                  >
                    QR
                  </Button>
                </div>
              </div>
              <div className="rounded-md bg-muted p-2 space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  遊戲連結（賓客遊玩）
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono flex-1 truncate">
                    {gameUrl(room)}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard("遊戲連結", gameUrl(room))}
                  >
                    複製
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setQrModal({
                        title: `${room.name}・遊戲連結`,
                        url: gameUrl(room),
                      })
                    }
                  >
                    QR
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                to={`/host/rooms/${room.roomId}/edit`}
                className="underline underline-offset-2"
              >
                編輯題目
              </Link>
              <span className="text-muted-foreground">·</span>
              <Link
                to={`/host/rooms/${room.roomId}/control`}
                className="underline underline-offset-2"
              >
                主持人控制台
              </Link>
              <span className="text-muted-foreground">·</span>
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => handleRename(room)}
              >
                改名
              </button>
              <span className="text-muted-foreground">·</span>
              <button
                type="button"
                className="text-destructive underline underline-offset-2"
                onClick={() => handleDelete(room)}
              >
                刪除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
