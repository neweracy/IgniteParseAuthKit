import {
  FC,
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Alert, TextInput, TextStyle, ViewStyle } from "react-native";
import type { AppStackScreenProps } from "@/navigators/AppNavigator";
import {
  Button,
  PressableIcon,
  Screen,
  Text,
  TextField,
  TextFieldAccessoryProps,
} from "@/components";
import { useHeader } from "@/utils/useHeader";
import type { ThemedStyle } from "@/theme/types";
import { useAppTheme } from "@/theme/context";
import { useAuth } from "@/context/AuthContext";

interface RegisterScreenProps extends AppStackScreenProps<"Register"> {}

// Validation functions
const usernameValidator = (username: string): string | undefined => {
  if (!username.length) return "Please enter a username";
  if (username.length < 3) return "Username must be at least 3 characters";
  return undefined;
};

const passwordConfirmValidator = (password: string): string | undefined => {
  if (!password.length) return "Please confirm password";
  return undefined;
};

export const RegisterScreen: FC<RegisterScreenProps> = ({ navigation }) => {
  const authPasswordInput = useRef<TextInput>(null);
  const authPasswordConfirmInput = useRef<TextInput>(null);
  const usernameInput = useRef<TextInput>(null);

  // Local state
  const [username, setUsername] = useState("");
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState("");
  const [isAuthPasswordHidden, setIsAuthPasswordHidden] = useState(true);
  const [isPasswordConfirmHidden, setIsPasswordConfirmHidden] = useState(true);

  // Individual field errors
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [passwordConfirmError, setPasswordConfirmError] = useState<string | undefined>();
  const [usernameError, setUsernameError] = useState<string | undefined>();

  // Use auth context
  const {
    authEmail,
    authPassword,
    setAuthEmail,
    setAuthPassword,
    isLoading,
    error,
    signUp,
    resetAuthState,
    isAuthenticated,
    validateEmail,
    validatePassword
  } = useAuth();

  const {
    themed,
    theme: { colors },
  } = useAppTheme();

  // Navigate to authenticated area if signup successful
  useEffect(() => {
    if (isAuthenticated) {
      navigation.navigate("Demo");
    }
  }, [isAuthenticated, navigation]);

  // Password confirmation validation
  useEffect(() => {
    if (authPassword.length > 1 && authPasswordConfirm.length > 1) {
      if (authPassword !== authPasswordConfirm) {
        setPasswordConfirmError("Passwords do not match");
      } else {
        setPasswordConfirmError(undefined);
      }
    }
  }, [authPassword, authPasswordConfirm]);

  const goBack = () => {
    navigation.goBack();
    resetAuthState();
    setUsername("");
    setAuthPasswordConfirm("");
  };

  useHeader({
    title: "Sign Up",
    leftIcon: "back",
    onLeftPress: goBack,
  });

  const toLogin = () => {
    navigation.goBack();
    resetAuthState();
    setUsername("");
    setAuthPasswordConfirm("");
  };

  const handleRegister = async () => {
    try {
      // Reset error states
      setEmailError(undefined);
      setPasswordError(undefined);
      setPasswordConfirmError(undefined);
      setUsernameError(undefined);

      let hasErrors = false;

      // Validate all fields
      const emailValidationError = validateEmail(authEmail);
      if (emailValidationError) {
        setEmailError(emailValidationError);
        hasErrors = true;
      }

      const passwordValidationError = validatePassword(authPassword);
      if (passwordValidationError) {
        setPasswordError(passwordValidationError);
        hasErrors = true;
      }

      // Validate username
      const usernameValidationError = usernameValidator(username);
      if (usernameValidationError) {
        setUsernameError(usernameValidationError);
        hasErrors = true;
      }

      // Validate password confirmation
      const passwordConfirmValidationError = passwordConfirmValidator(authPasswordConfirm);
      if (passwordConfirmValidationError) {
        setPasswordConfirmError(passwordConfirmValidationError);
        hasErrors = true;
      }

      // Check password match
      if (authPassword !== authPasswordConfirm) {
        setPasswordConfirmError("Passwords do not match");
        hasErrors = true;
      }

      if (hasErrors) {
        Alert.alert(
          "Validation Error",
          "Please check your input and try again",
          [{ text: "OK", style: "cancel" }]
        );
        return;
      }

      console.log("All validations passed, proceeding with registration");

      // Attempt registration
      const result = await signUp(username);

      if (result.success) {
        console.log("Registration successful");
        
        // Reset form fields on success
        resetAuthState();
        setUsername("");
        setAuthPasswordConfirm("");

        Alert.alert("Success", "Registration completed successfully!", [
          { text: "OK" },
        ]);
      } else {
        // Registration failed - keep form fields populated for retry
        const errorMessage = result.error || "Registration failed. Please try again.";
        console.error("Registration failed:", errorMessage);

        Alert.alert("Registration Failed", errorMessage, [
          { text: "OK" },
        ]);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during registration";

      console.error("Registration error:", errorMessage);

      Alert.alert("Registration Error", errorMessage, [
        { text: "OK" },
      ]);
    }
  };

  // Create password toggle function
  const createPasswordToggle = useCallback(
    (isHidden: boolean, setIsHidden: (hidden: boolean) => void) =>
      function PasswordToggle(props: TextFieldAccessoryProps) {
        return (
          <PressableIcon
            icon={isHidden ? "view" : "hidden"}
            color={colors.palette.neutral800}
            containerStyle={props.style}
            size={20}
            onPress={() => setIsHidden(!isHidden)}
          />
        );
      },
    [colors.palette.neutral800]
  );

  // Memoized accessories for both password fields
  const PasswordRightAccessory = useMemo(
    () => createPasswordToggle(isAuthPasswordHidden, setIsAuthPasswordHidden),
    [isAuthPasswordHidden, createPasswordToggle]
  );

  const PasswordConfirmRightAccessory = useMemo(
    () => createPasswordToggle(isPasswordConfirmHidden, setIsPasswordConfirmHidden),
    [isPasswordConfirmHidden, createPasswordToggle]
  );

  return (
    <Screen
      style={$root}
      preset="auto"
      safeAreaEdges={["top", "bottom"]}
      contentContainerStyle={themed($screenContentContainer)}
    >
      <Text
        testID="register-heading"
        preset="heading"
        tx="signUpScreen:signUp"
        style={themed($signUp)}
      />
      <Text 
        preset="subheading" 
        tx="signUpScreen:enterDetails"
        style={themed($enterDetails)}
      />
      <Text
        tx="signUpScreen:ToLogIn"
        style={[themed($signUpText), { marginTop: 12 }]}
      />
      <Text
        text="Login"
        style={[themed($signUpLink), themed($signUpText)]}
        onPress={toLogin}
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
        helper={emailError}
        status={emailError ? "error" : undefined}
        onSubmitEditing={() => usernameInput.current?.focus()}
        editable={!isLoading}
      />

      {/* <TextField
        ref={usernameInput}
        value={username}
        onChangeText={setUsername}
        containerStyle={themed($textField)}
        autoCapitalize="none"
        autoComplete="username"
        autoCorrect={false}
        labelTx="signUpScreen:usernameFieldLabel"
        placeholderTx="signUpScreen:usernameFieldPlaceholder"
        helper={usernameError}
        status={usernameError ? "error" : undefined}
        onSubmitEditing={() => authPasswordInput.current?.focus()}
        editable={!isLoading}
      /> */}

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
        helper={passwordError}
        status={passwordError ? "error" : undefined}
        onSubmitEditing={() => authPasswordConfirmInput.current?.focus()}
        RightAccessory={PasswordRightAccessory}
        editable={!isLoading}
      />

      <TextField
        ref={authPasswordConfirmInput}
        value={authPasswordConfirm}
        onChangeText={setAuthPasswordConfirm}
        containerStyle={themed($textField)}
        autoCapitalize="none"
        autoComplete="password"
        autoCorrect={false}
        secureTextEntry={isPasswordConfirmHidden}
        labelTx="loginScreen:passwordFieldLabelConf"
        placeholderTx="loginScreen:passwordFieldPlaceholder"
        helper={passwordConfirmError}
        status={passwordConfirmError ? "error" : undefined}
        onSubmitEditing={handleRegister}
        RightAccessory={PasswordConfirmRightAccessory}
        editable={!isLoading}
      />

      <Button
        testID="register-button"
        text={isLoading ? "Creating Account..." : "Let's Go"}
        style={themed($tapButton)}
        preset="reversed"
        onPress={handleRegister}
        disabled={isLoading}
      />

      {isLoading && (
        <Text 
          text="Creating your account..." 
          style={[themed($hint), { textAlign: "center" }]} 
        />
      )}
    </Screen>
  );
};

const $root: ViewStyle = {
  flex: 1,
};

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.lg,
});

const $enterDetails: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
});

const $signUp: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
});

const $hint: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.tint,
  marginBottom: spacing.md,
});

const $signUpText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  textAlign: "center",
});

const $signUpLink: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.tint,
  marginBottom: spacing.md,
});

const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
});

const $tapButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
});