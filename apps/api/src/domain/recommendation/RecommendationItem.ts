import { DomainError } from '../errors/DomainErrors.js';

export interface RecommendationItemProps {
  bookId: string;
  title: string;
  author: string;
  coverUrl: string | null;
  similarity: number;
  dominantCategory: string;
}

export class RecommendationItem {
  readonly bookId: string;
  readonly title: string;
  readonly author: string;
  readonly coverUrl: string | null;
  readonly similarity: number;
  readonly dominantCategory: string;

  private constructor(props: RecommendationItemProps) {
    this.bookId = props.bookId;
    this.title = props.title;
    this.author = props.author;
    this.coverUrl = props.coverUrl;
    this.similarity = props.similarity;
    this.dominantCategory = props.dominantCategory;
    Object.freeze(this);
  }

  static create(props: RecommendationItemProps): RecommendationItem {
    if (props.similarity < 0 || props.similarity > 1) {
      throw new InvalidSimilarityError(props.similarity);
    }
    return new RecommendationItem(props);
  }
}

export class InvalidSimilarityError extends DomainError {
  constructor(value: number) {
    super(`similarity must be between 0 and 1, got: ${value}`);
  }
}
