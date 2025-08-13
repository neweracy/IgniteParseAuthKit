import React, { createContext, FC, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useReducer } from "react"
import { useMMKVString, useMMKVObject } from "react-native-mmkv"
import Parse from "@/lib/Parse/parse"
import type { TokenResponse } from "expo-auth-session"

// Types matching your MobX store
export interface IAppUser extends Parse.User {
  getEmail(): string
  getUsername(): string
  getSessionToken(): string
}

export interface GoogleAuthResponse {
  type: "success" | "dismiss" | "cancel" | "opened" | "locked" | "error"
  errorCode?: string | null
  error?: any
  params?: Record<string, string>
  authentication?:
    | (TokenResponse & {
        idToken?: string
        accessToken?: string
      })
    | null
  url?: string
}

// Auth state interface
interface AuthState {
  authToken?: string
  authEmail: string
  authPassword: string
  isLoading: boolean
  error: string
  currentUser?: Parse.User
  username?: string
}

// Action types
type AuthAction =
  | { type: 'SET_AUTH_EMAIL'; payload: string }
  | { type: 'SET_AUTH_PASSWORD'; payload: string }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_AUTH_TOKEN'; payload: { token?: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CURRENT_USER'; payload: Parse.User | undefined }
  | { type: 'RESET_AUTH_STATE' }

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_AUTH_EMAIL':
      return { ...state, authEmail: action.payload.replace(/\s+/g, '') }
    case 'SET_AUTH_PASSWORD':
      return { ...state, authPassword: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_AUTH_TOKEN':
      return { ...state, authToken: action.payload.token }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_CURRENT_USER':
      return { 
        ...state, 
        currentUser: action.payload,
        authToken: action.payload?.getSessionToken(),
        username: action.payload?.getUsername()
      }
    case 'RESET_AUTH_STATE':
      return {
        ...state,
        authEmail: '',
        authPassword: '',
        error: '',
        isLoading: false
      }
    default:
      return state
  }
}

// Initial state
const initialAuthState: AuthState = {
  authEmail: '',
  authPassword: '',
  isLoading: false,
  error: '',
  currentUser: undefined,
  username: undefined,
}

// Helper function to check Parse server connection
const checkParseServerConnection = async (): Promise<boolean> => {
  try {
    const TestObject = Parse.Object.extend("TestConnection")
    const query = new Parse.Query(TestObject)
    query.limit(1)
    await query.find()
    return true
  } catch (error) {
    console.error("Parse server connection check failed:", error)
    return false
  }
}

// Validation helper functions - only validate when needed
export const validateEmail = (email: string): string | undefined => {
  if (!email.length) return "Email can't be blank"
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Must be a valid email address"
  }
  return undefined
}

export const validatePassword = (password: string): string | undefined => {
  if (!password.length) return "Password can't be blank"
  if (password.length < 6) {
    return "Password must be at least 6 characters"
  }
  return undefined
}

// Context type
export type AuthContextType = {
  // State
  isAuthenticated: boolean
  authToken?: string
  authEmail: string
  authPassword: string
  isLoading: boolean
  error: string
  currentUser?: Parse.User
  username?: string
  
  // Actions
  setAuthEmail: (email: string) => void
  setAuthPassword: (password: string) => void
  setError: (error: string) => void
  setAuthToken: (token?: string) => void
  resetAuthState: () => void
  login: () => Promise<{ success: boolean; error?: string }>
  signUp: (username: string) => Promise<{ success: boolean; error?: string }>
  googleSignIn: (response: GoogleAuthResponse) => Promise<{ success: boolean; error?: string; user?: Parse.User }>
  logout: () => Promise<{ success: boolean; error?: string }>
  checkCurrentUser: () => Promise<boolean>
  checkServerStatus: () => Promise<{ isRunning: boolean; message: string }>
  
  // Validation helpers
  validateEmail: (email: string) => string | undefined
  validatePassword: (password: string) => string | undefined
}

export const AuthContext = createContext<AuthContextType | null>(null)

export interface AuthProviderProps {}

