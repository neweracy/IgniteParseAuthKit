import React, {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { useMMKVString, useMMKVObject } from "react-native-mmkv";
import Parse from "@/lib/Parse/parse";
import type { TokenResponse } from "expo-auth-session";

/**
 * AuthContext
 * - Centralizes authentication state and actions for the app using Parse.
 * - Persists a minimal user snapshot and session token in MMKV for fast restore.
 * - Exposes typed helpers for login, signup, Google OAuth, logout, password reset, and status checks.
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
interface AuthState {
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
type AuthAction =
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

// Reducer: handles all auth state transitions in one place
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
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

// Initial value for the reducer
const initialAuthState: AuthState = {
  authEmail: "",
  authPassword: "",
  isLoading: false,
  error: "",
  currentUser: undefined,
  username: undefined,
  resetPasswordMessage: undefined,
};

// Lightweight probe to confirm the Parse backend is reachable
const checkParseServerConnection = async (): Promise<boolean> => {
  try {
    const TestObject = Parse.Object.extend("TestConnection");
    const query = new Parse.Query(TestObject);
    query.limit(1);
    await query.find();
    return true;
  } catch (error) {
    console.error("Parse server connection check failed:", error);
    return false;
  }
};

// Validation helpers (return a message string or undefined if valid)
export const validateEmail = (email: string): string | undefined => {
  if (!email.length) return "Email can't be blank";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Must be a valid email address";
  }
  return undefined;
};

export const validatePassword = (password: string): string | undefined => {
  if (!password.length) return "Password can't be blank";
  if (password.length < 6) {
    return "Password must be at least 6 characters";
  }
  return undefined;
};

export const validateUsername = (username: string): string | undefined => {
  if (!username.trim().length) return "Username can't be blank";
  if (username.trim().length < 3) {
    return "Username must be at least 3 characters";
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
    return "Username can only contain letters, numbers, and underscores";
  }
  return undefined;
};

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

export const AuthContext = createContext<AuthContextType | null>(null);

export interface AuthProviderProps {}

export const AuthProvider: FC<PropsWithChildren<AuthProviderProps>> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  // Persisted storage (fast restore across app restarts)
  const [persistedAuthToken, setPersistedAuthToken] = useMMKVString(
    "AuthProvider.authToken"
  );
  const [persistedUserData, setPersistedUserData] = useMMKVObject<{
    objectId: string;
    sessionToken: string;
    username: string;
    email: string;
  }>("AuthProvider.userData");

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
          const user = await Parse.User.become(persistedAuthToken);
          dispatch({
            type: "SET_AUTH_TOKEN",
            payload: { token: persistedAuthToken },
          });
          dispatch({ type: "SET_CURRENT_USER", payload: user });
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
      const userData = {
        objectId: user.id,
        sessionToken: user.getSessionToken(),
        username: user.getUsername(),
        email: user.getEmail(),
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
      // 1) Validate inputs
      const emailError = validateEmail(state.authEmail);
      const passwordError = validatePassword(state.authPassword);

      if (emailError || passwordError) {
        const errorMessage = emailError || passwordError;
        dispatch({ type: "SET_ERROR", payload: errorMessage || "" });
        return { success: false, error: errorMessage };
      }

      console.log("Checking Parse server connection...");
      const isServerRunning = await checkParseServerConnection();

      if (!isServerRunning) {
        const errorMessage =
          "Parse server is not running. Please check your server connection.";
        console.error("Server check failed:", errorMessage);
        dispatch({ type: "SET_ERROR", payload: errorMessage });
        return { success: false, error: errorMessage };
      }

      // 2) Attempt Parse login
      console.log("Parse server is running. Proceeding with login...");

      const user = await Parse.User.logIn(state.authEmail, state.authPassword);
      dispatch({ type: "SET_CURRENT_USER", payload: user });
      persistUserData(user);
      dispatch({ type: "CLEAR_FORM" }); // clear form fields only

      return { success: true };
    } catch (error) {
      let errorMessage = "Failed to log in";

      if (error instanceof Error) {
        if (error.message.includes("Invalid username/password")) {
          errorMessage = "Invalid email or password. Please try again.";
        } else if (
          error.message.includes("XMLHttpRequest") ||
          error.message.includes("Network Error") ||
          error.message.includes("Failed to fetch") ||
          error.message.includes("ECONNREFUSED")
        ) {
          errorMessage =
            "Cannot connect to server. Please check if the Parse server is running.";
        } else {
          errorMessage = error.message;
        }
      }

      console.error("Login error:", errorMessage);
      dispatch({ type: "SET_ERROR", payload: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [
    state.authEmail,
    state.authPassword,
    persistUserData,
  ]);

  const signUp = useCallback(
    async (username: string): Promise<{ success: boolean; error?: string }> => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: "" });

      try {
        // 1) Validate inputs
        const emailError = validateEmail(state.authEmail);
        const passwordError = validatePassword(state.authPassword);
        const usernameError = validateUsername(username);

        if (emailError || passwordError || usernameError) {
          const errorMessage = emailError || passwordError || usernameError;
          dispatch({ type: "SET_ERROR", payload: errorMessage as any });
          return { success: false, error: errorMessage };
        }

        console.log("Checking Parse server connection...");
        const isServerRunning = await checkParseServerConnection();

        if (!isServerRunning) {
          const errorMessage =
            "Parse server is not running. Please check your server connection.";
          console.error("Server check failed:", errorMessage);
          dispatch({ type: "SET_ERROR", payload: errorMessage });
          return { success: false, error: errorMessage };
        }

        // 2) Create and sign up a new Parse user
        console.log("Parse server is running. Proceeding with signup...");

        const user = new Parse.User();
        user.set("username", username.trim());
        user.set("email", state.authEmail);
        user.set("password", state.authPassword);

        const newUser = await user.signUp();
        
        // 3) Set the current user and persist data
        dispatch({ type: "SET_CURRENT_USER", payload: newUser });
        persistUserData(newUser);
        
        dispatch({ type: "CLEAR_FORM" }); // clear form fields only

        console.log("Signup successful!");
        return { success: true };
      } catch (error) {
        let errorMessage = "Failed to sign up";

        if (error instanceof Error) {
          if (error.message.includes("username") && error.message.includes("taken")) {
            errorMessage = "Username is already taken. Please choose another one.";
          } else if (error.message.includes("email") && error.message.includes("taken")) {
            errorMessage = "Email is already registered. Please use another email or try logging in.";
          } else if (error.message.includes("Account already exists")) {
            errorMessage = "An account with this email already exists. Please try logging in.";
          } else if (
            error.message.includes("XMLHttpRequest") ||
            error.message.includes("Network Error") ||
            error.message.includes("Failed to fetch") ||
            error.message.includes("ECONNREFUSED")
          ) {
            errorMessage =
              "Cannot connect to server. Please check if the Parse server is running.";
          } else {
            errorMessage = error.message;
          }
        }

        console.error("Signup error:", errorMessage);
        dispatch({ type: "SET_ERROR", payload: errorMessage });
        return { success: false, error: errorMessage };
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [
      state.authEmail,
      state.authPassword,
      persistUserData,
    ]
  );

  const googleSignIn = useCallback(
    async (
      response: GoogleAuthResponse
    ): Promise<{ success: boolean; error?: string; user?: Parse.User }> => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: "" });

      try {
        // 1) Validate OAuth response
        if (response?.type !== "success") {
          console.log("Google authentication was not successful");
          dispatch({
            type: "SET_ERROR",
            payload: "Google authentication was cancelled or failed",
          });
          return {
            success: false,
            error: "Google authentication was cancelled or failed",
          };
        }

        if (
          !response.authentication?.idToken ||
          !response.authentication?.accessToken
        ) {
          console.error(
            "Missing required authentication data in response",
            response.authentication
          );
          dispatch({
            type: "SET_ERROR",
            payload: "Incomplete authentication data received from Google",
          });
          return {
            success: false,
            error:
              "Incomplete authentication data. Please try signing in again.",
          };
        }

        // 2) Ensure backend is reachable
        console.log("Checking Parse server connection...");
        const isServerRunning = await checkParseServerConnection();

        if (!isServerRunning) {
          const errorMessage =
            "Parse server is not running. Please check your server connection.";
          console.error("Server check failed:", errorMessage);
          dispatch({ type: "SET_ERROR", payload: errorMessage });
          return { success: false, error: errorMessage };
        }

        // 3) Fetch Google profile and authenticate with Parse using authData
        console.log("Parse server is running. Proceeding with Google sign-in...");

        const { idToken, accessToken } = response.authentication;

        // Fetch Google user profile
        const profileResponse = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!profileResponse.ok) {
          throw new Error(
            `Failed to fetch user profile: ${profileResponse.status}`
          );
        }

        const profile = await profileResponse.json();

        const { sub: googleUserId, email, name, picture } = profile;

        if (!googleUserId) {
          throw new Error("Google ID (sub) not found in user profile");
        }

        if (!email || !name) {
          throw new Error(
            "Required user information missing from Google profile"
          );
        }

        // Prepare Parse authentication data
        const authData = {
          id: googleUserId,
          id_token: idToken,
          access_token: accessToken,
        };

        // Authenticate with Parse
        const user = await Parse.User.logInWith("google", { authData });

        // Update store with authenticated user
        dispatch({ type: "SET_CURRENT_USER", payload: user });
        persistUserData(user);
        dispatch({ type: "CLEAR_FORM" });

        console.log("Google login successful:", {
          userId: googleUserId,
          email,
          username: name,
          hasPicture: Boolean(picture),
        });

        return { success: true, user };
      } catch (error) {
        let errorMessage = "Failed to sign in with Google";

        if (error instanceof Error) {
          if (
            error.message.includes("XMLHttpRequest") ||
            error.message.includes("Network Error") ||
            error.message.includes("Failed to fetch") ||
            error.message.includes("ECONNREFUSED")
          ) {
            errorMessage =
              "Cannot connect to server. Please check if the Parse server is running.";
          } else {
            errorMessage = error.message;
          }
        }

        console.error("Google sign-in error:", errorMessage);
        dispatch({ type: "SET_ERROR", payload: errorMessage });
        return { success: false, error: errorMessage };
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [persistUserData]
  );

  const requestPasswordReset = useCallback(
    async (email: string): Promise<{ success: boolean; error?: string; message?: string }> => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: "" });
      dispatch({ type: "CLEAR_RESET_MESSAGE" });

      try {
        // 1) Validate email
        const emailError = validateEmail(email);
        if (emailError) {
          dispatch({ type: "SET_ERROR", payload: emailError });
          return { success: false, error: emailError };
        }

        // 2) Check server connection
        console.log("Checking Parse server connection...");
        const isServerRunning = await checkParseServerConnection();

        if (!isServerRunning) {
          const errorMessage =
            "Parse server is not running. Please check your server connection.";
          console.error("Server check failed:", errorMessage);
          dispatch({ type: "SET_ERROR", payload: errorMessage });
          return { success: false, error: errorMessage };
        }

        // 3) Request password reset
        console.log("Parse server is running. Requesting password reset...");
        await Parse.User.requestPasswordReset(email);

        const successMessage = `Password reset email sent to ${email}. Please check your inbox and follow the instructions to reset your password.`;
        dispatch({ type: "SET_RESET_PASSWORD_MESSAGE", payload: successMessage });

        console.log("Password reset request successful for:", email);
        return { success: true, message: successMessage };

      } catch (error) {
        let errorMessage = "Failed to request password reset";

        if (error instanceof Error) {
          if (error.message.includes("no user found with email")) {
            errorMessage = "No account found with this email address.";
          } else if (error.message.includes("email adapter")) {
            errorMessage = "Email service is not configured. Please contact support.";
          } else if (
            error.message.includes("XMLHttpRequest") ||
            error.message.includes("Network Error") ||
            error.message.includes("Failed to fetch") ||
            error.message.includes("ECONNREFUSED")
          ) {
            errorMessage =
              "Cannot connect to server. Please check if the Parse server is running.";
          } else {
            errorMessage = error.message;
          }
        }

        console.error("Password reset error:", errorMessage);
        dispatch({ type: "SET_ERROR", payload: errorMessage });
        return { success: false, error: errorMessage };
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

      // Then attempt Parse logout (may fail silently on RN; that's OK)
      try {
        await Parse.User.logOut();
      } catch (logoutError) {
        console.warn(
          "Parse.User.logOut() failed (common in React Native):",
          logoutError
        );
      }

      return { success: true };
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
      const currentUser = await Parse.User.currentAsync();
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
    requestPasswordReset,
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

// Convenience helpers (mirror similar Parse utils; safe to keep close to the context)
export const getCurrentUser = async (): Promise<Parse.User | null> => {
  try {
    return await Parse.User.currentAsync();
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

export const fetchAllUsers = async (): Promise<Parse.User[]> => {
  try {
    const query = new Parse.Query(Parse.User);
    const results = await query.find();
    return results;
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};