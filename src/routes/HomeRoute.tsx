import { Link } from "react-router-dom";

export default function HomeRoute() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-3">婚禮問答遊戲</h1>
        <p className="text-muted-foreground">
          賓客請從邀請連結進入（形式：/invite/roomId）
        </p>
      </div>
      <Link
        to="/host/login"
        className="text-sm underline underline-offset-2 text-muted-foreground"
      >
        主持人後台 →
      </Link>
    </div>
  );
}
