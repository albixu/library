/**
 * Infrastructure Layer
 *
 * Contains adapters that implement application ports (driven/output side)
 * and drivers that expose the application (driver/input side).
 *
 * Structure:
 * - config/: Environment and application configuration
 * - driven/: Output adapters (repositories, external services)
 * - driver/: Input adapters (HTTP routes, CLI commands) - future
 */

export * from './config/index.js';
export * from './driven/embedding/index.js';
export * from './driven/logging/index.js';
export * from './driven/persistence/index.js';
