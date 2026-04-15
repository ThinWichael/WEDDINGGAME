import { motion } from "framer-motion";
import { AnimatedNumber } from "./AnimatedNumber";

interface VoteBarsProps {
  options: string[];
  counts: number[];
  correctKey?: string;
  revealed: boolean;
}

/**
 * 單選題的票數視覺化：每個選項一條橫向長條，彈性成長寬度。
 * 公佈答案時正確選項會高亮。
 */
export function VoteBars({
  options,
  counts,
  correctKey,
  revealed,
}: VoteBarsProps) {
  const total = counts.reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-3">
      {options.map((label, i) => {
        const key = String.fromCharCode(65 + i);
        const c = counts[i] ?? 0;
        const pct = total === 0 ? 0 : (c / total) * 100;
        const isCorrect = revealed && correctKey === key;
        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span
                className={
                  isCorrect
                    ? "font-semibold text-emerald-600"
                    : "text-wedding-gold"
                }
              >
                {key}. {label}
                {isCorrect && " ✓"}
              </span>
              <span className="font-mono text-xs text-wedding-gold-soft">
                {revealed ? (
                  <>
                    <AnimatedNumber value={c} /> 票
                  </>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-wedding-gold-soft/15 overflow-hidden">
              <motion.div
                className={
                  isCorrect
                    ? "absolute inset-y-0 left-0 bg-emerald-500"
                    : "absolute inset-y-0 left-0 bg-wedding-gold-soft"
                }
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ type: "spring", stiffness: 80, damping: 14 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
