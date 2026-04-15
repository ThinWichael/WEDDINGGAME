import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
// === 邀請頁 ===
// 目前使用：Michael & Lily 設計師版邀請頁 (MichaelLilyInviteRoute)。
// 若要切回原本功能型表單，將下面的 import 註解互換，並把 /invite/:roomId 路由的 element 換回 <InviteRoute /> 即可。
// 原始 InviteRoute.tsx 完全保留未動，永遠是可靠的 fallback。
import MichaelLilyInviteRoute from "@/routes/invite/couples/michael-lily/MichaelLilyInviteRoute";
// import InviteRoute from "@/routes/invite/InviteRoute";
import GameRoute from "@/routes/game/GameRoute";
import HostControlRoute from "@/routes/host/rooms/HostControlRoute";
import HostLoginRoute from "@/routes/host/HostLoginRoute";
import HostRoomsRoute from "@/routes/host/HostRoomsRoute";
import HostQuestionsRoute from "@/routes/host/HostQuestionsRoute";
import HomeRoute from "@/routes/HomeRoute";
import { HostGuard } from "@/components/HostGuard";

const router = createBrowserRouter(
  [
    { path: "/", element: <HomeRoute /> },
    // 若要切回原版：element: <InviteRoute />
    { path: "/invite/:roomId", element: <MichaelLilyInviteRoute /> },
    { path: "/game/:roomId", element: <GameRoute /> },
    { path: "/host/login", element: <HostLoginRoute /> },
    {
      path: "/host/rooms",
      element: (
        <HostGuard>
          <HostRoomsRoute />
        </HostGuard>
      ),
    },
    {
      path: "/host/rooms/:roomId/edit",
      element: (
        <HostGuard>
          <HostQuestionsRoute />
        </HostGuard>
      ),
    },
    {
      path: "/host/rooms/:roomId/control",
      element: (
        <HostGuard>
          <HostControlRoute />
        </HostGuard>
      ),
    },
    { path: "*", element: <Navigate to="/" replace /> },
  ],
  { basename: import.meta.env.BASE_URL }
);

export default function App() {
  return <RouterProvider router={router} />;
}
