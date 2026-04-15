import { motion } from "framer-motion";

interface VoterListsProps {
  type: "yn" | "single";
  options: string[];
  correctAnswer: string;
  yesVoters?: string[];
  noVoters?: string[];
  optionVoters?: string[][];
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

// Deterministic pseudo-random in [-1, 1] based on a string seed.
function rand(seed: string, salt: string): number {
  const h = hashSeed(seed + "::" + salt);
  return ((h % 2000) / 1000) - 1;
}

function VoterChips({
  voters,
  groupKey,
}: {
  voters: string[];
  groupKey: string;
}) {
  if (voters.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {voters.map((nick, i) => {
        const rotate = rand(nick, groupKey + "r") * 6;
        const y = rand(nick, groupKey + "y") * 3;
        return (
          <motion.span
            key={`${groupKey}-${nick}-${i}`}
            initial={{ opacity: 0, scale: 0.75, rotate: 0, y: 0 }}
            animate={{ opacity: 1, scale: 1, rotate, y }}
            transition={{
              delay: 0.35 + i * 0.04,
              type: "spring",
              stiffness: 180,
              damping: 12,
            }}
            className="inline-block px-2.5 py-1 rounded-full bg-wedding-gold-soft/20 text-xs text-wedding-gold shadow-sm border border-wedding-gold-soft/30"
          >
            {nick}
          </motion.span>
        );
      })}
    </div>
  );
}

function VoterCard({
  title,
  voters,
  isCorrect,
  groupKey,
}: {
  title: string;
  voters: string[];
  isCorrect: boolean;
  groupKey: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={
        "rounded-xl border p-3 bg-card/50 space-y-1 " +
        (isCorrect
          ? "border-emerald-500/60"
          : "border-wedding-gold-soft/30")
      }
    >
      <div className="flex items-center justify-between text-xs">
        <span
          className={
            isCorrect
              ? "font-semibold text-emerald-600"
              : "text-wedding-gold font-semibold"
          }
        >
          {title}
          {isCorrect && " ✓"}
        </span>
        <span className="font-mono text-wedding-gold-soft">
          {voters.length} 人
        </span>
      </div>
      <VoterChips voters={voters} groupKey={groupKey} />
    </motion.div>
  );
}

export function VoterLists({
  type,
  options,
  correctAnswer,
  yesVoters = [],
  noVoters = [],
  optionVoters = [],
}: VoterListsProps) {
  if (type === "yn") {
    const yesLabel = options[0]?.trim() || "YES";
    const noLabel = options[1]?.trim() || "NO";
    const correct = correctAnswer.toLowerCase();
    return (
      <div className="grid grid-cols-2 gap-3">
        <VoterCard
          title={yesLabel}
          voters={yesVoters}
          isCorrect={correct === "yes"}
          groupKey="yes"
        />
        <VoterCard
          title={noLabel}
          voters={noVoters}
          isCorrect={correct === "no"}
          groupKey="no"
        />
      </div>
    );
  }

  const correctKey = correctAnswer.toUpperCase();
  return (
    <div className="space-y-3">
      {options.map((label, i) => {
        const key = String.fromCharCode(65 + i);
        const voters = optionVoters[i] ?? [];
        return (
          <VoterCard
            key={key}
            title={`${key}. ${label}`}
            voters={voters}
            isCorrect={correctKey === key}
            groupKey={key}
          />
        );
      })}
    </div>
  );
}
