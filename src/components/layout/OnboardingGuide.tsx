import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/stores/useAppStore';

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const STEP_TEXT = [
  '이 빨간 점이 이상 탐지 시점입니다. 클릭하면 분석 수치를 볼 수 있습니다',
  '계량경제학 수치 항목을 클릭하면 해당 지표의 개별 그래프를 확인할 수 있습니다',
  'ML 모델 행을 클릭하면 각 모델이 분석한 결과맵을 볼 수 있습니다',
  '방법론 탭에서 파이프라인 전체 설명을 확인하세요',
];

const SPOTLIGHT_PADDING = 8;

function getSelector(step: number, anomalyId: number | null): string {
  switch (step) {
    case 1:
      return `[data-anomaly-id="${anomalyId}"]`;
    case 2:
      return '[data-testid="stat-section"]';
    case 3:
      return '[data-testid="ml-section"]';
    default:
      return '[data-testid="tab-methodology"]';
  }
}

export function OnboardingGuide() {
  const {
    isOnboardingVisible,
    hasSeenOnboardingThisSession,
    selectedAnomalyId,
    activeTab,
    isPanelOpen,
    setOnboardingVisible,
    setHasSeenOnboardingThisSession,
    selectAnomaly,
  } = useAppStore();

  const [step, setStep] = useState(1);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  // 온보딩 시작 조건 (feature_spec_fe-onboarding_vN §3.2 ④)
  useEffect(() => {
    if (hasSeenOnboardingThisSession) return;
    if (activeTab !== 'stream') return;
    if (selectedAnomalyId === null) return;
    setStep(1);
    setOnboardingVisible(true);
  }, [selectedAnomalyId, activeTab, hasSeenOnboardingThisSession, setOnboardingVisible]);

  // 각 단계 타겟 요소 위치 계산
  useEffect(() => {
    if (!isOnboardingVisible) {
      setTargetRect(null);
      return;
    }

    let cancelled = false;

    const resolveRect = async () => {
      // 2·3단계: 패널 미열림 시 자동 오픈 후 300ms 대기
      if ((step === 2 || step === 3) && !isPanelOpen && selectedAnomalyId !== null) {
        selectAnomaly(selectedAnomalyId);
        await new Promise<void>((res) => setTimeout(res, 300));
      }
      if (cancelled) return;

      const selector = getSelector(step, selectedAnomalyId);
      const el = document.querySelector(selector);

      if (el) {
        const r = el.getBoundingClientRect();
        setTargetRect({ x: r.x, y: r.y, width: r.width, height: r.height });
      } else {
        // 타겟 미존재 시 해당 단계 스킵 후 다음 단계 진행 (§4.1)
        console.warn(`[OnboardingGuide] target not found: ${selector}`);
        if (step < 4) {
          setStep((s) => s + 1);
        } else {
          setOnboardingVisible(false);
          setHasSeenOnboardingThisSession(true);
        }
        setTargetRect(null);
      }
    };

    resolveRect();
    return () => {
      cancelled = true;
    };
  }, [step, isOnboardingVisible, isPanelOpen, selectedAnomalyId, selectAnomaly, setOnboardingVisible, setHasSeenOnboardingThisSession]);

  const completeOnboarding = useCallback(() => {
    setOnboardingVisible(false);
    setHasSeenOnboardingThisSession(true);
    setStep(1);
  }, [setOnboardingVisible, setHasSeenOnboardingThisSession]);

  const handleNext = useCallback(() => {
    if (step < 4) {
      setStep((s) => s + 1);
    } else {
      completeOnboarding();
    }
  }, [step, completeOnboarding]);

  const handlePrev = useCallback(() => {
    if (step > 1) setStep((s) => s - 1);
  }, [step]);

  if (!isOnboardingVisible || !targetRect) return null;

  const spotX = targetRect.x - SPOTLIGHT_PADDING;
  const spotY = targetRect.y - SPOTLIGHT_PADDING;
  const spotW = targetRect.width + SPOTLIGHT_PADDING * 2;
  const spotH = targetRect.height + SPOTLIGHT_PADDING * 2;

  // 툴팁 위치: 타겟 아래 우선, 화면 밖 시 위로 전환
  const tooltipWidth = 340;
  const tooltipLeft = Math.max(
    16,
    Math.min(targetRect.x, window.innerWidth - tooltipWidth - 16),
  );
  const tooltipBelow = targetRect.y + targetRect.height + 12;
  const tooltipAbove = targetRect.y - 148;
  const tooltipTop = tooltipBelow + 140 > window.innerHeight ? tooltipAbove : tooltipBelow;

  return (
    <>
      {/* 배경 클릭 → 온보딩 종료 (§6 강제 온보딩 금지) */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 8999 }}
        onClick={completeOnboarding}
      />

      {/* 스포트라이트: box-shadow로 배경 어둡게 + 타겟 영역 강조 링 */}
      <div
        style={{
          position: 'fixed',
          left: spotX,
          top: spotY,
          width: spotW,
          height: spotH,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
          borderRadius: 4,
          outline: '2px solid rgb(34, 211, 238)',
          outlineOffset: 2,
          zIndex: 9000,
          pointerEvents: 'none',
        }}
      />

      {/* 툴팁 버블 */}
      <div
        style={{
          position: 'fixed',
          left: tooltipLeft,
          top: tooltipTop,
          width: tooltipWidth,
          zIndex: 9001,
        }}
        className="bg-slate-800 text-white rounded-lg p-4 shadow-xl border border-slate-600"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm leading-relaxed mb-4">{STEP_TEXT[step - 1]}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={handlePrev}
                className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-colors"
              >
                이전
              </button>
            )}
            <span className="text-xs text-slate-400 select-none">{step}/4</span>
            {step < 4 ? (
              <button
                onClick={handleNext}
                className="px-3 py-1 text-xs bg-cyan-600 hover:bg-cyan-500 rounded transition-colors"
              >
                다음
              </button>
            ) : (
              <button
                onClick={completeOnboarding}
                className="px-3 py-1 text-xs bg-cyan-600 hover:bg-cyan-500 rounded transition-colors"
              >
                완료
              </button>
            )}
          </div>
          <button
            onClick={completeOnboarding}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            스킵
          </button>
        </div>
      </div>
    </>
  );
}
