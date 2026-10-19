import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import { colors, layout } from "../constants/theme";
import { resetPassword } from "../services/authService";
import { validatePassword } from "../utils/validation";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token: routeToken } = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(routeToken) ? routeToken[0] : routeToken;
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const passwordError = validatePassword(password);
    if (!token || !/^[A-Za-z0-9_-]{40,64}$/.test(token)) {
      setError("This reset link is invalid. Request a new one.");
      setMessage("");
      return;
    }
    if (passwordError) {
      setError(passwordError);
      setMessage("");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      setMessage("");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      const response = await resetPassword(token, password);
      setMessage(response.message);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not update your password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ScreenHeader
          title="Choose a new password"
          subtitle="Your reset link can only be used once."
        />
        <View style={styles.content}>
          <Text style={styles.label}>New password</Text>
          <TextInput
            accessibilityLabel="New password"
            autoCapitalize="none"
            autoComplete="new-password"
            maxLength={128}
            onChangeText={(value) => {
              setPassword(value);
              setError("");
              setMessage("");
            }}
            placeholder="At least 8 characters"
            placeholderTextColor={colors.mutedLight}
            secureTextEntry
            style={styles.input}
            textContentType="newPassword"
            value={password}
          />
          <Text style={styles.label}>Confirm new password</Text>
          <TextInput
            accessibilityLabel="Confirm new password"
            autoCapitalize="none"
            autoComplete="new-password"
            maxLength={128}
            onChangeText={(value) => {
              setConfirmation(value);
              setError("");
              setMessage("");
            }}
            placeholder="Enter the same password again"
            placeholderTextColor={colors.mutedLight}
            secureTextEntry
            style={styles.input}
            textContentType="newPassword"
            value={confirmation}
          />
          {!!error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          {!!message && <Text style={styles.message}>{message}</Text>}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: isSubmitting || !!message }}
            disabled={isSubmitting || !!message}
            onPress={submit}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? "Updating…" : "Update password"}
            </Text>
          </TouchableOpacity>
          {!!message && (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => router.replace("/")}
              style={styles.loginButton}
            >
              <Text style={styles.loginText}>Return to sign in</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background, flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 28 },
  content: {
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 24,
    maxWidth: layout.contentMaxWidth,
    padding: 18,
    width: "100%",
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 13,
  },
  error: { color: colors.error, fontSize: 13, marginTop: 10 },
  message: { color: colors.success, fontSize: 13, lineHeight: 19, marginTop: 10 },
  button: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 11,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 50,
  },
  buttonText: { color: colors.textOnDark, fontSize: 15, fontWeight: "700" },
  loginButton: { alignItems: "center", marginTop: 14, minHeight: 44, justifyContent: "center" },
  loginText: { color: colors.accent, fontSize: 14, fontWeight: "700" },
});
