import Parse from "@/lib/Parse";
import type { GoogleAuthResponse, PersistedUserData } from "./types";
import { validateEmail, validatePassword, validateUsername } from "./validation";

/**
 * Authentication services
 * Contains all Parse-related authentication operations
 */

/**
 * Lightweight probe to confirm the Parse backend is reachable
 */
export const checkParseServerConnection = async (): Promise<boolean> => {
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

/**
 * Logs in a user with email and password
 */
export const loginUser = async (
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: Parse.User }> => {
  try {
    // 1) Validate inputs
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (emailError || passwordError) {
      const errorMessage = emailError || passwordError;
      return { success: false, error: errorMessage };
    }

    console.log("Checking Parse server connection...");
    const isServerRunning = await checkParseServerConnection();

    if (!isServerRunning) {
      const errorMessage =
        "Parse server is not running. Please check your server connection.";
      console.error("Server check failed:", errorMessage);
      return { success: false, error: errorMessage };
    }

    // 2) Attempt Parse login
    console.log("Parse server is running. Proceeding with login...");

    const user = await Parse.User.logIn(email, password);
    return { success: true, user };
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
    return { success: false, error: errorMessage };
  }
};

/**
 * Signs up a new user
 */
export const signUpUser = async (
  username: string,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: Parse.User }> => {
  try {
    // 1) Validate inputs
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const usernameError = validateUsername(username);

    if (emailError || passwordError || usernameError) {
      const errorMessage = emailError || passwordError || usernameError;
      return { success: false, error: errorMessage };
    }

    console.log("Checking Parse server connection...");
    const isServerRunning = await checkParseServerConnection();

    if (!isServerRunning) {
      const errorMessage =
        "Parse server is not running. Please check your server connection.";
      console.error("Server check failed:", errorMessage);
      return { success: false, error: errorMessage };
    }

    // 2) Create and sign up a new Parse user
    console.log("Parse server is running. Proceeding with signup...");

    const user = new Parse.User();
    user.set("username", username.trim());
    user.set("email", email);
    user.set("password", password);

    const newUser = await user.signUp();

    console.log("Signup successful!");
    return { success: true, user: newUser };
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
    return { success: false, error: errorMessage };
  }
};

/**
 * Signs in a user with Google OAuth
 */
export const signInWithGoogle = async (
  response: GoogleAuthResponse
): Promise<{ success: boolean; error?: string; user?: Parse.User }> => {
  try {
    // 1) Validate OAuth response
    if (response?.type !== "success") {
      console.log("Google authentication was not successful");
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

    // Update user profile
    user.set("username", name.trim());
    user.set("email", email);

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
    return { success: false, error: errorMessage };
  }
};

/**
 * Requests a password reset for the given email
 */
export const requestPasswordReset = async (
  email: string
): Promise<{ success: boolean; error?: string; message?: string }> => {
  try {
    // 1) Validate email
    const emailError = validateEmail(email);
    if (emailError) {
      return { success: false, error: emailError };
    }

    // 2) Check server connection
    console.log("Checking Parse server connection...");
    const isServerRunning = await checkParseServerConnection();

    if (!isServerRunning) {
      const errorMessage =
        "Parse server is not running. Please check your server connection.";
      console.error("Server check failed:", errorMessage);
      return { success: false, error: errorMessage };
    }

    // 3) Request password reset
    console.log("Parse server is running. Requesting password reset...");
    await Parse.User.requestPasswordReset(email);

    const successMessage = `Password reset email sent to ${email}. Please check your inbox and follow the instructions to reset your password.`;

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
    return { success: false, error: errorMessage };
  }
};

/**
 * Logs out the current user
 */
export const logoutUser = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // Attempt Parse logout (may fail silently on RN; that's OK)
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
    return { success: false, error: errorMessage };
  }
};

/**
 * Gets the current user from Parse
 */
export const getCurrentUser = async (): Promise<Parse.User | null> => {
  try {
    return await Parse.User.currentAsync();
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

/**
 * Fetches all users from Parse
 */
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

/**
 * Restores a user session from a persisted token
 */
export const restoreUserSession = async (
  token: string
): Promise<Parse.User | null> => {
  try {
    const user = await Parse.User.become(token);
    return user;
  } catch (error) {
    console.error("Failed to restore user session:", error);
    return null;
  }
};
