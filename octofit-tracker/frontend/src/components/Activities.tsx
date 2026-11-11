import { useCallback } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Activity = { type: string; minutes: number; points: number };

export default function Activities() {
  const loadItems = useCallback(
    async () => (await getJson<{ activities: Activity[] }>('/api/activities')).activities,
    [],
  );

  return (
    <CapabilityCard<Activity>
      title="Activities"
      description="Track student activity minutes and points."
      loadItems={loadItems}
      emptyMessage="No activities yet."
      renderItem={(activity) => `${activity.type} — ${activity.minutes} minutes (${activity.points} points)`}
    />
  );
}
