import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useApp } from "../context/AppContext";

interface TapasItemProps {
  name: string;
  description?: string;
  price: number;
  quantity: number;
  onAdd: () => void;
}

export default function TapasItemCard({
  name,
  description,
  price,
  quantity,
  onAdd,
}: TapasItemProps) {
  const { colors } = useApp();
  const styles = createStyles(colors);
  return (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.itemName}>{name}</Text>
        {!!description && (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {description}
          </Text>
        )}
      </View>
      <View style={styles.itemActions}>
        <Text style={styles.itemPrice}>R {price.toFixed(2)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${name} to order`}
          onPress={onAdd}
          style={styles.addButton}
        >
          <Ionicons name="add" size={17} color={colors.textOnDark} />
          <Text style={styles.addButtonText}>
            {quantity > 0 ? `Add · ${quantity}` : "Add"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useApp>["colors"]) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 4,
    elevation: 2,
  },
  cardInfo: {
    flex: 1,
    paddingRight: 10,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: colors.muted,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.accent,
  },
  itemActions: { alignItems: "flex-end", gap: 9 },
  addButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 9,
    flexDirection: "row",
    gap: 3,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 76,
    paddingHorizontal: 8,
  },
  addButtonText: { color: colors.textOnDark, fontSize: 12, fontWeight: "700" },
  });
}
