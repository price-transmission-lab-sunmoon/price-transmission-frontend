// 6 스테이션 좌측 해설 — 정본 v40 용어 준수, 객관적 정보 전달(주장 금지).
export interface StationCopy {
  index: number;
  title: string;
  subtitle: string;
  body: string[];
}

export const STATION_COPY: StationCopy[] = [
  {
    index: 0,
    title: '① 원천 데이터',
    subtitle: '5개 공공 데이터 소스',
    body: [
      'World Bank Pink Sheet — 국제 원자재가',
      'FAO FFPI — 국제 식품 가격 지수',
      '관세청 — 수입단가',
      '한국은행 ECOS — PPI·CPI·환율(KRW/USD)',
      'KAMIS(농수산물유통공사) — 도매가(일부 품목)',
    ],
  },
  {
    index: 1,
    title: '② 가격 전달 경로',
    subtitle: '구간 A~E',
    body: [
      '구간 A: 국제가 → 수입단가',
      '구간 B: 수입단가 → PPI',
      '구간 C: PPI → 도매가 · 구간 D: 도매가 → CPI',
      '구간 E: PPI → CPI (도매가 미관측 품목)',
    ],
  },
  {
    index: 2,
    title: '③ 분석 파이프라인',
    subtitle: 'Phase 0~8',
    body: [
      'STL 분해 · ADF/KPSS 정상성 검정',
      'Johansen 공적분 → VAR/VECM 추정(IRF·ECT)',
      'Granger 인과 · Bai-Perron + Chow 구조변화',
    ],
  },
  {
    index: 3,
    title: '④ 이중 탐지',
    subtitle: '계량경제학 ⊕ 머신러닝',
    body: [
      '계량(Phase 7): Z-score·IQR·TECM 규칙 기반',
      'ML(Phase 7-ML): 6종 피처 · IF/LOF/OCSVM 앙상블',
      '두 분석을 독립적으로 수행해 교차 검증',
    ],
  },
  {
    index: 4,
    title: '⑤ 신뢰도 등급화',
    subtitle: '고신뢰 H · 중신뢰 M · 참고 R',
    body: [
      '고신뢰(H): 두 분석 모두 탐지',
      '중신뢰(M): 계량 규칙 위반, ML 범위 이내',
      '참고(R): ML만 탐지',
    ],
  },
  {
    index: 5,
    title: '⑥ 결과 · 외부충격 검증',
    subtitle: 'Weak Ground Truth',
    body: [
      '탐지된 이상을 5개 외부충격 구간과 대조',
      'FS2008 · RD2010 · EN2015 · CV2020 · UW2022',
      '판단은 보는 이의 몫 — 근거만 제시',
    ],
  },
];
