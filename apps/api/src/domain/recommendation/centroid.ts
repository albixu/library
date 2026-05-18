import { DomainError } from '../errors/DomainErrors.js';

/**
 * Computes the centroid (element-wise average) of a list of embeddings.
 * @param embeddings - Array of numeric vectors (all must have the same length)
 * @returns The centroid vector
 * @throws DomainError if embeddings array is empty
 */
export function computeCentroid(embeddings: number[][]): number[] {
  if (embeddings.length === 0) {
    throw new EmptyEmbeddingsError();
  }

  const dims = embeddings[0].length;
  const centroid = new Array<number>(dims).fill(0);

  for (const embedding of embeddings) {
    for (let i = 0; i < dims; i++) {
      centroid[i] += embedding[i];
    }
  }

  for (let i = 0; i < dims; i++) {
    centroid[i] /= embeddings.length;
  }

  return centroid;
}

export class EmptyEmbeddingsError extends DomainError {
  constructor() {
    super('embeddings cannot be empty');
  }
}
