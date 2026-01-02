import Parse from "@/lib/Parse";
import type { TokenResponse } from "expo-auth-session";

/**
 * Type definitions for authentication system
 */

// Narrow Parse user shape we rely on across the UI
export interface IAppUser extends Parse.User {
  getEmail(): string;
  getUsername(): string;
  getSessionToken(): string;
}

export interface GoogleAuthResponse {
  type: "success" | "dismiss" | "cancel" | "opened" | "locked" | "error";
  errorCode?: string | null;
  error?: any;
  params?: Record<string, string>;
  authentication?:
    | (TokenResponse & {
        idToken?: string;
        accessToken?: string;
      })
    | null;
  url?: string;
}

// In-memory auth state kept in the provider
export interface AuthState {
  authToken?: string;
  authEmail: string;
  authPassword: string;
  isLoading: boolean;
  error: string;
  currentUser?: Parse.User;
  username?: string;
  resetPasswordMessage?: string;
}

// Reducer actions
export type AuthAction =
  | { type: "SET_AUTH_EMAIL"; payload: string }
  | { type: "SET_AUTH_PASSWORD"; payload: string }
  | { type: "SET_ERROR"; payload: string }
  | { type: "SET_AUTH_TOKEN"; payload: { token?: string } }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_CURRENT_USER"; payload: Parse.User | undefined }
  | { type: "SET_RESET_PASSWORD_MESSAGE"; payload: string }
  | { type: "RESET_AUTH_STATE" }
  | { type: "CLEAR_FORM" }
  | { type: "CLEAR_RESET_MESSAGE" };

// Public API exposed via the Auth context
export type AuthContextType = {
  // State
  isAuthenticated: boolean;
  authToken?: string;
  authEmail: string;
  authPassword: string;
  isLoading: boolean;
  error: string;
  currentUser?: Parse.User;
  username?: string;
  resetPasswordMessage?: string;

  // Actions
  setAuthEmail: (email: string) => void;
  setAuthPassword: (password: string) => void;
  setError: (error: string) => void;
  setAuthToken: (token?: string) => void;
  resetAuthState: () => void;
  clearForm: () => void;
  clearResetMessage: () => void;
  login: () => Promise<{ success: boolean; error?: string }>;
  signUp: (username: string) => Promise<{ success: boolean; error?: string }>;
  googleSignIn: (
    response: GoogleAuthResponse
  ) => Promise<{ success: boolean; error?: string; user?: Parse.User }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => Promise<{ success: boolean; error?: string }>;
  checkCurrentUser: () => Promise<boolean>;
  checkServerStatus: () => Promise<{ isRunning: boolean; message: string }>;

  // Validation helpers
  validateEmail: (email: string) => string | undefined;
  validatePassword: (password: string) => string | undefined;
  validateUsername: (username: string) => string | undefined;
};

export interface AuthProviderProps {}

// Persisted user data structure
export interface PersistedUserData {
  objectId: string;
  sessionToken: string;
  username: string;
  email: string;
}
