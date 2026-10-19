import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import Logo from "../components/Logo";
import ScreenHeader from "../components/ScreenHeader";
import { useAuth } from "../context/AuthContext";
import {
  getManagerSetupStatus,
  type UserRole,
} from "../services/authService";
import { colors, layout } from "../constants/theme";
import {
  normalizeEmailAddress,
  validateEmailAddress,
  validatePassword,
} from "../utils/validation";

export default function AuthScreen() {
  const router = useRouter();
  const {
    user,
    isLoading,
    initializationError,
    signIn,
    signUp,
    createFirstManager,
  } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isFirstManagerSetup, setIsFirstManagerSetup] = useState(false);
  const [role, setRole] = useState<UserRole>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [managerSetupAvailable, setManagerSetupAvailable] = useState(false);
  const [managerSetupConfigured, setManagerSetupConfigured] = useState(false);
  const [managerSetupError, setManagerSetupError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/(tabs)/home");
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    if (role !== "manager") {
      return;
    }
    let isCurrent = true;
    void getManagerSetupStatus()
      .then((status) => {
        if (!isCurrent) return;
        setManagerSetupAvailable(status.available);
        setManagerSetupConfigured(status.configured);
        setManagerSetupError("");
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        setManagerSetupError(
          error instanceof Error
            ? error.message
            : "Could not check first-manager setup.",
        );
      });
    return () => {
      isCurrent = false;
    };
  }, [role]);

  const handleSubmit = async () => {
    const emailError = validateEmailAddress(email);
    if (emailError) {
      setFeedback({ kind: "error", message: emailError });
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setFeedback({ kind: "error", message: passwordError });
      return;
    }
    if (
      isFirstManagerSetup &&
      !/^[A-Za-z0-9_-]{32,128}$/.test(setupCode.trim())
    ) {
      setFeedback({
        kind: "error",
        message: "Enter the valid one-time manager setup code.",
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      if (isFirstManagerSetup) {
        await createFirstManager({
          email: normalizeEmailAddress(email),
          password,
          setupCode: setupCode.trim(),
        });
        router.replace("/(tabs)/home");
        return;
      }
      if (isLogin) {
        await signIn({ email: normalizeEmailAddress(email), password }, role);
        router.replace("/(tabs)/home");
        return;
      }

      await signUp({ email: normalizeEmailAddress(email), password });
      router.replace("/(tabs)/home");
    } catch (error) {
      setFeedback({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not sign in. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="The Tapas Pub & Grill"
          subtitle="Die Bult, Potchefstroom"
        />
        <View style={styles.pageContent}>
          <View style={styles.welcome}>
            <Logo size={92} />
            <Text style={styles.eyebrow}>GOOD FOOD · GOOD COMPANY</Text>
            <Text style={styles.title}>
              {isLogin ? "Welcome back." : "Join us at Tapas."}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin
                ? "Sign in to your account, or continue as a guest."
                : "Create an account for your next visit."}
            </Text>
          </View>

          <View style={styles.formCard}>
            {isLogin && (
              <>
                <Text style={styles.fieldLabel}>Sign in as</Text>
                <View style={styles.roleOptions}>
                  {(["customer", "staff", "manager"] as const).map((item) => (
                    <TouchableOpacity
                      key={item}
                      accessibilityRole="button"
                      accessibilityState={{ selected: role === item }}
                      onPress={() => {
                        setRole(item);
                        setIsFirstManagerSetup(false);
                        setSetupCode("");
                        setFeedback(null);
                      }}
                      style={[
                        styles.roleOption,
                        role === item && styles.roleOptionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleText,
                          role === item && styles.roleTextActive,
                        ]}
                      >
                        {item === "customer"
                          ? "Customer"
                          : item === "staff"
                            ? "Staff"
                            : "Manager"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {role === "manager" && !isFirstManagerSetup && (
                  <Text style={styles.roleHint}>
                    {managerSetupError ||
                      (!managerSetupConfigured
                        ? "First-time setup must be enabled by the server administrator."
                        : managerSetupAvailable
                          ? "No manager account exists yet."
                          : "Manager accounts are created by an existing manager.")}
                  </Text>
                )}
                {role === "manager" && !isFirstManagerSetup && managerSetupAvailable && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => {
                      setIsFirstManagerSetup(true);
                      setFeedback(null);
                    }}
                    style={styles.setupLinkButton}
                  >
                    <Text style={styles.modeLink}>Create the first manager account</Text>
                  </TouchableOpacity>
                )}
                {isFirstManagerSetup && (
                  <View style={styles.roleHint}>
                    <Text style={styles.setupHintText}>
                      One-time setup is protected by a private code configured
                      on the server. For this local setup, retrieve it in
                      PowerShell with: Select-String
                      {" "}
                      {"'"}^MANAGER_SETUP_CODE={"'"} .env
                    </Text>
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => {
                        setIsFirstManagerSetup(false);
                        setSetupCode("");
                        setFeedback(null);
                      }}
                    >
                      <Text style={styles.modeLink}>Back to manager login</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            <Text style={styles.fieldLabel}>
              {isLogin && role === "staff" ? "Staff email" : "Email address"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={
                isLogin && role === "staff"
                  ? "staff@example.com"
                  : "you@example.com"
              }
              placeholderTextColor={colors.mutedLight}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setFeedback(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              maxLength={254}
              accessibilityLabel={
                isLogin && role === "staff" ? "Staff email" : "Email address"
              }
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>
              {isFirstManagerSetup ? "Create password" : "Password"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="At least 8 characters"
              placeholderTextColor={colors.mutedLight}
              secureTextEntry
              maxLength={128}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setFeedback(null);
              }}
              autoCapitalize="none"
              autoComplete={isLogin && !isFirstManagerSetup ? "current-password" : "new-password"}
              textContentType={isLogin && !isFirstManagerSetup ? "password" : "newPassword"}
              accessibilityLabel="Password"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            {isFirstManagerSetup && (
              <>
                <Text style={styles.fieldLabel}>One-time setup code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter the private server setup code"
                  placeholderTextColor={colors.mutedLight}
                  value={setupCode}
                  onChangeText={(value) => {
                    setSetupCode(value);
                    setFeedback(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={128}
                  secureTextEntry
                  accessibilityLabel="One-time manager setup code"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </>
            )}

            {isLogin && !isFirstManagerSetup && (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => router.push("/forgot-password")}
              >
                <Text style={styles.modeLink}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {initializationError && (
              <Text accessibilityRole="alert" style={styles.feedbackErrorText}>
                {initializationError}
              </Text>
            )}

            {feedback && (
              <View
                accessibilityRole={
                  feedback.kind === "error" ? "alert" : undefined
                }
                style={[
                  styles.feedback,
                  feedback.kind === "success"
                    ? styles.feedbackSuccess
                    : styles.feedbackError,
                ]}
              >
                <Text
                  style={[
                    styles.feedbackText,
                    feedback.kind === "success"
                      ? styles.feedbackSuccessText
                      : styles.feedbackErrorText,
                  ]}
                >
                  {feedback.message}
                </Text>
              </View>
            )}

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ disabled: isSubmitting }}
              disabled={isSubmitting}
              style={[
                styles.primaryButton,
                isSubmitting && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting
                  ? "Please wait…"
                  : isFirstManagerSetup
                    ? "Create manager account"
                    : isLogin
                    ? "Log in"
                    : "Create account"}
              </Text>
              {!isSubmitting && (
                <Ionicons
                  name="arrow-forward"
                  size={19}
                  color={colors.textOnDark}
                />
              )}
            </TouchableOpacity>

            {isFirstManagerSetup && (
              <View style={styles.modeSwitch}>
                <Text style={styles.modeText}>First manager setup · One time</Text>
              </View>
            )}

            {role === "customer" && (
              <View style={styles.modeSwitch}>
                <Text style={styles.modeText}>
                  {isLogin ? "New to Tapas? " : "Already have an account? "}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => {
                    setIsLogin((login) => !login);
                    setFeedback(null);
                  }}
                >
                  <Text style={styles.modeLink}>
                    {isLogin ? "Create an account" : "Log in"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            style={styles.guestButton}
            onPress={() => router.replace("/(tabs)/home")}
          >
            <Text style={styles.guestButtonText}>Continue as a guest</Text>
          </TouchableOpacity>
          <Text style={styles.guestHint}>
            You can browse our menu and make a reservation without an account.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, paddingBottom: 28 },
  pageContent: {
    alignSelf: "center",
    maxWidth: layout.contentMaxWidth,
    paddingHorizontal: layout.horizontalPadding,
    width: "100%",
  },
  welcome: { alignItems: "center", paddingTop: 26, paddingBottom: 20 },
  eyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 15,
  },
  title: {
    color: colors.text,
    fontSize: 27,
    fontWeight: "800",
    marginTop: 7,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
    textAlign: "center",
  },
  formCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 5,
  },
  roleOptions: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  roleHint: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 9,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
    marginTop: -4,
    padding: 11,
  },
  setupHintText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  setupLinkButton: {
    alignSelf: "flex-start",
    marginBottom: 12,
    minHeight: 40,
    justifyContent: "center",
  },
  roleOption: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 4,
  },
  roleOptionActive: {
    backgroundColor: colors.charcoal,
    borderColor: colors.charcoal,
  },
  roleText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  roleTextActive: { color: colors.textOnDark },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 50,
    marginBottom: 14,
    paddingHorizontal: 13,
  },
  feedback: {
    borderRadius: 9,
    borderWidth: 1,
    marginBottom: 12,
    padding: 11,
  },
  feedbackSuccess: {
    backgroundColor: colors.successBackground,
    borderColor: colors.borderSuccess,
  },
  feedbackError: {
    backgroundColor: colors.errorBackground,
    borderColor: colors.borderError,
  },
  feedbackText: { fontSize: 13, lineHeight: 19 },
  feedbackSuccessText: { color: colors.success },
  feedbackErrorText: { color: colors.error },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 11,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 3,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  buttonDisabled: { opacity: 0.55 },
  primaryButtonText: { color: colors.textOnDark, fontSize: 16, fontWeight: "700" },
  modeSwitch: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 18,
  },
  modeText: { color: colors.muted, fontSize: 13 },
  modeLink: { color: colors.secondary, fontSize: 13, fontWeight: "700" },
  guestButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 14,
    minHeight: 50,
    backgroundColor: colors.surface,
  },
  guestButtonText: { color: colors.text, fontSize: 15, fontWeight: "700" },
  guestHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
    textAlign: "center",
  },
});
