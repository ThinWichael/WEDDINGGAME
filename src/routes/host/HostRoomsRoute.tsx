import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

const STATUSES: RoomStatus[] = ["draft", "waiting", "playing", "ended"];

export default function HostRoomsRoute() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

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
    setBusy(true);
    try {
      await updateRoom({ roomId: room.roomId, status }, hostPassword);
      await reload();
    } catch (e) {
      alert("更新失敗：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
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

  async function handleCopyInviteUrl(room: Room) {
    const url = `${window.location.origin}/invite/${room.roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      alert("已複製邀請連結：\n" + url);
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
              <select
                className="text-sm border rounded-md px-2 py-1 bg-background"
                value={room.status}
                disabled={busy}
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
            <div className="rounded-md bg-muted p-2 flex items-center gap-2">
              <code className="text-xs font-mono flex-1 truncate">
                {`${window.location.origin}/invite/${room.roomId}`}
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleCopyInviteUrl(room)}
              >
                複製邀請連結
              </Button>
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
