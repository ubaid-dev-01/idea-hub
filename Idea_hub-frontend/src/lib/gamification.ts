export function isGamificationUiEnabled(): boolean {
  return (
    String(process.env.NEXT_PUBLIC_ENABLE_GAMIFICATION ?? '').toLowerCase() ===
    'true'
  );
}
