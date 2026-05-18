import { useState } from 'react';
import { usePipelineData } from '@/hooks/usePipelineData';
import { useAnalysisParams } from '@/hooks/useAnalysisParams';
import { PipelineFlowDiagram } from './PipelineFlowDiagram';
import { ANOMALY_COLORS } from '@/utils/colorUtils';
import { showToast } from '@/components/ui/Toast';
import type { AnalysisParams, PatternDescription } from '@/types/meta';
import { SEGMENT_IDS, type SegmentId } from '@/types/literals';

const KNOWN_SEGMENT_IDS = new Set<string>(SEGMENT_IDS);

// ============================================================
// 공통 UI 유틸
// ============================================================

function SectionHeader({ num, title }: { num: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-700 text-slate-300 text-xs font-bold shrink-0">
        {num}
      </span>
      <h2 className="text-slate-100 text-base font-semibold">{title}</h2>
    </div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
      {children}
    </section>
  );
}

function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-slate-700/60 rounded" style={{ width: `${70 + (i % 3) * 10}%` }} />
      ))}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-800/40 rounded-lg text-red-400 text-xs">
      <span>⚠</span>
      <span>{message}</span>
    </div>
  );
}

const SEGMENT_LABEL: Record<SegmentId, string> = {
  A: '구간 A',
  B: '구간 B',
  C: '구간 C',
  D: '구간 D',
  D_prime: "구간 D'",
};

const PATTERN_CHIP_COLORS: Record<string, string> = {
  pattern1: 'bg-blue-900/40 text-blue-300 border-blue-700/50',
  pattern2: 'bg-purple-900/40 text-purple-300 border-purple-700/50',
  pattern3: 'bg-teal-900/40 text-teal-300 border-teal-700/50',
};

const KNOWN_PATTERN_IDS = new Set(['pattern1', 'pattern2', 'pattern3']);

// ============================================================
// 섹션 1 — 분석 파이프라인 개요
// ============================================================
function Section1Pipeline({
  isLoading,
  isError,
  data,
}: {
  isLoading: boolean;
  isError: boolean;
  data?: { version: string; nodes: import('@/types/meta').PipelineNode[]; edges: import('@/types/meta').PipelineEdge[] };
}) {
  return (
    <SectionCard>
      <SectionHeader num={1} title="분석 파이프라인 개요" />
      <p className="text-slate-400 text-xs mb-4 leading-relaxed">
        가격 전달 체계(국제가 → 수입단가 → PPI → 도매가 → CPI)와 Phase 0~8 파이프라인 흐름.
        노드를 클릭하면 각 단계의 상세 설명을 확인할 수 있습니다.
      </p>
      {isLoading && <LoadingSkeleton rows={5} />}
      {isError && <ErrorBanner message="/meta/pipeline 데이터를 불러오지 못했습니다. 새로고침하거나 잠시 후 다시 시도하세요." />}
      {data && (
        <PipelineFlowDiagram nodes={data.nodes} edges={data.edges} version={data.version} />
      )}
    </SectionCard>
  );
}

