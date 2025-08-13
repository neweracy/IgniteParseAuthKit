import { ComponentType, FC, useEffect, useMemo, useRef, useState } from "react";
// eslint-disable-next-line no-restricted-imports
import { TextInput, TextStyle, ViewStyle, Alert } from "react-native";

import { Button } from "@/components/Button";
import { PressableIcon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { type TextFieldAccessoryProps, TextField } from "@/components/TextField";
import type { AppStackScreenProps } from "@/navigators/AppNavigator";
import type { ThemedStyle } from "@/theme/types";
import { useAppTheme } from "@/theme/context";
import { useHeader } from "@/utils/useHeader";
import { useAuth } from "@/context/AuthContext";

interface LoginScreenProps extends AppStackScreenProps<"Login"> {}

export const LoginScreen: FC<LoginScreenProps> = ({ navigation }) => {
  const authPasswordInput = useRef<TextInput>(null);
  const [isAuthPasswordHidden, setIsAuthPasswordHidden] = useState(true);

  // Use auth context instead of local state and separate hook
  const {
    authEmail,
    authPassword,
    setAuthEmail,
    setAuthPassword,
    validateEmail,
    validatePassword,
    isLoading,
    error,
    login,
    resetAuthState,
    isAuthenticated
  } = useAuth();

  const {
    themed,
    theme: { colors },
  } = useAppTheme();

  // Navigate to authenticated area if login successful
  useEffect(() => {
    if (isAuthenticated) {
      navigation.navigate("Welcome"); // or wherever you want to redirect after login
    }
  }, [isAuthenticated, navigation]);

  useEffect(() => {
    // Optional: Pre-fill form fields for development
    // Remove these in production
    setAuthEmail("test@example.com");
    setAuthPassword("password123");
  }, [setAuthEmail, setAuthPassword]);

  const register = () => {
    navigation.navigate("Register");
    resetAuthState(); // Clear form fields using context method
  };

  useHeader({
    leftIcon: "back",
    onLeftPress: () => {
      navigation.navigate("ChooseAuth");
    },
  });


  const forgetPassword = () => {
    navigation.navigate("ForgetPassword");
  };

  const handleLogin = async () => {
    // Validate inputs before attempting login
    const emailError = validateEmail(authEmail);
    const passwordError = validatePassword(authPassword);
    
    if (emailError || passwordError) {
      return; // Validation errors will be shown in the UI
    }

    try {
      const result = await login();
      
      if (result.success) {
        // Navigation handled by useEffect above
        console.log("Login successful!");
      } else {
        // Error is already set in the context, will be displayed in UI
        Alert.alert(
          "Login Failed",
          result.error || "An unexpected error occurred during login."
        );
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
    }
  };

  // Compute validation errors
  const emailValidationError = authEmail ? validateEmail(authEmail) : undefined;
  const passwordValidationError = authPassword ? validatePassword(authPassword) : undefined;
  const hasValidationErrors = !!(emailValidationError || passwordValidationError);

  const PasswordRightAccessory: ComponentType<TextFieldAccessoryProps> = useMemo(
    () =>
      function PasswordRightAccessory(props: TextFieldAccessoryProps) {
        return (
          <PressableIcon
            icon={isAuthPasswordHidden ? "view" : "hidden"}
            color={colors.palette.neutral800}
            containerStyle={props.style}
            size={20}
            onPress={() => setIsAuthPasswordHidden(!isAuthPasswordHidden)}
          />
        );
      },
    [isAuthPasswordHidden, colors.palette.neutral800]
  );

  return (
    <Screen
      preset="auto"
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["bottom"]}
    >
      <Text
        testID="login-heading"
        tx="loginScreen:logIn"
        preset="heading"
        style={themed($logIn)}
      />
      <Text
        tx="loginScreen:enterDetails"
        preset="subheading"
        style={themed($enterDetails)}
      />

      <Text tx="loginScreen:toRegister" style={themed($loginText)} />
      <Text
        text="Register"
        style={[themed($loginText), themed($loginLink)]}
        onPress={register}
      />

      {/* Show server connection errors */}
      {error && (
        <Text
          text={error}
          size="sm"
          weight="light"
          style={[themed($hint), { color: colors.error }]}
        />
      )}

      <TextField
        value={authEmail}
        onChangeText={setAuthEmail}
        containerStyle={themed($textField)}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        labelTx="loginScreen:emailFieldLabel"
        placeholderTx="loginScreen:emailFieldPlaceholder"
        helper={emailValidationError}
        status={emailValidationError ? "error" : undefined}
        onSubmitEditing={() => authPasswordInput.current?.focus()}
        editable={!isLoading}
      />

      <TextField
        ref={authPasswordInput}
        value={authPassword}
        onChangeText={setAuthPassword}
        containerStyle={themed($textField)}
        autoCapitalize="none"
        autoComplete="password"
        autoCorrect={false}
        secureTextEntry={isAuthPasswordHidden}
        labelTx="loginScreen:passwordFieldLabel"
        placeholderTx="loginScreen:passwordFieldPlaceholder"
        helper={passwordValidationError}
        status={passwordValidationError ? "error" : undefined}
        onSubmitEditing={handleLogin}
        RightAccessory={PasswordRightAccessory}
        editable={!isLoading}
      />

      <Text
          text="Forgot Password?"
          style={$forgotPasswordText}
          onPress={forgetPassword}
        />

      <Button
        testID="login-button"
        tx={isLoading ? "common:loading" : "loginScreen:tapToLogIn"}
        text={isLoading ? "Signing in..." : undefined}
        style={themed($tapButton)}
        preset="reversed"
        onPress={handleLogin}
        disabled={isLoading || hasValidationErrors}
      />

      {/* Optional: Add loading indicator */}
      {isLoading && (
        <Text 
          text="Connecting to server..." 
          style={[themed($hint), { textAlign: "center" }]} 
        />
      )}
    </Screen>
  );
};

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.xxl,
  paddingHorizontal: spacing.lg,
});

const $logIn: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
});

const $enterDetails: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
});

const $hint: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.tint,
  marginBottom: spacing.md,
});

const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
});

const $tapButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
});

const $loginText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  textAlign: "center",
});

const $loginLink: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.tint,
  marginBottom: spacing.md,
});

const $forgotPasswordText: TextStyle = {
  textAlign: "center",
  marginBottom: 24,
  color: "#4870FF",
};