/**
 * Validation utilities for authentication
 */

/**
 * Validates an email address
 * @param email - The email address to validate
 * @returns Error message if invalid, undefined if valid
 */
export const validateEmail = (email: string): string | undefined => {
  if (!email.length) return "Email can't be blank";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Must be a valid email address";
  }
  return undefined;
};

/**
 * Validates a password
 * @param password - The password to validate
 * @returns Error message if invalid, undefined if valid
 */
export const validatePassword = (password: string): string | undefined => {
  if (!password.length) return "Password can't be blank";
  if (password.length < 6) {
    return "Password must be at least 6 characters";
  }
  return undefined;
};

/**
 * Validates a username
 * @param username - The username to validate
 * @returns Error message if invalid, undefined if valid
 */
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
