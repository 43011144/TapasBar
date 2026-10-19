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
import { requestPasswordReset } from "../services/authService";
import {
  normalizeEmailAddress,
  validateEmailAddress,
} from "../utils/validation";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const validationError = validateEmailAddress(email);
    if (validationError) {
      setError(validationError);
      setMessage("");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      const response = await requestPasswordReset(
        normalizeEmailAddress(email),
      );
      setMessage(response.message);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not request a password reset.",
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
          title="Reset your password"
          subtitle="We will email you a secure, one-time reset link."
        />
        <View style={styles.content}>
          <Text style={styles.label}>Account email</Text>
          <TextInput
            accessibilityLabel="Account email"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            maxLength={254}
            onChangeText={(value) => {
              setEmail(value);
              setError("");
            }}
            placeholder="you@example.com"
            placeholderTextColor={colors.mutedLight}
            style={styles.input}
            textContentType="emailAddress"
            value={email}
          />
          {!!error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          {!!message && <Text style={styles.message}>{message}</Text>}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: isSubmitting }}
            disabled={isSubmitting}
            onPress={submit}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? "Sending…" : "Send reset link"}
            </Text>
          </TouchableOpacity>
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
});
