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
    // 자동 이벤트 활성 폐기 (2026-05-21).
    // 사용자 의도 없이 음영이 깔리면 anomaly가 "이벤트 때문"이라는 인지 편향 유발.
    // 클린 슬레이트로 진입 → FilterBar에서 사용자가 명시적으로 토글.
  }, [query.data, setEvents]);

  return query;
}
