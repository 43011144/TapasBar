import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ScreenHeader from "../../components/ScreenHeader";
import { layout } from "../../constants/theme";
import { useApp } from "../../context/AppContext";
import { createCheckout } from "../../services/orderService";
import {
  normalizeEmailAddress,
  validateEmailAddress,
} from "../../utils/validation";

function formatPrice(amount: number) {
  return `R ${amount.toFixed(2)}`;
}

export default function PaymentScreen() {
  const { colors, orderItems, orderTotal, addNotification } = useApp();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [customerEmail, setCustomerEmail] = useState("");
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCheckout = async () => {
    if (orderItems.length === 0) {
      setCheckoutNotice("Add at least one item before placing an order.");
      return;
    }
    const emailError = validateEmailAddress(customerEmail);
    if (emailError) {
      setCheckoutNotice(emailError);
      return;
    }
    const email = normalizeEmailAddress(customerEmail);

    setIsSubmitting(true);
    setCheckoutNotice(null);
    setCheckoutUrl(null);
    try {
      const checkout = await createCheckout(
        orderItems.map(({ id, name, price, quantity }) => ({
          id,
          name,
          price,
          quantity,
        })),
        email,
      );
      const confirmationMessage = checkout.emailSent
        ? `Order #${checkout.order.id} was received. The order confirmation was emailed to ${email}.`
        : `Order #${checkout.order.id} was received, but the confirmation email could not be sent.`;
      addNotification({
        title: "Order received",
        message: confirmationMessage,
      });
      setCheckoutUrl(checkout.checkout.redirectUrl);
      try {
        await Linking.openURL(checkout.checkout.redirectUrl);
        setCheckoutNotice(
          `${confirmationMessage} We’ll email you again when Yoco confirms payment.`,
        );
      } catch (error) {
        console.warn("Could not open Yoco checkout.", error);
        setCheckoutNotice(
          `${confirmationMessage} Tap “Continue to secure payment” to open Yoco checkout.`,
        );
      }
    } catch (error) {
      setCheckoutNotice(
        error instanceof Error ? error.message : "Could not start checkout.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Card payment" subtitle="Review and pay for your order" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Order summary</Text>
        {orderItems.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.bodyText}>Your order is empty.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {orderItems.map((item) => (
              <View key={item.id} style={styles.summaryRow}>
                <Text style={styles.bodyText}>
                  {item.quantity} × {item.name}
                </Text>
                <Text style={styles.bodyText}>
                  {formatPrice(item.price * item.quantity)}
                </Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>{formatPrice(orderTotal)}</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Order email and secure payment</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>
            We’ll send your order number here, then email you again after Yoco
            confirms your payment. Card details are entered securely on Yoco.
          </Text>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            accessibilityLabel="Order email address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            maxLength={254}
            onChangeText={(value) => {
              setCustomerEmail(value);
              setCheckoutNotice(null);
            }}
            placeholder="you@example.com"
            placeholderTextColor={colors.mutedLight}
            style={styles.input}
            value={customerEmail}
          />

          {checkoutNotice && (
            <Text
              accessibilityRole="alert"
              style={[
                styles.notice,
                checkoutUrl && styles.successNotice,
              ]}
            >
              {checkoutNotice}
            </Text>
          )}

          {checkoutUrl && !isSubmitting && (
            <Pressable
              accessibilityRole="link"
              onPress={() => Linking.openURL(checkoutUrl)}
              style={styles.continueButton}
            >
              <Text style={styles.continueButtonText}>
                Continue to secure payment
              </Text>
              <Ionicons
                name="open-outline"
                size={18}
                color={colors.textOnDark}
              />
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: orderItems.length === 0 || isSubmitting || Boolean(checkoutUrl),
            }}
            disabled={
              orderItems.length === 0 || isSubmitting || Boolean(checkoutUrl)
            }
            onPress={handleCheckout}
            style={[
              styles.payButton,
              (orderItems.length === 0 || isSubmitting || Boolean(checkoutUrl)) &&
                styles.disabledButton,
            ]}
          >
            <Ionicons name="lock-closed-outline" size={18} color={colors.textOnDark} />
            <Text style={styles.payButtonText}>
              {isSubmitting
                ? "Starting secure checkout…"
                : `Place order · ${formatPrice(orderTotal)}`}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useApp>["colors"]) {
  return StyleSheet.create({
    container: { backgroundColor: colors.background, flex: 1 },
    content: {
      alignSelf: "center",
      maxWidth: layout.contentMaxWidth,
      paddingBottom: layout.pageBottomPadding,
      paddingHorizontal: layout.horizontalPadding,
      paddingTop: 16,
      width: "100%",
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800",
      marginBottom: 10,
      marginTop: 21,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 15,
      borderWidth: 1,
      padding: 16,
    },
    summaryRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between",
      paddingVertical: 5,
    },
    bodyText: { color: colors.text, flexShrink: 1, fontSize: 13, lineHeight: 19 },
    divider: { backgroundColor: colors.border, height: 1, marginVertical: 10 },
    totalLabel: { color: colors.text, fontSize: 16, fontWeight: "700" },
    totalAmount: { color: colors.text, fontSize: 18, fontWeight: "800" },
    label: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 7,
      marginTop: 12,
    },
    input: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 10,
      borderWidth: 1,
      color: colors.text,
      fontSize: 15,
      minHeight: 47,
      paddingHorizontal: 12,
    },
    notice: {
      backgroundColor: colors.errorBackground,
      borderRadius: 9,
      color: colors.error,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 13,
      padding: 11,
    },
    successNotice: {
      backgroundColor: colors.successBackground,
      color: colors.success,
    },
    payButton: {
      alignItems: "center",
      backgroundColor: colors.secondary,
      borderRadius: 11,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      marginTop: 18,
      minHeight: 50,
      paddingHorizontal: 12,
    },
    payButtonText: { color: colors.textOnDark, fontSize: 14, fontWeight: "800" },
    continueButton: {
      alignItems: "center",
      backgroundColor: colors.accent,
      borderRadius: 11,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      marginTop: 13,
      minHeight: 50,
      paddingHorizontal: 12,
    },
    continueButtonText: {
      color: colors.textOnDark,
      fontSize: 14,
      fontWeight: "800",
    },
    disabledButton: { opacity: 0.5 },
  });
}
