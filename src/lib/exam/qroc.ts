export function normalizeQrocAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function isQrocAnswerCorrect(
  userAnswer: string | undefined,
  acceptedAnswers: string[]
): boolean {
  if (!userAnswer) return false;

  const normalizedUserAnswer = normalizeQrocAnswer(userAnswer);

  if (!normalizedUserAnswer) return false;

  return acceptedAnswers.some((answer) => {
    return normalizeQrocAnswer(answer) === normalizedUserAnswer;
  });
}