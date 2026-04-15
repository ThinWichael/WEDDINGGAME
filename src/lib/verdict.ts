export function isVerdictQuestion(correctAnswer: string): boolean {
  return !correctAnswer || correctAnswer.trim() === "";
}

export function resolveWinner(
  correctAnswer: string,
  counts: Record<string, number>
): string {
  if (!isVerdictQuestion(correctAnswer)) return correctAnswer;
  const entries = Object.entries(counts);
  if (entries.length === 0) return "";
  const max = Math.max(...entries.map(([, c]) => c));
  if (max === 0) return "";
  const top = entries.filter(([, c]) => c === max);
  if (top.length > 1) return "";
  return top[0][0];
}
