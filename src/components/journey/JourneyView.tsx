// 분석 여정 3D 무대 — 라이트 단일 룩. 스크롤 없음(방향키 ↑↓·우측 버튼 이산 이동).
// 데이터는 Canvas 밖 useJourneyData로 받아 props 주입(Canvas 안은 react-query 미도달).
import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { JOURNEY_STAGE_COUNT, JOURNEY_THEME, useJourneyProgress } from './journeyContract';
import { JourneyRig } from './JourneyRig';
import { Stage } from './Stage';
import { JourneyNarration } from './narration/JourneyNarration';
import { HoverPanel } from './primitives/HoverPanel';
import { useJourneyData } from './useJourneyData';
import { Station1Sources } from './stations/Station1Sources';
import { Station2Segments } from './stations/Station2Segments';
import { Station3Pipeline } from './stations/Station3Pipeline';
import { Station4DualDetect } from './stations/Station4DualDetect';
import { Station5Confidence } from './stations/Station5Confidence';
import { Station6Results } from './stations/Station6Results';

export function JourneyView() {
  const data = useJourneyData();
  const common = { commodityId: data.commodityId, anomalyId: data.anomalyId };
  const stage = useJourneyProgress((s) => s.stage);
  const next = useJourneyProgress((s) => s.next);
  const prev = useJourneyProgress((s) => s.prev);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  return (
    <div className="relative w-full h-full">
      <JourneyNarration scatter={data.scatter} segments={data.commodity?.segments ?? []} />
      <HoverPanel />
      <Canvas camera={{ position: [0, 0, 23], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={[JOURNEY_THEME.bg]} />
        <ambientLight intensity={JOURNEY_THEME.ambient} />
        <hemisphereLight args={['#fff7ec', '#d8d2c6', 0.4]} />
        <directionalLight position={[6, 10, 12]} intensity={JOURNEY_THEME.dir} />
        <JourneyRig />
        <Stage index={0}>
          {({ active }) => (
            <Station1Sources {...common} active={active} rawPrices={data.rawPrices} />
          )}
        </Stage>
        <Stage index={1}>
          {({ active }) => (
            <Station2Segments {...common} active={active} commodity={data.commodity} detail={data.detail} />
          )}
        </Stage>
        <Stage index={2}>
          {({ active }) => (
            <Station3Pipeline {...common} active={active} pipeline={data.pipeline} params={data.params} />
          )}
        </Stage>
        <Stage index={3}>
          {({ active }) => (
            <Station4DualDetect {...common} active={active} detail={data.detail} />
          )}
        </Stage>
        <Stage index={4}>
          {({ active }) => (
            <Station5Confidence {...common} active={active} detail={data.detail} stream={data.stream} />
          )}
        </Stage>
        <Stage index={5}>
          {({ active }) => (
            <Station6Results {...common} active={active} stream={data.stream} events={data.events} />
          )}
        </Stage>
      </Canvas>

      {/* 이산 이동 컨트롤 (방향키 ↑↓와 동일) */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-3">
        <button
          onClick={prev}
          disabled={stage === 0}
          aria-label="이전 단계"
          className="w-11 h-11 rounded-full bg-surface border border-border-default shadow-e2 flex items-center justify-center text-primary text-[16px] transition-colors hover:bg-subtle disabled:opacity-30 disabled:cursor-default"
        >
          ▲
        </button>
        <span className="text-tertiary text-[12px] font-mono">
          {stage + 1}/{JOURNEY_STAGE_COUNT}
        </span>
        <button
          onClick={next}
          disabled={stage === JOURNEY_STAGE_COUNT - 1}
          aria-label="다음 단계"
          className="w-11 h-11 rounded-full bg-surface border border-border-default shadow-e2 flex items-center justify-center text-primary text-[16px] transition-colors hover:bg-subtle disabled:opacity-30 disabled:cursor-default"
        >
          ▼
        </button>
      </div>
    </div>
  );
}
