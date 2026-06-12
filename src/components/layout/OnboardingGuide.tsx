import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { Z_INDEX } from '@/utils/zIndex';
import { Button } from '@/components/ui/Button';

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const STEP_TEXT = [
  '이 빨간 점이 이상 탐지 시점입니다. 클릭하면 분석 수치를 볼 수 있습니다.',
  '계량경제학 수치 항목을 클릭하면 해당 지표의 개별 그래프를 확인할 수 있습니다.',
  'ML 모델 행을 클릭하면 각 모델이 분석한 결과맵을 볼 수 있습니다.',
  '방법론 탭에서 파이프라인 전체 설명을 확인하세요.',
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
  }, [
    selectedAnomalyId,
    activeTab,
    hasSeenOnboardingThisSession,
    setOnboardingVisible,
  ]);

  // 각 단계 타겟 요소 위치 계산
  useEffect(() => {
    if (!isOnboardingVisible) {
      setTargetRect(null);
      return;
    }

    let cancelled = false;

    const resolveRect = async () => {
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
  }, [
    step,
    isOnboardingVisible,
    isPanelOpen,
    selectedAnomalyId,
    selectAnomaly,
    setOnboardingVisible,
    setHasSeenOnboardingThisSession,
  ]);

  const completeOnboarding = useCallback(() => {
    setOnboardingVisible(false);
    setHasSeenOnboardingThisSession(true);
    setStep(1);
  }, [setOnboardingVisible, setHasSeenOnboardingThisSession]);

  // Esc → close
  useEffect(() => {
    if (!isOnboardingVisible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') completeOnboarding();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOnboardingVisible, completeOnboarding]);

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
  const tooltipWidth = 360;
  const tooltipLeft = Math.max(
    16,
    Math.min(targetRect.x, window.innerWidth - tooltipWidth - 16),
  );
  const tooltipBelow = targetRect.y + targetRect.height + 16;
  const tooltipAbove = targetRect.y - 168;
  const tooltipTop = tooltipBelow + 160 > window.innerHeight ? tooltipAbove : tooltipBelow;

  return (
    <>
      {/* 배경 클릭 → 온보딩 종료 (스포트라이트 영역 클릭은 통과) */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: Z_INDEX.ONBOARDING_OVERLAY }}
        onClick={(e) => {
          const x = e.clientX;
          const y = e.clientY;
          const insideSpot =
            x >= spotX && x <= spotX + spotW && y >= spotY && y <= spotY + spotH;
          if (!insideSpot) completeOnboarding();
        }}
      />

      {/* 스포트라이트 */}
      <div
        className="onboarding-spotlight"
        style={{
          position: 'fixed',
          left: spotX,
          top: spotY,
          width: spotW,
          height: spotH,
          boxShadow: '0 0 0 9999px rgba(28, 24, 18, 0.6)',
          borderRadius: 4,
          outline: '2.5px solid var(--brand)',
          outlineOffset: 2,
          zIndex: Z_INDEX.ONBOARDING_SPOTLIGHT,
          pointerEvents: 'none',
        }}
      />

      {/* 툴팁 버블 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`온보딩 단계 ${step}/4`}
        className="overlay-content-in bg-surface text-primary rounded-lg border border-border-default shadow-e5"
        style={{
          position: 'fixed',
          left: tooltipLeft,
          top: tooltipTop,
          width: tooltipWidth,
          padding: 20,
          zIndex: Z_INDEX.ONBOARDING_TOOLTIP,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 진행 표시 */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-widest text-brand">
            단계 {step}/4
          </span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4].map((n) => (
              <span
                key={n}
                className="block h-[3px] w-6 rounded-pill"
                style={{
                  background:
                    n <= step ? 'var(--brand)' : 'var(--bg-muted)',
                }}
              />
            ))}
          </div>
        </div>

        <p className="text-[14px] leading-[1.625] mb-5 m-0">{STEP_TEXT[step - 1]}</p>

        <div className="flex items-center justify-between gap-2">
          <button
            onClick={completeOnboarding}
            className="text-[12px] text-tertiary hover:text-secondary underline underline-offset-2 transition-colors duration-fast"
          >
            건너뛰기
          </button>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button variant="secondary" size="sm" onClick={handlePrev}>
                이전
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={handleNext}>
              {step < 4 ? '다음' : '완료'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
