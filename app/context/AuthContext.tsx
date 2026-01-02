/**
 * AuthContext - Legacy re-export
 * This file maintains backward compatibility by re-exporting from the new modular structure.
 * All authentication logic has been refactored into dedicated modules in the ./auth folder:
 * - types.ts: Type definitions
 * - validation.ts: Validation utilities
 * - services.ts: Parse API calls and auth operations
 * - reducer.ts: State management reducer
 * - AuthProvider.tsx: Provider component
 * - hooks.ts: Custom hooks
 * - index.ts: Main export point
 */

export * from "./auth";