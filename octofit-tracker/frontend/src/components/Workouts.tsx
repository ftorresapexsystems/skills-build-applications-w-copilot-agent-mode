import { useCallback } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type WorkoutSuggestion = { title: string; reason: string };

export default function Workouts() {
  const loadItems = useCallback(
    async () => (await getJson<{ suggestions: WorkoutSuggestion[] }>('/api/workouts/suggestions/mona%40example.com')).suggestions,
    [],
  );

  return (
    <CapabilityCard<WorkoutSuggestion>
      title="Workout suggestions"
      description="Recommend workouts from activity patterns."
      loadItems={loadItems}
      emptyMessage="No workout suggestions yet."
      renderItem={(suggestion) => <><strong>{suggestion.title}</strong>: {suggestion.reason}</>}
    />
  );
}
