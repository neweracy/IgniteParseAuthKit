import React, {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useEffect,
  useReducer,
} from "react";
import { useMMKVString, useMMKVObject } from "react-native-mmkv";
import Parse from "@/lib/Parse";
import type {
  AuthContextType,
  AuthProviderProps,
  PersistedUserData,
  GoogleAuthResponse,
} from "./types";
import { authReducer, initialAuthState } from "./reducer";
import {
  loginUser,
  signUpUser,
  signInWithGoogle,
  requestPasswordReset as requestPasswordResetService,
  logoutUser,
  getCurrentUser,
  restoreUserSession,
  checkParseServerConnection,
} from "./services";
import { validateEmail, validatePassword, validateUsername } from "./validation";

/**
 * AuthContext
 * - Centralizes authentication state and actions for the app using Parse.
 * - Persists a minimal user snapshot and session token in MMKV for fast restore.
 * - Exposes typed helpers for login, signup, Google OAuth, logout, password reset, and status checks.
 */

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: FC<PropsWithChildren<AuthProviderProps>> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  // Persisted storage (fast restore across app restarts)
  const [persistedAuthToken, setPersistedAuthToken] = useMMKVString(
    "AuthProvider.authToken"
  );
  const [persistedUserData, setPersistedUserData] = useMMKVObject<PersistedUserData>(
    "AuthProvider.userData"
  );

  // On boot: try to restore a valid session from persisted data
  useEffect(() => {
    const initializeAuth = async () => {
      if (persistedAuthToken && persistedUserData) {
        try {
          // 1) Prefer the current user already held by Parse if the token matches
          const currentUser = await Parse.User.currentAsync();
          if (currentUser && currentUser.getSessionToken() === persistedAuthToken) {
            dispatch({ type: "SET_CURRENT_USER", payload: currentUser });
            return;
          }
        } catch (error) {
          console.warn("Could not get current user from Parse:", error);
        }

        // 2) Fallback: try to restore session from token using Parse API
        try {
          const user = await restoreUserSession(persistedAuthToken);
          if (user) {
            dispatch({
              type: "SET_AUTH_TOKEN",
              payload: { token: persistedAuthToken },
            });
            dispatch({ type: "SET_CURRENT_USER", payload: user });
          } else {
            // Clear invalid persisted data to avoid loops
            setPersistedAuthToken(undefined);
            setPersistedUserData(undefined);
          }
        } catch (error) {
          console.error("Failed to restore user session:", error);
          // Clear invalid persisted data to avoid loops
          setPersistedAuthToken(undefined);
          setPersistedUserData(undefined);
        }
      }
    };

    initializeAuth();
  }, [persistedAuthToken, persistedUserData, setPersistedAuthToken, setPersistedUserData]);

  // Lightweight action wrappers
  const setAuthEmail = useCallback((email: string) => {
    dispatch({ type: "SET_AUTH_EMAIL", payload: email });
  }, []);

  const setAuthPassword = useCallback((password: string) => {
    dispatch({ type: "SET_AUTH_PASSWORD", payload: password });
  }, []);

  const setError = useCallback((error: string) => {
    dispatch({ type: "SET_ERROR", payload: error });
  }, []);

  const setAuthToken = useCallback(
    (token?: string) => {
      dispatch({ type: "SET_AUTH_TOKEN", payload: { token } });
      setPersistedAuthToken(token);
    },
    [setPersistedAuthToken]
  );

  const clearResetMessage = useCallback(() => {
    dispatch({ type: "CLEAR_RESET_MESSAGE" });
  }, []);

  // Single place to persist both token and a minimal user snapshot
  const persistUserData = useCallback(
    (user: Parse.User) => {
      const userData: PersistedUserData = {
        objectId: user.id,
        sessionToken: user.getSessionToken(),
        username: user.getUsername() || "",
        email: user.getEmail() || "",
      };
      setPersistedAuthToken(user.getSessionToken());
      setPersistedUserData(userData as any);
    },
    [setPersistedAuthToken, setPersistedUserData]
  );

  const resetAuthState = useCallback(() => {
    dispatch({ type: "RESET_AUTH_STATE" });
  }, []);

  const clearForm = useCallback(() => {
    dispatch({ type: "CLEAR_FORM" });
  }, []);

  const login = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: "" });

    try {
      const result = await loginUser(state.authEmail, state.authPassword);

      if (result.success && result.user) {
        dispatch({ type: "SET_CURRENT_USER", payload: result.user });
        persistUserData(result.user);
        dispatch({ type: "CLEAR_FORM" }); // clear form fields only
      } else if (result.error) {
        dispatch({ type: "SET_ERROR", payload: result.error });
      }

      return result;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [state.authEmail, state.authPassword, persistUserData]);

  const signUp = useCallback(
    async (username: string): Promise<{ success: boolean; error?: string }> => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: "" });

      try {
        const result = await signUpUser(username, state.authEmail, state.authPassword);

        if (result.success && result.user) {
          dispatch({ type: "SET_CURRENT_USER", payload: result.user });
          persistUserData(result.user);
          dispatch({ type: "CLEAR_FORM" }); // clear form fields only
        } else if (result.error) {
          dispatch({ type: "SET_ERROR", payload: result.error });
        }

        return result;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [state.authEmail, state.authPassword, persistUserData]
  );

  const googleSignIn = useCallback(
    async (
      response: GoogleAuthResponse
    ): Promise<{ success: boolean; error?: string; user?: Parse.User }> => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: "" });

      try {
        const result = await signInWithGoogle(response);

        if (result.success && result.user) {
          dispatch({ type: "SET_CURRENT_USER", payload: result.user });
          persistUserData(result.user);
          dispatch({ type: "CLEAR_FORM" });
        } else if (result.error) {
          dispatch({ type: "SET_ERROR", payload: result.error });
        }

        return result;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [persistUserData]
  );

  const requestPasswordResetAction = useCallback(
    async (email: string): Promise<{ success: boolean; error?: string; message?: string }> => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: "" });
      dispatch({ type: "CLEAR_RESET_MESSAGE" });

      try {
        const result = await requestPasswordResetService(email);

        if (result.success && result.message) {
          dispatch({ type: "SET_RESET_PASSWORD_MESSAGE", payload: result.message });
        } else if (result.error) {
          dispatch({ type: "SET_ERROR", payload: result.error });
        }

        return result;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      // Clear persisted data first
      setPersistedAuthToken(undefined);
      setPersistedUserData(undefined);

      // Reset all in-memory auth state
      dispatch({ type: "RESET_AUTH_STATE" });

      // Then attempt Parse logout
      const result = await logoutUser();

      if (result.error) {
        dispatch({ type: "SET_ERROR", payload: result.error });
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to log out";
      console.error("Logout error:", errorMessage);
      dispatch({ type: "SET_ERROR", payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, [setPersistedAuthToken, setPersistedUserData]);

  const checkCurrentUser = useCallback(async (): Promise<boolean> => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        dispatch({ type: "SET_CURRENT_USER", payload: currentUser });
        persistUserData(currentUser);
        return true;
      }
      return false;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error checking current user:", errorMessage);
      return false;
    }
  }, [persistUserData]);

  const checkServerStatus = useCallback(async (): Promise<{
    isRunning: boolean;
    message: string;
  }> => {
    try {
      const isRunning = await checkParseServerConnection();
      return {
        isRunning,
        message: isRunning ? "Server is running" : "Server is not accessible",
      };
    } catch (error) {
      return { isRunning: false, message: "Failed to check server status" };
    }
  }, []);

  // On mount: re-sync the current user from Parse if available
  useEffect(() => {
    checkCurrentUser();
  }, [checkCurrentUser]);

  // Memo-like object literal passed to consumers
  const value: AuthContextType = {
    // State
    isAuthenticated: !!state.currentUser || !!state.authToken,
    authToken: state.authToken,
    authEmail: state.authEmail,
    authPassword: state.authPassword,
    isLoading: state.isLoading,
    error: state.error,
    currentUser: state.currentUser,
    username: state.username,
    resetPasswordMessage: state.resetPasswordMessage,

    // Actions
    setAuthEmail,
    setAuthPassword,
    setError,
    setAuthToken,
    resetAuthState,
    clearForm,
    clearResetMessage,
    login,
    signUp,
    googleSignIn,
    requestPasswordReset: requestPasswordResetAction,
    logout,
    checkCurrentUser,
    checkServerStatus,

    // Validation helpers
    validateEmail,
    validatePassword,
    validateUsername,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
