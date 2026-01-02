import type { AuthState, AuthAction } from "./types";

/**
 * Auth reducer
 * Handles all auth state transitions in one place
 */

// Initial value for the reducer
export const initialAuthState: AuthState = {
  authEmail: "",
  authPassword: "",
  isLoading: false,
  error: "",
  currentUser: undefined,
  username: undefined,
  resetPasswordMessage: undefined,
};

export const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "SET_AUTH_EMAIL":
      return { ...state, authEmail: action.payload.replace(/\s+/g, "") };
    case "SET_AUTH_PASSWORD":
      return { ...state, authPassword: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_AUTH_TOKEN":
      return { ...state, authToken: action.payload.token };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_CURRENT_USER":
      return {
        ...state,
        currentUser: action.payload,
        authToken: action.payload?.getSessionToken(),
        username: action.payload?.getUsername(),
      };
    case "SET_RESET_PASSWORD_MESSAGE":
      return { ...state, resetPasswordMessage: action.payload };
    case "CLEAR_RESET_MESSAGE":
      return { ...state, resetPasswordMessage: undefined };
    case "RESET_AUTH_STATE":
      // Full reset (used for logout)
      return {
        ...state,
        authEmail: "",
        authPassword: "",
        error: "",
        isLoading: false,
        currentUser: undefined,
        authToken: undefined,
        username: undefined,
        resetPasswordMessage: undefined,
      };
    case "CLEAR_FORM":
      // Clear only form fields; keep the authenticated user
      return {
        ...state,
        authEmail: "",
        authPassword: "",
        error: "",
        isLoading: false,
        resetPasswordMessage: undefined,
      };
    default:
      return state;
  }
};