// ============================================================
// 섹션 2 — 이상 탐지 패턴 3종
// ============================================================
function PatternCard({ pattern, params }: { pattern: PatternDescription; params?: AnalysisParams }) {
  // 패턴 3: stability_threshold, pattern3_n_values 동적 치환
  let description = pattern.description;
  if (pattern.pattern_id === 'pattern3' && params) {
    const pct = (params.stability_threshold * 100).toFixed(0);
    const nVals = params.pattern3_n_values.join('·');
    description = description
      .replace(/±[\d.]+%/, `±${pct}%`)
      .replace(/N개월/, `${nVals}개월`);
  }

  return (
    <div className="bg-slate-900/50 border border-slate-700/40 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
            PATTERN_CHIP_COLORS[pattern.pattern_id] ?? 'bg-slate-700 text-slate-300'
          }`}
        >
          {pattern.pattern_id === 'pattern1' ? '패턴 1' : pattern.pattern_id === 'pattern2' ? '패턴 2' : '패턴 3'}
        </span>
      </div>
      <h3 className="text-slate-200 text-sm font-medium mb-2">{pattern.label_kr}</h3>
      <p className="text-slate-400 text-xs leading-relaxed mb-3">{description}</p>
      <div className="flex flex-wrap gap-1">
        {pattern.applicable_segments.map((seg) => (
          <span
            key={seg}
            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700/60 text-slate-400 border border-slate-600/50"
          >
            {SEGMENT_LABEL[seg as SegmentId] ?? seg}
          </span>
        ))}
      </div>
    </div>
  );
}

function Section2Patterns({
  isLoading,
  isError,
  patterns,
  params,
}: {
  isLoading: boolean;
  isError: boolean;
  patterns?: PatternDescription[];
  params?: AnalysisParams;
}) {
  return (
    <SectionCard>
      <SectionHeader num={2} title="이상 탐지 패턴 3종" />
      {isLoading && <LoadingSkeleton rows={4} />}
      {isError && <ErrorBanner message="/meta/analysis-params 데이터를 불러오지 못했습니다." />}
      {patterns && (() => {
        const validPatterns = patterns.filter((p) => {
          if (!KNOWN_PATTERN_IDS.has(p.pattern_id)) {
            console.warn(`[MethodologyView] PARSE-ENUM-002: unknown pattern_id="${p.pattern_id}" — skipping card`);
            showToast({
              code: 'PARSE-ENUM-002',
              variant: 'warning',
              message: `알 수 없는 pattern_id "${p.pattern_id}" — 해당 카드를 건너뜁니다.`,
            });
            return false;
          }
          const badSegment = p.applicable_segments.find((s) => !KNOWN_SEGMENT_IDS.has(s));
          if (badSegment !== undefined) {
            console.warn(`[MethodologyView] PARSE-ENUM-002: unknown segment="${badSegment}" in pattern="${p.pattern_id}" — skipping card`);
            showToast({
              code: 'PARSE-ENUM-002',
              variant: 'warning',
              message: `알 수 없는 segment "${badSegment}" (pattern ${p.pattern_id}) — 해당 카드를 건너뜁니다.`,
            });
            return false;
          }
          return true;
        });
        return (
          <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-3">
            {validPatterns.map((p) => (
              <PatternCard key={p.pattern_id} pattern={p} params={params} />
            ))}
          </div>
        );
      })()}
    </SectionCard>
  );
}

// ============================================================
// 섹션 3 — 계량경제학 기법 설명 (accordion)
// ============================================================
interface Method {
  id: string;
  title: string;
  summary: string;
  detail: (params?: AnalysisParams) => string;
}

const METHODS: Method[] = [
  {
    id: 'stl',
    title: 'STL 분해',
    summary: '계절 성분 제거 전처리 — 추세·잔차 분리',
    detail: () =>
      '시계열을 추세(Trend), 계절성(Seasonality), 잔차(Residual) 세 성분으로 분해하는 기법. 계절 성분을 제거해 월별 데이터의 순수한 추세와 잔차를 분리한다.',
  },
  {
    id: 'adf_kpss',
    title: 'ADF + KPSS 검정',
    summary: '단위근 검정 — 시계열 정상성 확인',
    detail: () =>
      'ADF 검정(귀무가설: 단위근 존재)과 KPSS 검정(귀무가설: 정상성)을 병행해 결론을 보완한다. 두 검정이 충돌할 경우 보수적으로 비정상 시계열로 판단한다.',
  },
  {
    id: 'johansen',
    title: 'Johansen 공적분 검정',
    summary: '장기 균형 관계 유무 확인 → VECM / VAR 분기',
    detail: () =>
      '두 가격 시계열 간 장기 균형 관계가 존재하는지 확인한다. 공적분이 있으면 VECM 모형, 없으면 VAR 모형을 사용한다.',
  },
  {
    id: 'var_vecm',
    title: 'VAR / VECM',
    summary: '다변량 시계열 관계 추정 + IRF 산출',
    detail: (params) =>
      `다변량 시계열 모형. VAR는 단기 동적 관계를, VECM은 장기 균형 복귀 속도(ECT)까지 추정한다. 시차 ${params ? `${params.lag_search_range[0]}~${params.lag_search_range[1]}개월` : '—'} 범위에서 AIC 기준으로 최적 시차를 탐색한다.`,
  },
  {
    id: 'irf',
    title: 'IRF (충격반응함수)',
    summary: '한 변수 충격이 다른 변수에 미치는 영향 시각화',
    detail: (params) =>
      `한 변수에 충격을 주었을 때 다른 변수가 얼마나, 얼마나 빨리 반응하는지를 시각화한다. 시차 ${params ? `${params.lag_search_range[0]}~${params.lag_search_range[1]}개월` : '—'} 범위 내에서 IRF 피크 시점을 탐색하며, 이 피크가 정상 전달 시차 기준이 된다.`,
  },
  {
    id: 'bai_perron',
    title: 'Bai-Perron 구조 변화 탐지',
    summary: '전이율의 구조적 변화 시점 자동 탐지',
    detail: (params) =>
      `데이터에서 전이율의 구조적 변화 시점을 자동으로 탐지하는 기법. 사전 검정 시점: ${params ? params.chow_test_points.join(', ') : '—'}을 초기 후보로 사용한다.`,
  },
  {
    id: 'tecm_asym',
    title: 'TECM / 비대칭 VAR',
    summary: '상승·하락 조정 속도 비대칭성 검정',
    detail: () =>
      '가격이 오를 때와 내릴 때 전달 속도·크기 차이를 통계적으로 검정한다. 비대칭 VAR의 Wald 검정이 유의하면 로켓-깃털 효과가 존재하는 것으로 판단한다.',
  },
  {
    id: 'zscore_iqr',
    title: 'Z-score + IQR 교차 판정',
    summary: '두 기준 동시 충족 시 경보 — 이상 탐지 주 방법론',
    detail: (params) =>
      `롤링 ${params ? `${params.rolling_window}개월` : '—'} 기준으로 전이율 이탈을 탐지한다. Z-score ${params ? params.zscore_warning : '—'} 이상 주의, ${params ? params.zscore_alert : '—'} 이상 경보. IQR×${params ? params.iqr_multiplier : '—'} 기준과 동시 충족할 때만 이상으로 판정한다.`,
  },
];

function AccordionItem({
  method,
  params,
  isOpen,
  onToggle,
}: {
  method: Method;
  params?: AnalysisParams;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-slate-700/40 rounded-lg overflow-hidden">
      <button
        aria-expanded={isOpen}
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/40 hover:bg-slate-800/60 transition-colors text-left"
      >
        <div>
          <span className="text-slate-200 text-sm font-medium">{method.title}</span>
          <span className="ml-3 text-slate-500 text-xs hidden sm:inline">{method.summary}</span>
        </div>
        <span
          className={`text-slate-400 text-xs transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      {isOpen && (
        <div className="px-4 py-3 bg-slate-900/20 border-t border-slate-700/30">
          <p className="text-slate-400 text-xs leading-relaxed">{method.detail(params)}</p>
        </div>
      )}
    </div>
  );
}

