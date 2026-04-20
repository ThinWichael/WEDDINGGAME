import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface BalanceBarProps {
  yesCount: number;
  noCount: number;
  revealed: boolean;
  yesLabel?: string;
  noLabel?: string;
  yesImage?: string | null;
  noImage?: string | null;
}

function OptionImage({ src }: { src: string | null | undefined }) {
  const [errored, setErrored] = useState(false);
  // Reset error state if the src URL itself changes (e.g. next question).
  useEffect(() => {
    setErrored(false);
  }, [src]);
  if (!src || errored) return null;
  return (
    <img
      src={src}
      alt=""
      onError={() => setErrored(true)}
      className="w-28 h-28 md:w-32 md:h-32 object-contain shrink-0"
    />
  );
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
  yesImage,
  noImage,
}: BalanceBarProps) {
  const total = yesCount + noCount;
  // -1 = 全都投 NO，+1 = 全都投 YES，0 = 均勢
  const bias = total === 0 ? 0 : (yesCount - noCount) / total;
  // pivot 位置：0% = 最左（YES 側），100% = 最右（NO 側）
  // 為了戲劇感，不用線性對應，而是把 bias 映射到 10%~90%
  const pivotPercent = 50 - bias * 40;

  return (
    <div className="w-full select-none">
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className="text-sm font-semibold text-wedding-gold">
            {yesLabel}
          </span>
          <OptionImage src={yesImage} />
          <span className="text-xs text-wedding-gold-soft font-mono">
            {revealed ? `${yesCount} 票` : "—"}
          </span>
        </div>

        <div className="relative h-16 flex-1">
          {/* 底部 bar */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 rounded-full bg-wedding-gold-soft/25" />

          {/* 中線（起始基準） */}
          <div className="absolute top-1/2 -translate-y-1/2 left-1/2 w-px h-6 bg-wedding-gold-soft/50" />

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
              <div className="w-5 h-5 ring-2 sm:w-10 sm:h-10 sm:ring-4 rounded-full bg-wedding-gold shadow-lg ring-wedding-gold/20" />
              {revealed && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                  className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-mono whitespace-nowrap bg-wedding-gold text-white px-2 py-0.5 rounded"
                >
                  {bias >= 0 ? `+${Math.round(bias * 100)}%` : `${Math.round(bias * 100)}%`}
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className="text-sm font-semibold text-wedding-gold">
            {noLabel}
          </span>
          <OptionImage src={noImage} />
          <span className="text-xs text-wedding-gold-soft font-mono">
            {revealed ? `${noCount} 票` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
