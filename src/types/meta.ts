export interface Freshness {
  data_up_to: string;
  next_run_date: string;
  last_updated: string;
}

export interface PipelineMeta {
  pipeline_version: string;
  last_run_at: string;
  phases_completed: number;
}

export interface AnalysisParams {
  rolling_window: number;
  contamination: number;
  random_state: number;
}