function Section3Econometrics({ params }: { params?: AnalysisParams }) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <SectionCard>
      <SectionHeader num={3} title="계량경제학 기법" />
      <div className="space-y-2">
        {METHODS.map((m) => (
          <AccordionItem
            key={m.id}
            method={m}
            params={params}
            isOpen={openIds.has(m.id)}
            onToggle={() => toggle(m.id)}
          />
        ))}
      </div>
    </SectionCard>
  );
}

// ============================================================
// 섹션 4 — ML 모델 설명
// ============================================================
const ML_MODELS = [
  {
    name: 'Isolation Forest',
    principle: '피처 공간에서 관측치를 무작위로 분리할 때 적은 분기 횟수로 고립되는 점을 이상으로 판정',
    role: '전이율·변화율 피처 공간에서 극단적으로 이탈한 월 탐지',
  },
  {
    name: 'LOF (Local Outlier Factor)',
    principle: '주변 이웃의 밀도와 자신의 밀도를 비교해 밀도가 낮은 점을 이상으로 판정',
    role: '구조 변화 이후 하위 기간 내 국소 이상 탐지',
  },
  {
    name: 'One-Class SVM',
    principle: '정상 관측치가 모인 영역의 경계를 학습하고, 경계 밖 점을 이상으로 판정',
    role: '안정기 피처 분포를 정상으로 학습 후 경계 이탈 시점 탐지',
  },
];

const ML_FEATURES = [
  '월별 전이율',
  '상류 가격 변화율',
  '하류 가격 변화율',
  'ECT 또는 로그 수준 스프레드',
  '환율 월 변동률',
  '국제가 월 변동률',
];

