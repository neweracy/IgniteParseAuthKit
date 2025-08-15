import React, { FC, useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { ViewStyle, TextStyle, View, Image, ImageStyle } from "react-native";
import type { AppStackScreenProps } from "@/navigators/AppNavigator"
import { Button, Screen, Text, TextField } from "@/components";
import { useAuth } from "@/context/AuthContext";

const logo = require("@assets/images/logo.png");

interface ForgetPasswordScreenProps
  extends AppStackScreenProps<"ForgetPassword"> {}

export const ForgetPasswordScreen: FC<ForgetPasswordScreenProps> = observer(
  function ForgetPasswordScreen({ navigation }) {
    const { 
      requestPasswordReset, 
      validateEmail, 
      isLoading, 
      error, 
      resetPasswordMessage,
      clearResetMessage,
      setError
    } = useAuth();

    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState<string | undefined>();

    // Clear any existing messages when component mounts
    useEffect(() => {
      clearResetMessage();
      setError("");
    }, [clearResetMessage, setError]);

    // Handle reset password submission
    const resetPassword = async () => {
      // Clear previous errors
      setEmailError(undefined);

      // Validate email
      const emailValidationError = validateEmail(email);
      setEmailError(emailValidationError);

      if (emailValidationError) {
        return;
      }

      // Request password reset
      const result = await requestPasswordReset(email);
      
      if (result.success) {
        // Email is cleared after successful request
        setEmail("");
      }
    };

    const goBack = () => {
      navigation.goBack();
    };

    return (
      <Screen
        style={$root}
        preset="scroll"
        safeAreaEdges={["top", "bottom"]}
      >
        <View style={$topContainer}>
          <Image style={$logoImage} source={logo} resizeMode="contain" />
          <Text
            text="Forgot Password"
            size="xl"
            preset="heading"
            style={$welcomeText}
          />
          <Text
            text="Enter your email to receive a password reset link"
            preset="default"
            style={$termsText}
          />
        </View>

        <View style={$formContainer}>
          <TextField
            value={email}
            onChangeText={setEmail}
            containerStyle={$textField}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            label="Email"
            placeholder="Enter email"
            helper={emailError}
            status={emailError ? "error" : undefined}
            onSubmitEditing={resetPassword}
            editable={!isLoading}
          />

          {error && <Text style={$errorText} text={error} />}
          {resetPasswordMessage && (
            <Text style={$successText} text={resetPasswordMessage} />
          )}

          <Button
            testID="reset-password-button"
            text={isLoading ? "Sending..." : "Request New Password"}
            style={$resetButton}
            preset="reversed"
            onPress={resetPassword}
            disabled={isLoading}
          />

          <Button
            testID="back-button"
            text="Back to Login"
            style={$backButton}
            preset="default"
            onPress={goBack}
            disabled={isLoading}
          />
        </View>
      </Screen>
    );
  }
);

const $root: ViewStyle = {
  flex: 1,
  paddingHorizontal: 24,
};

const $topContainer: ViewStyle = {
  alignItems: "center",
  marginTop: 50,
  marginBottom: 20,
};

const $logoImage: ImageStyle = {
  height: 100,
  width: 200,
  marginBottom: 10,
};

const $welcomeText: TextStyle = {
  marginBottom: 10,
  textAlign: "center",
};

const $termsText: TextStyle = {
  marginBottom: 20,
  textAlign: "center",
};

const $formContainer: ViewStyle = {
  flex: 1,
};

const $textField: ViewStyle = {
  marginBottom: 16,
};

const $errorText: TextStyle = {
  color: "red",
  marginBottom: 16,
  textAlign: "center",
};

const $successText: TextStyle = {
  color: "green",
  marginBottom: 16,
  textAlign: "center",
};

const $resetButton: ViewStyle = {
  marginTop: 10,
  marginBottom: 16,
};

const $backButton: ViewStyle = {
  marginBottom: 16,
};