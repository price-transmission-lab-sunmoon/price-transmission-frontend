import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { Z_INDEX } from '@/utils/zIndex';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';

interface HelpItem {
  title: string;
  content: string;
}

const HELP_ITEMS: HelpItem[] = [
  {
    title: '이 서비스가 뭔가요?',
    content:
      '가격 전달 이상 탐지 시각화 서비스입니다. 계량경제학 모형과 머신러닝을 결합하여 국제가→수입단가→PPI→도매가→CPI(도매가 단계는 일부 품목만 해당) 단계별 가격 전달 구조에서 이상 시점을 탐지하고, 그 결과를 인터랙티브하게 시각화합니다. 분석 결과는 투명하게 원본 수치 그대로 제공되며, 해석은 사용자가 직접 수행합니다.',
  },
  {
    title: '흐름 보기는 어떻게 읽나요?',
    content:
      '흐름 보기(스트림 그래프)는 시간 축을 따라 각 구간의 전이율 흐름을 보여줍니다. 빨간 점은 이상 탐지 시점을 나타내며, 클릭하면 우측 분석 수치 패널에 해당 시점의 계량경제학 수치와 ML 판정 결과가 표시됩니다. 신뢰도 등급(고신뢰·중신뢰·참고)에 따라 점의 크기와 색상이 다릅니다.',
  },
  {
    title: '전달 구조는 어떻게 읽나요?',
    content:
      '전달 구조(산점도)는 각 분석 구간의 전달 패턴과 전이율을 2차원으로 시각화합니다. X축은 시점, Y축은 전이율을 나타내며, 각 점은 이상 탐지 결과를 의미합니다. 구역별로 패턴 유형(pattern1·pattern2·pattern3)이 색상으로 구분됩니다.',
  },
  {
    title: '원시 시계열은 무엇인가요?',
    content:
      '원시 시계열 뷰는 국제가·수입단가·PPI·도매가·CPI의 실제 시계열 데이터를 2020=100 기준 지수로 표준화하여 보여줍니다. 레이아웃 1~6번 중 원하는 구성을 선택하여 최대 3개 시계열을 동시에 비교할 수 있습니다. 구간 on/off 토글로 보고 싶은 데이터만 선택할 수 있습니다.',
  },
  {
    title: '신뢰도 등급이란?',
    content:
      '이상 탐지 결과의 신뢰 수준을 3단계로 구분합니다.\n• 고신뢰(high): 계량경제학 통계 검정과 ML 모델이 동시에 이상을 확인한 경우\n• 중신뢰(medium): 계량경제학 통계 검정은 이상을 확인했으나 ML 앙상블 기준(3개 모델 중 2개)에는 이르지 못한 경우\n• 참고(reference): ML 모델은 이상을 탐지했으나 통계 검정이 확인하지 못한 경우',
  },
  {
    title: '패턴 유형이란?',
    content:
      '가격 전달 이상의 유형을 3가지로 분류합니다.\n• 패턴 1: 방향 역전 및 전달 시차 이탈 — 하류가 상류와 반대로 움직이거나 정상 반응 시차를 지나도 무반응인 경우\n• 패턴 2: 전이율 크기 이탈 및 비대칭 전달 — 전이율이 통계 기준(Z-score·IQR)을 벗어나거나 상승·하락 전달이 비대칭인 경우\n• 패턴 3: 국제가격 안정기 중 스프레드 누적 확대 — 국제가가 안정된 기간에 수입단가와 PPI 간 수준 괴리가 연속 확대되는 경우\n각 이상 탐지 결과에는 1~3개 패턴이 복합 판정될 수 있습니다.',
  },
  {
    title: '전이율이란?',
    content:
      '전이율(transmission rate)은 상위 단계 가격 변동이 하위 단계로 얼마나 전달되는지를 나타내는 지표입니다. 0에 가까울수록 가격이 거의 전달되지 않으며, 1에 가까울수록 완전히 전달됩니다. 1을 초과하면 증폭 전달을 의미합니다. 상류 단계 가격의 월 변화율 대비 하류 단계 가격의 월 변화율 비율(하류 변화율 ÷ 상류 변화율)로 산출됩니다.',
  },
  {
    title: 'IRF란?',
    content:
      'IRF(충격반응함수, Impulse Response Function)는 한 변수에 단위 충격이 가해졌을 때 다른 변수가 시간에 따라 어떻게 반응하는지를 보여주는 함수입니다. 이 서비스에서는 국제가 충격이 CPI까지 전달되는 경로와 소멸 속도를 확인할 수 있습니다. X축은 충격 이후 경과 개월 수, Y축은 반응 강도입니다.',
  },
  {
    title: 'ML 판정이란?',
    content:
      '세 가지 비지도 학습 이상 탐지 모델을 앙상블하여 판정합니다.\n• Isolation Forest: 데이터 분리 기반 이상치 탐지\n• LOF (Local Outlier Factor): 밀도 기반 이상치 탐지\n• One-Class SVM: 정상 경계 학습 기반 이상치 탐지\nml_vote는 세 모델 중 몇 개가 이상을 탐지했는지를 나타냅니다(0~3). 2 이상이면 ML 기준 이상으로 판정됩니다.',
  },
  {
    title: 'ML 결과맵이란?',
    content:
      'ML 결과맵은 고차원 특성 공간을 2차원으로 투영하여, 정상 데이터 군집과 이상 탐지 시점의 상대적 위치를 시각화합니다. 이상 시점(선택된 빨간 점)이 정상 군집에서 얼마나 벗어나 있는지를 직관적으로 확인할 수 있습니다. 투영 방식(PCA 또는 feature_direct)은 파이프라인 설정에 따라 결정됩니다.',
  },
  {
    title: '데이터 출처는?',
    content:
      '분석에 사용된 원시 데이터는 다음 공공 데이터 소스에서 수집됩니다.\n1. World Bank Pink Sheet — 국제 원자재가\n2. FAO FFPI — 국제 식품 가격 지수\n3. 관세청 — 수입단가\n4. 한국은행 ECOS — PPI·CPI·환율(KRW/USD)\n5. KAMIS(농수산물유통공사) — 도매가 (땅콩·바나나·오렌지 한정)',
  },
  {
    title: '키보드 단축키',
    content:
      'Esc — 모달 · 온보딩 닫기\nTab — 다음 요소로 포커스 이동\nEnter / Space — 버튼 활성\n드래그(우측 패널 경계) — 패널 너비 조정',
  },
];

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const { setHasSeenOnboardingThisSession } = useAppStore();
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  // Esc + body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const toggleItem = (index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleReplayOnboarding = () => {
    setHasSeenOnboardingThisSession(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className="overlay-fade-in"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: Z_INDEX.MODAL_OVERLAY,
          background: 'rgba(28, 24, 18, 0.55)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />

      {/* 모달 본문 */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: Z_INDEX.MODAL_CONTENT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          pointerEvents: 'none',
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-modal-title"
          style={{ pointerEvents: 'auto', maxHeight: '85vh' }}
          className="overlay-content-in bg-surface border border-border-default rounded-xl shadow-e5 w-full max-w-[640px] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border-default shrink-0">
            <div>
              <h2
                id="help-modal-title"
                className="text-primary font-bold text-[18px] tracking-tight m-0"
              >
                도움말
              </h2>
              <p className="text-tertiary text-[12px] mt-0.5 m-0">서비스 사용 안내</p>
            </div>
            <IconButton
              aria-label="도움말 닫기"
              onClick={onClose}
              variant="ghost"
              size="md"
              icon={<Icon name="x" size={16} />}
            />
          </div>

          {/* 아코디언 목록 */}
          <div className="overflow-y-auto flex-1 px-4 py-2">
            {HELP_ITEMS.map((item, index) => {
              const isExpanded = expandedItems.has(index);
              return (
                <div key={index} className="border-b border-border-subtle last:border-0">
                  <button
                    onClick={() => toggleItem(index)}
                    aria-expanded={isExpanded}
                    className={[
                      'w-full flex items-center justify-between px-2 py-4 text-left rounded-md',
                      'transition-colors duration-fast ease-out hover:bg-subtle',
                    ].join(' ')}
                  >
                    <span className="text-primary text-[14px] font-medium">{item.title}</span>
                    <Icon
                      name="chevron-down"
                      size={18}
                      className={`text-tertiary ml-2 shrink-0 transition-transform duration-default ease-out ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="px-2 pb-5">
                      <p className="text-secondary text-[14px] leading-[1.625] whitespace-pre-line m-0">
                        {item.content}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 하단: 온보딩 다시 보기 */}
          <div className="px-6 py-4 border-t border-border-default shrink-0">
            <Button variant="secondary" size="md" fullWidth onClick={handleReplayOnboarding}>
              온보딩 가이드 다시 보기
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
