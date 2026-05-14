import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import type { ExternalEvent } from '@/types/event';

interface EventsResponse {
  events: ExternalEvent[];
}

export function useEvents() {
  return useQuery<ExternalEvent[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await client.get<EventsResponse>('/events');
      return res.data.events;
    },
    staleTime: 30 * 60 * 1000,
  });
}
