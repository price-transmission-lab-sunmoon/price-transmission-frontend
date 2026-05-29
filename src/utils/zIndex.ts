// z-index priority SoT — docs/re-design_specs/01-design-tokens.md §16.
// Never use inline numeric zIndex in components.
// @guide:UTIL-06
export const Z_INDEX = {
  HEADER: 50,
  PANEL: 100,
  DROPDOWN: 200,
  CHART_TOOLTIP: 1000,
  OVERLAY: 7000, // FAB / floating buttons
  MODAL_OVERLAY: 8000,
  MODAL_CONTENT: 8001,
  MODAL: 8000, // legacy alias — retained for existing imports during migration
  ONBOARDING_OVERLAY: 8500,
  ONBOARDING_SPOTLIGHT: 8501,
  ONBOARDING_TOOLTIP: 8502,
  TOAST: 9000,
} as const;
