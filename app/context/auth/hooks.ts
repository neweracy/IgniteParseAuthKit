import { useContext } from "react";
import { AuthContext } from "./AuthProvider";
import { getCurrentUser as getUser, fetchAllUsers } from "./services";

/**
 * Custom hooks for authentication
 */

/**
 * Hook to access auth context
 * Must be used within an AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

/**
 * Convenience helper to get current user
 * Can be used outside of React components
 */
export const getCurrentUser = getUser;

/**
 * Convenience helper to fetch all users
 * Can be used outside of React components
 */
export const fetchAllUsersHelper = fetchAllUsers;
