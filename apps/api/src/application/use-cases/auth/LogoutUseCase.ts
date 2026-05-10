/**
 * LogoutUseCase
 *
 * Application use case for user logout.
 *
 * Logout is stateless in this implementation — JWT tokens are not stored server-side.
 * The actual invalidation is achieved by clearing the HTTP-only refresh token cookie
 * at the controller/HTTP layer.
 *
 * This use case exists as a clean architectural boundary: if we ever need to add
 * server-side token revocation (e.g., a denylist), we do it here without touching
 * the HTTP layer.
 *
 * HU-038: Authentication use case for user logout.
 */

/**
 * LogoutUseCase
 *
 * Currently a no-op at the application layer. Cookie clearing happens in the HTTP handler.
 */
export class LogoutUseCase {
  /**
   * Executes the logout use case
   *
   * @returns Promise resolving to void
   */
  async execute(): Promise<void> {
    // Stateless logout: no server-side token invalidation needed.
    // The HTTP layer is responsible for clearing the refresh token cookie.
  }
}
