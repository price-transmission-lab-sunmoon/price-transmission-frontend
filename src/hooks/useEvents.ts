import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { useAppStore } from '@/stores/useAppStore';
import type { ExternalEvent } from '@/types/event';

interface EventsResponse {
  events: ExternalEvent[];
}

export function useEvents() {
  const query = useQuery<ExternalEvent[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await client.get<EventsResponse>('/events');
      return res.data.events;
    },
    staleTime: 30 * 60 * 1000,
  });

  const setEvents = useAppStore((s) => s.setEvents);

  useEffect(() => {
    if (!query.data) return;
    setEvents(query.data);
  }, [query.data, setEvents]);

  return query;
}
