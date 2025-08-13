// // fix this one

// import { FC } from "react"
// import { ViewStyle } from "react-native"
// import type { AppStackScreenProps } from "@/navigators/AppNavigator"
// import { Screen } from "@/components/Screen"
// import { Text } from "@/components/Text"
// // import { useNavigation } from "@react-navigation/native"

// interface ChooseAuthScreenProps extends AppStackScreenProps<"ChooseAuth"> {}

// export const ChooseAuthScreen: FC<ChooseAuthScreenProps> = () => {
//   // Pull in navigation via hook
//   // const navigation = useNavigation()
//   return (
//     <Screen style={$root} preset="scroll">
//       <Text text="chooseAuth" />
//     </Screen>
//   )
// }

// const $root: ViewStyle = {
//   flex: 1,
// }

import { FC, useEffect } from "react";
import { ViewStyle, View, Image, Alert } from "react-native";
import type { AppStackScreenProps } from "@/navigators/AppNavigator";

import { Button, Icon, Screen, Text } from "@/components";
import { useNavigation } from "@react-navigation/native";
import { useHeader } from "@/utils/useHeader";

import { useAppTheme } from "@/theme/context";
import type { ThemedStyle } from "@/theme/types";

import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { useAuth } from "@/context/AuthContext";

WebBrowser.maybeCompleteAuthSession();

interface ChooseAuthScreenProps extends AppStackScreenProps<"ChooseAuth"> {}

const logo = require("../../assets/images/app-icon-android-adaptive-foreground.png");

export const ChooseAuthScreen: FC<ChooseAuthScreenProps> = function ChooseAuthScreen(
  _props
) {
  // Use auth context instead of MobX store
  const { isAuthenticated, isLoading, error, googleSignIn } = useAuth();

  const navigation = useNavigation<any>();

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_IOS_GOOGLE_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_ANDROID_GOOGLE_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID, // optional if using web
    scopes: ["profile", "email"],
  });

  // Handle Google authentication response
  useEffect(() => {
    const handleGoogleResponse = async () => {
      if (!response) return;

      // Log the full response for debugging
      console.log("Google auth response:", response);

      // Handle different response types
      switch (response.type) {
        case "opened":
        case "locked":
          console.log(`Auth session ${response.type}`);
          return;

        case "error":
          console.error(
            "Google auth error:",
            response.errorCode,
            response.error
          );
          Alert.alert(
            "Authentication Error",
            response.error?.message ||
              "Failed to sign in with Google. Please try again."
          );
          return;

        case "cancel":
        case "dismiss":
          console.log("User cancelled the sign in");
          return;

        case "success":
          try {
            console.log("Processing successful Google auth response");
            const result = await googleSignIn(response as any);

            if (result.success) {
              console.log("Google sign-in successful!");
              navigation.navigate("Demo", { screen: "DemoCommunity" });
            } else {
              console.log("Google sign-in failed:", result.error);
              Alert.alert(
                "Login Failed",
                result.error || "An unexpected error occurred during sign-in."
              );
            }
          } catch (error) {
            console.error("Error during Google sign-in:", error);
            Alert.alert(
              "Error",
              error instanceof Error
                ? error.message
                : "An unexpected error occurred. Please try again."
            );
          }
          return;

        default:
          console.warn("Unhandled auth response type:", (response as any).type);
          return;
      }
    };

    handleGoogleResponse();
  }, [response, googleSignIn, navigation]);

  // Navigate to main app if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigation.navigate("Welcome");
    }
  }, [isAuthenticated, navigation]);

  const handleGoogleSignIn = async () => {
    try {
      await promptAsync();
    } catch (error) {
      console.error("Error starting Google sign-in:", error);
      Alert.alert("Error", "Failed to start Google sign-in");
    }
  };

  useHeader(
    {
      leftIcon: "back",
      title: "Welcome to Dooit",
      onLeftPress: () => navigation.navigate("Welcome"),
    },
    [navigation]
  );

  const {
    themed,
    theme: { colors },
  } = useAppTheme();

  return (
    <Screen
      style={$root}
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["bottom"]}
      preset="scroll"
    >
      <Image
        source={logo}
        resizeMode="contain"
        style={{ height: 200, width: 200, alignSelf: "center" }}
      />
      <View style={themed($buttonContainer)}>
        <Button
          text="Continue with Email"
          onPress={() => navigation.navigate("Login")}
          preset="reversed"
        />
        <Button
          text="Sign in with Google"
          style={{ gap: 8 }}
          onPress={handleGoogleSignIn}
          preset="reversed"
          disabled={!request || isLoading}
          LeftAccessory={(props) => (
            <Icon icon="google" {...props} size={20} color={colors.border} />
          )}
        />

        {/* Optional: Show loading state */}
        {isLoading && (
          <Text style={{ textAlign: "center", marginTop: 10 }}>
            Signing in...
          </Text>
        )}

        {/* Optional: Show error state */}
        {error && (
          <Text
            style={{ textAlign: "center", marginTop: 10, color: colors.error }}
          >
            {error}
          </Text>
        )}
      </View>
    </Screen>
  );
};

const $root: ViewStyle = {
  flex: 1,
};

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
});

const $buttonContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-around",
  gap: spacing.md,
});
