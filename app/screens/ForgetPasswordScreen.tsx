import React, { FC, useState } from "react";
import { observer } from "mobx-react-lite";
import { ViewStyle, TextStyle, View, Image, ImageStyle } from "react-native";
import type { AppStackScreenProps } from "@/navigators/AppNavigator"
import { Button, Screen, Text, TextField } from "@/components";


// Form validation
const emailValidator = (email: string): string | undefined => {
  if (!email.length) return "Please enter a valid email address";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid Email";
  return undefined;
};

const logo = require("@assets/images/logo.png");

interface ForgetPasswordScreenProps
  extends AppStackScreenProps<"ForgetPassword"> {}

export const ForgetPasswordScreen: FC<ForgetPasswordScreenProps> = observer(
  function ForgetPasswordScreen({ navigation }) {

    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState<string | undefined>();
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Handle reset password submission
    const resetPassword = async () => {
      setError(null);
      setMessage(null);

      // Validate email
      const emailValidationError = emailValidator(email);
      setEmailError(emailValidationError);

      if (emailValidationError) {
        return;
      }

      try {

       
      } catch (e) {
        const resetError = e as Error;
        setError(
          `Password reset failed: ${
            resetError.message || "Unknown error occurred"
          }`
        );
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
          />

          {error && <Text style={$errorText} text={error} />}
          {message && <Text style={$successText} text={message} />}

          <Button
            testID="reset-password-button"
            text="Request New Password"
            style={$resetButton}
            preset="reversed"
            onPress={resetPassword}
          />

          <Button
            testID="back-button"
            text="Back to Login"
            style={$backButton}
            preset="default"
            onPress={goBack}
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
