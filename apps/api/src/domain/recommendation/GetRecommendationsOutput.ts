import type { RecommendationItem } from './RecommendationItem.js';

export interface GetRecommendationsOutput {
  items: RecommendationItem[];
  label: string;
}

/**
 * Builds the label for recommendations output.
 * Example: "Porque te interesa Programming"
 */
export function buildRecommendationLabel(dominantCategory: string): string {
  return `Porque te interesa ${dominantCategory}`;
}
