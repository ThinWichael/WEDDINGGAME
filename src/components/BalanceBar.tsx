import { motion } from "framer-motion";

interface BalanceBarProps {
  yesCount: number;
  noCount: number;
  revealed: boolean;
  yesLabel?: string;
  noLabel?: string;
}

/**
 * YES/NO 天平：一條水平 bar，中間的支點球會依照票數分布
 * 戲劇性地往 YES 或 NO 那一側彈性滑動（spring physics）。
 */
export function BalanceBar({
  yesCount,
  noCount,
  revealed,
  yesLabel = "YES",
  noLabel = "NO",
}: BalanceBarProps) {
  const total = yesCount + noCount;
  // -1 = 全都投 NO，+1 = 全都投 YES，0 = 均勢
  const bias = total === 0 ? 0 : (yesCount - noCount) / total;
  // pivot 位置：0% = 最左（YES 側），100% = 最右（NO 側）
  // 為了戲劇感，不用線性對應，而是把 bias 映射到 10%~90%
  const pivotPercent = 50 - bias * 40;

  return (
    <div className="w-full select-none">
      <div className="flex justify-between text-sm font-semibold mb-2">
        <span className="text-emerald-600">{yesLabel}</span>
        <span className="text-rose-600">{noLabel}</span>
      </div>

      <div className="relative h-16">
        {/* 底部 bar */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 rounded-full bg-gradient-to-r from-emerald-200 via-muted to-rose-200" />

        {/* 中線（起始基準） */}
        <div className="absolute top-1/2 -translate-y-1/2 left-1/2 w-px h-6 bg-muted-foreground/30" />

        {/* 支點球 */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
          initial={{ left: "50%" }}
          animate={{ left: `${pivotPercent}%` }}
          transition={{
            type: "spring",
            stiffness: 120,
            damping: 8,
            mass: 1.2,
          }}
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-primary shadow-lg ring-4 ring-primary/20" />
            {revealed && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-mono whitespace-nowrap bg-foreground text-background px-2 py-0.5 rounded"
              >
                {bias >= 0 ? `+${Math.round(bias * 100)}%` : `${Math.round(bias * 100)}%`}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground mt-2 font-mono">
        <span>{revealed ? `${yesCount} 票` : "—"}</span>
        <span>{revealed ? `${noCount} 票` : "—"}</span>
      </div>
    </div>
  );
}
