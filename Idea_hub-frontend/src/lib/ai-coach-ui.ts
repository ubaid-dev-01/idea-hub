export function isAiCoachUiEnabled(): boolean {
  return (
    String(process.env.NEXT_PUBLIC_ENABLE_AI_COACH ?? '').toLowerCase() ===
    'true'
  );
}
