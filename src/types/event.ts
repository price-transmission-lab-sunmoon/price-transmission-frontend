export interface ExternalEvent {
  event_key: string;
  label_kr: string;
  start_date: string;
  end_date: string;
  color_hex: string;
}

export interface EventsResponse {
  events: ExternalEvent[];
}
