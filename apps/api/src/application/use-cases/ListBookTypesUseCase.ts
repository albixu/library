/**
 * ListBookTypesUseCase
 *
 * Application service that retrieves all book types sorted alphabetically.
 * Used to populate frontend dropdowns and selects.
 *
 * Flow:
 * 1. Retrieve all types from repository (sorted by name A-Z)
 * 2. Map to DTOs with only id and name
 * 3. Return the list
 */

import type { TypeRepository } from '../ports/TypeRepository.js';

/**
 * Output DTO for book type list items
 * Only includes fields needed by the frontend
 */
export interface BookTypeListItem {
  id: string;
  name: string;
}

/**
 * Use case for listing all book types
 */
export class ListBookTypesUseCase {
  constructor(private readonly typeRepository: TypeRepository) {}

  /**
   * Retrieves all book types sorted alphabetically
   *
   * @returns Promise resolving to array of BookTypeListItem DTOs
   */
  async execute(): Promise<BookTypeListItem[]> {
    const types = await this.typeRepository.findAllSorted();

    return types.map((type) => ({
      id: type.id,
      name: type.name,
    }));
  }
}
