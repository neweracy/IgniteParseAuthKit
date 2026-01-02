/**
 * Auth module exports
 * Central export point for all authentication functionality
 */

// Types
export type {
  IAppUser,
  GoogleAuthResponse,
  AuthState,
  AuthAction,
  AuthContextType,
  AuthProviderProps,
  PersistedUserData,
} from "./types";

// Provider and Context
export { AuthProvider, AuthContext } from "./AuthProvider";

// Hooks
export { useAuth, getCurrentUser, fetchAllUsersHelper as fetchAllUsers } from "./hooks";

// Validation utilities
export { validateEmail, validatePassword, validateUsername } from "./validation";

// Services (for advanced usage)
export {
  checkParseServerConnection,
  loginUser,
  signUpUser,
  signInWithGoogle,
  requestPasswordReset,
  logoutUser,
  restoreUserSession,
} from "./services";

// Reducer (for advanced usage)
export { authReducer, initialAuthState } from "./reducer";
