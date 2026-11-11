import { useCallback } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type LeaderboardEntry = { teamName: string; totalPoints: number; rank: number };

export default function Leaderboard() {
  const loadItems = useCallback(
    async () => (await getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard')).leaderboard,
    [],
  );

  return (
    <CapabilityCard<LeaderboardEntry>
      title="Leaderboard"
      description="Compare team point totals."
      loadItems={loadItems}
      emptyMessage="No leaderboard rankings yet."
      renderItem={(entry) => `${entry.rank}. ${entry.teamName} — ${entry.totalPoints} points`}
    />
  );
}
