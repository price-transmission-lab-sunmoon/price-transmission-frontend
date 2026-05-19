// z-index 우선순위 SoT — feature_spec_fe-api-connect_vN §5.5
// 컴포넌트 내 직접 숫자 사용 금지 (feature_spec §13)
export const Z_INDEX = {
  TOAST: 9000,
  MODAL: 8000,
  OVERLAY: 7000,
  DROPDOWN: 200,
  PANEL: 100,
  HEADER: 50,
} as const;