export const AuthProvider: FC<PropsWithChildren<AuthProviderProps>> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialAuthState)
  
  // Persist auth token and user data
  const [persistedAuthToken, setPersistedAuthToken] = useMMKVString("AuthProvider.authToken")
  const [persistedCurrentUser, setPersistedCurrentUser] = useMMKVObject<Parse.User>("AuthProvider.currentUser")

  // Initialize from persisted data
  useEffect(() => {
    if (persistedAuthToken && persistedCurrentUser) {
      dispatch({ type: 'SET_AUTH_TOKEN', payload: { token: persistedAuthToken } })
      dispatch({ type: 'SET_CURRENT_USER', payload: persistedCurrentUser })
    }
  }, [persistedAuthToken, persistedCurrentUser])

  // Actions
  const setAuthEmail = useCallback((email: string) => {
    dispatch({ type: 'SET_AUTH_EMAIL', payload: email })
  }, [])

  const setAuthPassword = useCallback((password: string) => {
    dispatch({ type: 'SET_AUTH_PASSWORD', payload: password })
  }, [])

  const setError = useCallback((error: string) => {
    dispatch({ type: 'SET_ERROR', payload: error })
  }, [])

  const setAuthToken = useCallback((token?: string) => {
    dispatch({ type: 'SET_AUTH_TOKEN', payload: { token } })
    setPersistedAuthToken(token)
  }, [setPersistedAuthToken])

  const resetAuthState = useCallback(() => {
    dispatch({ type: 'RESET_AUTH_STATE' })
  }, [])

  const login = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: '' })

    try {
      // Validate inputs before attempting login
      const emailError = validateEmail(state.authEmail)
      const passwordError = validatePassword(state.authPassword)
      
      if (emailError || passwordError) {
        const errorMessage = emailError || passwordError
        dispatch({ type: 'SET_ERROR', payload: errorMessage })
        return { success: false, error: errorMessage }
      }

      console.log("Checking Parse server connection...")
      const isServerRunning = await checkParseServerConnection()

      if (!isServerRunning) {
        const errorMessage = "Parse server is not running. Please check your server connection."
        console.error("Server check failed:", errorMessage)
        dispatch({ type: 'SET_ERROR', payload: errorMessage })
        return { success: false, error: errorMessage }
      }

      console.log("Parse server is running. Proceeding with login...")

      const user = await Parse.User.logIn(state.authEmail, state.authPassword)
      dispatch({ type: 'SET_CURRENT_USER', payload: user })
      setPersistedAuthToken(user.getSessionToken())
      setPersistedCurrentUser(user)
      dispatch({ type: 'SET_ERROR', payload: '' })
      
      return { success: true }
    } catch (error: unknown) {
      let errorMessage = "Failed to log in"

      if (error instanceof Error) {
        if (
          error.message.includes("XMLHttpRequest") ||
          error.message.includes("Network Error") ||
          error.message.includes("Failed to fetch") ||
          error.message.includes("ECONNREFUSED")
        ) {
          errorMessage = "Cannot connect to server. Please check if the Parse server is running."
        } else {
          errorMessage = error.message
        }
      }

      console.error("Login error:", errorMessage)
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      return { success: false, error: errorMessage }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [state.authEmail, state.authPassword, setPersistedAuthToken, setPersistedCurrentUser])

  const signUp = useCallback(async (username: string): Promise<{ success: boolean; error?: string }> => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: '' })

    try {
      // Validate inputs before attempting signup
      const emailError = validateEmail(state.authEmail)
      const passwordError = validatePassword(state.authPassword)
      
      if (emailError || passwordError) {
        const errorMessage = emailError || passwordError
        dispatch({ type: 'SET_ERROR', payload: errorMessage })
        return { success: false, error: errorMessage }
      }

      if (!username.trim()) {
        const errorMessage = "Username is required"
        dispatch({ type: 'SET_ERROR', payload: errorMessage })
        return { success: false, error: errorMessage }
      }

      console.log("Checking Parse server connection...")
      const isServerRunning = await checkParseServerConnection()

      if (!isServerRunning) {
        const errorMessage = "Parse server is not running. Please check your server connection."
        console.error("Server check failed:", errorMessage)
        dispatch({ type: 'SET_ERROR', payload: errorMessage })
        return { success: false, error: errorMessage }
      }

      console.log("Parse server is running. Proceeding with signup...")

      const user = new Parse.User()
      user.set("username", username.trim())
      user.set("email", state.authEmail)
      user.set("password", state.authPassword)

      const newUser = await user.signUp()
      dispatch({ type: 'SET_CURRENT_USER', payload: newUser })
      setPersistedAuthToken(newUser.getSessionToken())
      setPersistedCurrentUser(newUser)
      dispatch({ type: 'SET_ERROR', payload: '' })
      
      console.log("Signup successful!")
      return { success: true }
    } catch (error: unknown) {
      let errorMessage = "Failed to sign up"

      if (error instanceof Error) {
        if (
          error.message.includes("XMLHttpRequest") ||
          error.message.includes("Network Error") ||
          error.message.includes("Failed to fetch") ||
          error.message.includes("ECONNREFUSED")
        ) {
          errorMessage = "Cannot connect to server. Please check if the Parse server is running."
        } else {
          errorMessage = error.message
        }
      }

      console.error("Signup error:", errorMessage)
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      return { success: false, error: errorMessage }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [state.authEmail, state.authPassword, setPersistedAuthToken, setPersistedCurrentUser])

  const googleSignIn = useCallback(async (
    response: GoogleAuthResponse
  ): Promise<{ success: boolean; error?: string; user?: Parse.User }> => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: '' })

    try {
      if (response?.type !== "success") {
        console.log("Google authentication was not successful")
        dispatch({ type: 'SET_ERROR', payload: "Google authentication was cancelled or failed" })
        return { success: false, error: "Google authentication was cancelled or failed" }
      }

      if (!response.authentication?.idToken || !response.authentication?.accessToken) {
        console.error("Missing required authentication data in response", response.authentication)
        dispatch({ type: 'SET_ERROR', payload: "Incomplete authentication data received from Google" })
        return {
          success: false,
          error: "Incomplete authentication data. Please try signing in again.",
        }
      }

      console.log("Checking Parse server connection...")
      const isServerRunning = await checkParseServerConnection()

      if (!isServerRunning) {
        const errorMessage = "Parse server is not running. Please check your server connection."
        console.error("Server check failed:", errorMessage)
        dispatch({ type: 'SET_ERROR', payload: errorMessage })
        return { success: false, error: errorMessage }
      }

      console.log("Parse server is running. Proceeding with Google sign-in...")

      const { idToken, accessToken } = response.authentication

      // Fetch Google user profile
      const profileResponse = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      )

      if (!profileResponse.ok) {
        throw new Error(`Failed to fetch user profile: ${profileResponse.status}`)
      }

      const profile = await profileResponse.json()

      const { sub: googleUserId, email, name, picture } = profile

      if (!googleUserId) {
        throw new Error("Google ID (sub) not found in user profile")
      }

      if (!email || !name) {
        throw new Error("Required user information missing from Google profile")
      }

      // Prepare Parse authentication data
      const authData = {
        id: googleUserId,
        id_token: idToken,
        access_token: accessToken,
      }

      // Authenticate with Parse
      const user = await Parse.User.logInWith("google", { authData })

      // Update store with authenticated user
      dispatch({ type: 'SET_CURRENT_USER', payload: user })
      setPersistedAuthToken(user.getSessionToken())
      setPersistedCurrentUser(user)
      dispatch({ type: 'SET_ERROR', payload: '' })

      console.log("Google login successful:", {
        userId: googleUserId,
        email,
        username: name,
        hasPicture: Boolean(picture),
      })

      return { success: true, user }
    } catch (error: unknown) {
      let errorMessage = "Failed to sign in with Google"

      if (error instanceof Error) {
        if (
          error.message.includes("XMLHttpRequest") ||
          error.message.includes("Network Error") ||
          error.message.includes("Failed to fetch") ||
          error.message.includes("ECONNREFUSED")
        ) {
          errorMessage = "Cannot connect to server. Please check if the Parse server is running."
        } else {
          errorMessage = error.message
        }
      }

      console.error("Google sign-in error:", errorMessage)
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      return { success: false, error: errorMessage }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [setPersistedAuthToken, setPersistedCurrentUser])

  const logout = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      // Clear current user and token from store first
      dispatch({ type: 'SET_CURRENT_USER', payload: undefined })
      dispatch({ type: 'SET_AUTH_TOKEN', payload: { token: undefined } })
      setPersistedAuthToken(undefined)
      setPersistedCurrentUser(undefined)
      resetAuthState()

      // Then attempt Parse logout
      try {
        await Parse.User.logOut()
      } catch (logoutError) {
        console.warn("Parse.User.logOut() failed (this is normal in React Native):", logoutError)
      }

      return { success: true }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to log out"
      console.error("Logout error:", errorMessage)
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      return { success: false, error: errorMessage }
    }
  }, [setPersistedAuthToken, setPersistedCurrentUser, resetAuthState])

  const checkCurrentUser = useCallback(async (): Promise<boolean> => {
    try {
      const currentUser = await Parse.User.currentAsync()
      if (currentUser) {
        dispatch({ type: 'SET_CURRENT_USER', payload: currentUser })
        setPersistedAuthToken(currentUser.getSessionToken())
        setPersistedCurrentUser(currentUser)
        return true
      }
      return false
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      console.error("Error checking current user:", errorMessage)
      return false
    }
  }, [setPersistedAuthToken, setPersistedCurrentUser])

  const checkServerStatus = useCallback(async (): Promise<{ isRunning: boolean; message: string }> => {
    try {
      const isRunning = await checkParseServerConnection()
      return { isRunning, message: isRunning ? "Server is running" : "Server is not accessible" }
    } catch (error) {
      return { isRunning: false, message: "Failed to check server status" }
    }
  }, [])

  // Check for existing user on mount
  useEffect(() => {
    checkCurrentUser()
  }, [checkCurrentUser])

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
    
    // Actions
    setAuthEmail,
    setAuthPassword,
    setError,
    setAuthToken,
    resetAuthState,
    login,
    signUp,
    googleSignIn,
    logout,
    checkCurrentUser,
    checkServerStatus,
    
    // Validation helpers
    validateEmail,
    validatePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}

// Export additional helper functions for consistency with your MobX store
export const getCurrentUser = async (): Promise<Parse.User | null> => {
  try {
    return await Parse.User.currentAsync()
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}

export const fetchAllUsers = async (): Promise<Parse.User[]> => {
  try {
    const query = new Parse.Query(Parse.User)
    const results = await query.find()
    return results
  } catch (error) {
    console.error("Error fetching users:", error)
    return []
  }
}