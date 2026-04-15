import { animate, useMotionValue, useTransform, motion } from "framer-motion";
import { useEffect } from "react";

interface AnimatedNumberProps {
  value: number;
  durationMs?: number;
  className?: string;
}

/**
 * 公佈答案時，數字從 0 彈性增長到目標值。
 */
export function AnimatedNumber({
  value,
  durationMs = 900,
  className,
}: AnimatedNumberProps) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: durationMs / 1000,
      ease: [0.2, 0.8, 0.2, 1],
    });
    return () => controls.stop();
  }, [value, durationMs, mv]);

  return <motion.span className={className}>{rounded}</motion.span>;
}
