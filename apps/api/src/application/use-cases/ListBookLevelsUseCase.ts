/**
 * ListBookLevelsUseCase
 *
 * Application service that retrieves book levels, optionally filtered by type name.
 * Levels are returned sorted alphabetically by name (A-Z).
 *
 * HU-010: Used to populate frontend dropdowns and level filters.
 *
 * Flow:
 * 1. If type name provided, find the type by name
 * 2. If type found, get levels for that type (sorted) via type_levels junction
 * 3. If type not found, return empty array (not an error)
 * 4. If no type filter, get all levels (sorted)
 * 5. Map to DTOs with only id and name
 * 6. Return the list
 */

import type { LevelRepository } from '../ports/LevelRepository.js';
import type { TypeRepository } from '../ports/TypeRepository.js';

/**
 * Output DTO for book level list items
 * Only includes fields needed by the frontend
 */
export interface BookLevelListItem {
  id: string;
  name: string;
}

/**
 * Use case for listing book levels with optional type filter
 */
export class ListBookLevelsUseCase {
  constructor(
    private readonly levelRepository: LevelRepository,
    private readonly typeRepository: TypeRepository,
  ) {}

  /**
   * Retrieves book levels, optionally filtered by type name
   *
   * @param typeName - Optional type name to filter levels (case-insensitive)
   * @returns Promise resolving to array of BookLevelListItem DTOs
   */
  async execute(typeName?: string): Promise<BookLevelListItem[]> {
    // If type name provided, filter by type
    if (typeName) {
      const type = await this.typeRepository.findByName(typeName);

      // If type doesn't exist, return empty array (not an error)
      if (!type) {
        return [];
      }

      const levels = await this.levelRepository.findByTypeIdSorted(type.id);
      return this.mapToDto(levels);
    }

    // No filter - return all levels
    const levels = await this.levelRepository.findAllSorted();
    return this.mapToDto(levels);
  }

  /**
   * Maps Level entities to BookLevelListItem DTOs
   */
  private mapToDto(levels: { id: string; name: string }[]): BookLevelListItem[] {
    return levels.map((level) => ({
      id: level.id,
      name: level.name,
    }));
  }
}
