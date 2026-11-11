import { useCallback } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Team = { name: string; members: string[] };

export default function Teams() {
  const loadItems = useCallback(
    async () => (await getJson<{ teams: Team[] }>('/api/teams')).teams,
    [],
  );

  return (
    <CapabilityCard<Team>
      title="Teams"
      description="Manage teams and members."
      loadItems={loadItems}
      emptyMessage="No teams yet."
      renderItem={(team) => <>{team.name} ({team.members.length} members)</>}
    />
  );
}
