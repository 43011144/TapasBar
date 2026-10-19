import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ScreenHeader from "../../components/ScreenHeader";
import { layout } from "../../constants/theme";
import { useApp } from "../../context/AppContext";

function formatPrice(amount: number) {
  return `R ${amount.toFixed(2)}`;
}

export default function OrderScreen() {
  const router = useRouter();
  const {
    colors,
    orderItems,
    orderTotal,
    addToOrder,
    decreaseOrderQuantity,
    removeFromOrder,
  } = useApp();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Your order" subtitle="Review your food and drinks" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {orderItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="bag-handle-outline"
                size={28}
                color={colors.secondary}
              />
            </View>
            <Text style={styles.emptyTitle}>Your order is empty</Text>
            <Text style={styles.description}>
              Browse the menu and add something delicious to get started.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(tabs)/menu")}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Explore the menu</Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={colors.textOnDark}
              />
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.intro}>
              {orderItems.reduce((count, item) => count + item.quantity, 0)}{" "}
              {orderItems.reduce((count, item) => count + item.quantity, 0) === 1
                ? "item"
                : "items"}{" "}
              in your order
            </Text>
            {orderItems.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.description}>
                    {formatPrice(item.price)} each
                  </Text>
                  <Text style={styles.lineTotal}>
                    {formatPrice(item.price * item.quantity)}
                  </Text>
                </View>
                <View style={styles.itemControls}>
                  <View style={styles.quantityControl}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove one ${item.name}`}
                      onPress={() => decreaseOrderQuantity(item.id)}
                      style={styles.quantityButton}
                    >
                      <Ionicons
                        name="remove"
                        size={18}
                        color={colors.text}
                      />
                    </Pressable>
                    <Text style={styles.quantity}>{item.quantity}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Add one ${item.name}`}
                      onPress={() => addToOrder(item)}
                      style={styles.quantityButton}
                    >
                      <Ionicons name="add" size={18} color={colors.text} />
                    </Pressable>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.name} from order`}
                    onPress={() => removeFromOrder(item.id)}
                    hitSlop={8}
                    style={styles.removeButton}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={17}
                      color={colors.error}
                    />
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ))}

            <View style={styles.summaryCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>{formatPrice(orderTotal)}</Text>
              </View>
              <Text style={styles.description}>
                Prices are shown in South African Rand.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/(tabs)/payment")}
                style={styles.primaryButton}
              >
                <Ionicons
                  name="card-outline"
                  size={19}
                  color={colors.textOnDark}
                />
                <Text style={styles.primaryButtonText}>Continue to card payment</Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={colors.textOnDark}
                />
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useApp>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      alignSelf: "center",
      maxWidth: layout.contentMaxWidth,
      paddingBottom: layout.pageBottomPadding,
      paddingHorizontal: layout.horizontalPadding,
      paddingTop: 18,
      width: "100%",
    },
    intro: { color: colors.muted, fontSize: 14, marginBottom: 12 },
    emptyCard: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 17,
      borderWidth: 1,
      marginTop: 12,
      padding: 25,
    },
    emptyIcon: {
      alignItems: "center",
      backgroundColor: colors.secondaryTint,
      borderRadius: 28,
      height: 56,
      justifyContent: "center",
      width: 56,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "800",
      marginTop: 14,
    },
    description: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5 },
    itemCard: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      marginBottom: 10,
      padding: 14,
    },
    itemInfo: { flex: 1 },
    itemName: { color: colors.text, fontSize: 15, fontWeight: "700" },
    lineTotal: { color: colors.accent, fontSize: 14, fontWeight: "800", marginTop: 8 },
    itemControls: { alignItems: "flex-end", gap: 10 },
    quantityControl: {
      alignItems: "center",
      borderColor: colors.border,
      borderRadius: 10,
      borderWidth: 1,
      flexDirection: "row",
      gap: 4,
      padding: 3,
    },
    quantityButton: {
      alignItems: "center",
      borderRadius: 7,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    quantity: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
      minWidth: 22,
      textAlign: "center",
    },
    removeButton: { alignItems: "center", flexDirection: "row", gap: 4 },
    removeText: { color: colors.error, fontSize: 12, fontWeight: "600" },
    summaryCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 15,
      borderWidth: 1,
      marginTop: 8,
      padding: 16,
    },
    totalRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    totalLabel: { color: colors.text, fontSize: 17, fontWeight: "700" },
    totalAmount: { color: colors.text, fontSize: 22, fontWeight: "800" },
    primaryButton: {
      alignItems: "center",
      backgroundColor: colors.secondary,
      borderRadius: 11,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      marginTop: 17,
      minHeight: 49,
      paddingHorizontal: 12,
    },
    primaryButtonText: {
      color: colors.textOnDark,
      flex: 1,
      fontSize: 14,
      fontWeight: "700",
      textAlign: "center",
    },
  });
}
