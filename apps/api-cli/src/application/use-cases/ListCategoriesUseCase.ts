/**
 * ListCategoriesUseCase
 *
 * Application service that retrieves categories, optionally filtered by type name.
 * Categories are returned sorted alphabetically by name (A-Z).
 *
 * HU-009: Used to populate frontend dropdowns and category filters.
 *
 * Flow:
 * 1. If type name provided, find the type by name
 * 2. If type found, get categories for that type (sorted)
 * 3. If type not found, return empty array (not an error)
 * 4. If no type filter, get all categories (sorted)
 * 5. Map to DTOs with id, name, typeId, description
 * 6. Return the list
 */

import type { CategoryRepository } from '../ports/CategoryRepository.js';
import type { TypeRepository } from '../ports/TypeRepository.js';

/**
 * Output DTO for category list items
 * Includes all fields except timestamps
 */
export interface CategoryListItem {
  id: string;
  name: string;
  typeId: string;
  description: string | null;
}

/**
 * Use case for listing categories with optional type filter
 */
export class ListCategoriesUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly typeRepository: TypeRepository,
  ) {}

  /**
   * Retrieves categories, optionally filtered by type name
   *
   * @param typeName - Optional type name to filter categories (case-insensitive)
   * @returns Promise resolving to array of CategoryListItem DTOs
   */
  async execute(typeName?: string): Promise<CategoryListItem[]> {
    // If type name provided, filter by type
    if (typeName) {
      const type = await this.typeRepository.findByName(typeName);

      // If type doesn't exist, return empty array (not an error)
      if (!type) {
        return [];
      }

      const categories = await this.categoryRepository.findByTypeIdSorted(type.id);
      return this.mapToDto(categories);
    }

    // No filter - return all categories
    const categories = await this.categoryRepository.findAllSorted();
    return this.mapToDto(categories);
  }

  /**
   * Maps Category entities to CategoryListItem DTOs
   */
  private mapToDto(categories: { id: string; name: string; typeId: string; description: string | null }[]): CategoryListItem[] {
    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      typeId: category.typeId,
      description: category.description,
    }));
  }
}
