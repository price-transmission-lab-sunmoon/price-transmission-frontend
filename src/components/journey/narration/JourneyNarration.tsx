// 좌측 해설 패널. 현재 stage에 따라 해설이 교체되며, 품목명은 전역 primaryCommodityId를 따른다.
import { useAppStore } from '@/stores/useAppStore';
import { useJourneyProgress, JOURNEY_STAGE_COUNT } from '../journeyContract';
import { STATION_COPY } from './stationCopy';
import { JourneyNodePicker } from './JourneyNodePicker';
import type { ScatterResponse } from '@/types/timeseries';

export function JourneyNarration({
  scatter,
  segments,
}: {
  scatter?: ScatterResponse;
  segments: string[];
}) {
  const stage = useJourneyProgress((s) => s.stage);
  const setStage = useJourneyProgress((s) => s.setStage);
  const primaryId = useAppStore((s) => s.primaryCommodityId);
  const commodities = useAppStore((s) => s.commodities);
  const name = commodities.find((c) => c.commodity_id === primaryId)?.name_kr ?? '품목 미선택';
  const copy = STATION_COPY[stage] ?? STATION_COPY[0];

  return (
    <div className="absolute left-0 top-0 z-10 w-[clamp(280px,32%,420px)] h-full p-8 flex flex-col justify-center pointer-events-none">
      <div className="pointer-events-auto bg-surface border border-border-default rounded-xl p-6 shadow-e2 max-h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="mb-5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-subtle">
          <span className="w-2 h-2 rounded-full bg-brand" />
          <span className="text-secondary text-[13px] font-medium">분석 품목: {name}</span>
        </div>

        <p className="text-tertiary text-[12px] font-mono m-0 mb-1">
          {stage + 1} / {JOURNEY_STAGE_COUNT}
        </p>
        <h2 className="text-primary text-[22px] font-bold tracking-tight m-0">{copy.title}</h2>
        <p className="text-secondary text-[14px] mt-1 mb-4 m-0">{copy.subtitle}</p>

        <ul className="space-y-1.5 m-0 p-0 list-none">
          {copy.body.map((b, i) => (
            <li key={i} className="text-secondary text-[13px] leading-relaxed">
              · {b}
            </li>
          ))}
        </ul>

        {/* 단계 점 */}
        <div className="flex gap-1.5 mt-6 items-center">
          {Array.from({ length: JOURNEY_STAGE_COUNT }).map((_, i) => (
            <button
              key={i}
              onClick={() => setStage(i)}
              aria-label={`${i + 1}단계로 이동`}
              className={[
                'h-1.5 rounded-full transition-all duration-default',
                i === stage ? 'w-6 bg-brand' : 'w-1.5 bg-border-strong hover:bg-tertiary',
              ].join(' ')}
            />
          ))}
        </div>

        <p className="text-tertiary text-[11px] mt-4 m-0">
          방향키 ↑↓ 또는 우측 버튼으로 단계 이동 · 상단에서 품목 변경
        </p>

        <JourneyNodePicker scatter={scatter} segments={segments} />
      </div>
    </div>
  );
}
