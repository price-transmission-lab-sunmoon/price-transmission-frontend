// z-index 우선순위 단일 출처. 컴포넌트 내 숫자 직접 사용 금지.
export const Z_INDEX = {
  HEADER: 50,
  PANEL: 100,
  DROPDOWN: 200,
  CHART_TOOLTIP: 1000,
  OVERLAY: 7000, // FAB / floating buttons
  MODAL_OVERLAY: 8000,
  MODAL_CONTENT: 8001,
  MODAL: 8000, // legacy alias, retained for existing imports during migration
  ONBOARDING_OVERLAY: 8500,
  ONBOARDING_SPOTLIGHT: 8501,
  ONBOARDING_TOOLTIP: 8502,
  TOAST: 9000,
} as const;
