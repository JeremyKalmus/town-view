// Convoy context types for enriched issue responses

export interface ConvoyInfo {
  id: string;
  title: string;
  progress: ConvoyProgress;
}

export interface ConvoyProgress {
  completed: number;
  total: number;
  percentage: number;
}