function Section4MLModels() {
  return (
    <SectionCard>
      <SectionHeader num={4} title="ML 모델" />
      <p className="text-slate-400 text-xs mb-4 leading-relaxed">
        3개 비지도 학습 모델이 통계 이상 탐지와 독립적으로 동일한 원시 데이터(Phase 0~4 산출값)를
        기반으로 교차검증 역할을 수행한다.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-700/50">
              <th className="text-left py-2 pr-4 font-medium w-40">모델</th>
              <th className="text-left py-2 pr-4 font-medium">작동 원리</th>
              <th className="text-left py-2 font-medium">이 서비스에서의 역할</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {ML_MODELS.map((m) => (
              <tr key={m.name} className="align-top">
                <td className="py-2.5 pr-4 text-slate-300 font-medium whitespace-nowrap">{m.name}</td>
                <td className="py-2.5 pr-4 text-slate-400 leading-relaxed">{m.principle}</td>
                <td className="py-2.5 text-slate-400 leading-relaxed">{m.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-700/30">
        <p className="text-slate-500 text-xs font-medium mb-2">ML 입력 피처 (6종, 전 품목 공통)</p>
        <div className="flex flex-wrap gap-1.5">
          {ML_FEATURES.map((f) => (
            <span
              key={f}
              className="px-2 py-0.5 rounded text-[10px] bg-slate-700/50 text-slate-400 border border-slate-600/40"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

// ============================================================
// 섹션 5 — 신뢰도 등급 체계
// ============================================================
const GRADE_ROWS = [
  {
    grade: '고신뢰 이상',
    color: ANOMALY_COLORS.high,
    label: 'high',
    condition: '통계 탐지 O + ML 탐지 동시 확인',
    paper: '주 결과 테이블 포함',
  },
  {
    grade: '중신뢰 이상',
    color: ANOMALY_COLORS.medium,
    label: 'medium',
    condition: '통계 탐지 O + ML 미탐지',
    paper: '주 결과 테이블 포함',
  },
  {
    grade: '참고 이상',
    color: ANOMALY_COLORS.reference,
    label: 'reference',
    condition: 'ML 탐지 O + 통계 미탐지',
    paper: '별도 논의 대상',
  },
];

function Section5ConfidenceGrade() {
  return (
    <SectionCard>
      <SectionHeader num={5} title="신뢰도 등급 체계" />
      <p className="text-slate-400 text-xs mb-4 leading-relaxed">
        통계 기반 이상 탐지(Phase 7)와 ML 교차검증(Phase 7-ML)의 결합 결과에 따라 이상 노드에
        3단계 신뢰도 등급을 부여한다.
      </p>
      <div className="space-y-2">
        {GRADE_ROWS.map((r) => (
          <div
            key={r.label}
            className="flex items-center gap-4 px-4 py-3 bg-slate-900/40 border border-slate-700/30 rounded-lg"
          >
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: r.color }}
              aria-label={r.grade}
            />
            <div className="flex-1 min-w-0">
              <span className="text-slate-200 text-sm font-medium">{r.grade}</span>
              <span className="ml-3 text-slate-500 text-xs">{r.condition}</span>
            </div>
            <span className="text-slate-500 text-xs shrink-0 hidden sm:block">{r.paper}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ============================================================
// 섹션 6 — 데이터 소스
// ============================================================
const DATA_SOURCES = [
  { num: 1, source: 'World Bank Pink Sheet', org: '세계은행', usage: '국제 원자재가' },
  { num: 2, source: 'FAO FFPI', org: 'FAO', usage: '국제 원자재가 보조' },
  { num: 3, source: '수입단가', org: '관세청 무역통계포털', usage: '수입단가' },
  { num: 4, source: '환율', org: '한국수출입은행', usage: '국제가 원화 환산' },
  { num: 5, source: 'PPI', org: '한국은행 ECOS', usage: '생산자 물가' },
  { num: 6, source: 'CPI', org: '한국은행 ECOS', usage: '소비자 물가' },
  { num: 7, source: 'KAMIS 도매가', org: '농수산물유통공사', usage: '도매가 (4구간 품목만)' },
];

function Section6DataSources() {
  return (
    <SectionCard>
      <SectionHeader num={6} title="데이터 소스" />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-700/50">
              <th className="text-left py-2 pr-3 font-medium w-6">#</th>
              <th className="text-left py-2 pr-4 font-medium">소스</th>
              <th className="text-left py-2 pr-4 font-medium">제공 기관</th>
              <th className="text-left py-2 font-medium">활용 단계</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {DATA_SOURCES.map((row) => (
              <tr key={row.num}>
                <td className="py-2 pr-3 text-slate-600">{row.num}</td>
                <td className="py-2 pr-4 text-slate-300 font-medium">{row.source}</td>
                <td className="py-2 pr-4 text-slate-400">{row.org}</td>
                <td className="py-2 text-slate-400">{row.usage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ============================================================
// MethodologyView — 최상위 컨테이너
// ============================================================
export function MethodologyView() {
  const {
    data: pipelineData,
    isLoading: pipelineLoading,
    isError: pipelineError,
  } = usePipelineData();

  const {
    data: paramsData,
    isLoading: paramsLoading,
    isError: paramsError,
  } = useAnalysisParams();

  // 부분 실패: /meta/pipeline 실패 + /meta/analysis-params 성공 → 섹션 1 에러, 섹션 2 정상
  // 부분 실패: /meta/pipeline 성공 + /meta/analysis-params 실패 → 섹션 2 에러, 섹션 3 수치 '—'

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <Section1Pipeline
        isLoading={pipelineLoading}
        isError={pipelineError}
        data={pipelineData}
      />

      <Section2Patterns
        isLoading={paramsLoading}
        isError={paramsError}
        patterns={paramsData?.patterns}
        params={paramsData?.params}
      />

      <Section3Econometrics params={paramsData?.params} />

      <Section4MLModels />

      <Section5ConfidenceGrade />

      <Section6DataSources />
    </div>
  );
}
