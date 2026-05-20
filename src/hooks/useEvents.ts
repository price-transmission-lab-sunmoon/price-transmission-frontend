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
  const setEventFilter = useAppStore((s) => s.setEventFilter);

  useEffect(() => {
    if (!query.data) return;
    setEvents(query.data);
    // P2-1: 최초 로드 시 사건 필터가 비어있으면 가장 최근 이벤트 1개 자동 활성.
    // 사용자에게 사건 음영 기능의 존재를 알리는 보조 온보딩 역할.
    const currentFilter = useAppStore.getState().eventFilter;
    if (currentFilter.length === 0 && query.data.length > 0) {
      const latest = [...query.data].sort((a, b) =>
        b.start_date.localeCompare(a.start_date),
      )[0];
      setEventFilter([latest.event_key]);
    }
  }, [query.data, setEvents, setEventFilter]);

  return query;
}
