import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Logo from "../../components/Logo";
import ScreenHeader from "../../components/ScreenHeader";
import { layout } from "../../constants/theme";
import { useApp } from "../../context/AppContext";

export default function AboutScreen() {
  const router = useRouter();
  const { colors } = useApp();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        title="About Tapas"
        subtitle="The Tapas Pub & Grill · Die Bult"
      />
      <View style={styles.pageContent}>
        <View style={styles.heroCard}>
          <Logo size={104} style={styles.logo} />
          <Text style={styles.eyebrow}>GOOD FOOD · GOOD COMPANY</Text>
          <Text style={styles.heroTitle}>Make yourself at home.</Text>
          <Text style={styles.heroCopy}>
            Welcome to The Tapas Pub & Grill, your local spot in Die Bult,
            Potchefstroom. Come hungry, stay a while, and enjoy good food and
            good company.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>A little about us</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="restaurant-outline"
                size={21}
                color={colors.accent}
              />
            </View>
            <View style={styles.infoCopy}>
              <Text style={styles.infoTitle}>Food and drinks</Text>
              <Text style={styles.bodyCopy}>
                Explore a menu of meals, favourites, specials, and drinks.
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="location-outline"
                size={21}
                color={colors.accent}
              />
            </View>
            <View style={styles.infoCopy}>
              <Text style={styles.infoTitle}>Find us</Text>
              <Text style={styles.bodyCopy}>Die Bult, Potchefstroom</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="time-outline"
                size={21}
                color={colors.success}
              />
            </View>
            <View style={styles.infoCopy}>
              <Text style={styles.infoTitle}>Booking hours</Text>
              <Text style={styles.bodyCopy}>
                Reservations daily from 10:00 to 16:00.
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Come visit</Text>
        <Text style={styles.visitCopy}>
          Browse the menu or book a table for your next get-together. We look
          forward to welcoming you.
        </Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(tabs)/menu")}
            style={styles.secondaryButton}
          >
            <Ionicons
              name="restaurant-outline"
              size={18}
              color={colors.accent}
            />
            <Text style={styles.secondaryButtonText}>Explore menu</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(tabs)/booking")}
            style={styles.primaryButton}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={colors.textOnDark}
            />
            <Text style={styles.primaryButtonText}>Book a table</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useApp>["colors"]) {
  return StyleSheet.create({
    container: { backgroundColor: colors.background, flex: 1 },
    content: { paddingBottom: layout.pageBottomPadding },
    pageContent: {
      alignSelf: "center",
      maxWidth: layout.contentMaxWidth,
      paddingHorizontal: layout.horizontalPadding,
      width: "100%",
    },
    heroCard: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      marginTop: 20,
      paddingHorizontal: 22,
      paddingVertical: 24,
    },
    logo: { marginBottom: 16 },
    eyebrow: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.4,
      textAlign: "center",
    },
    heroTitle: {
      color: colors.text,
      fontSize: 25,
      fontWeight: "800",
      marginTop: 9,
      textAlign: "center",
    },
    heroCopy: {
      color: colors.muted,
      fontSize: 15,
      lineHeight: 23,
      marginTop: 9,
      maxWidth: 450,
      textAlign: "center",
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 19,
      fontWeight: "800",
      marginBottom: 11,
      marginTop: 25,
    },
    infoCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: 15,
    },
    infoRow: { alignItems: "center", flexDirection: "row", gap: 12, paddingVertical: 15 },
    infoIcon: {
      alignItems: "center",
      backgroundColor: colors.secondaryTint,
      borderRadius: 11,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    infoCopy: { flex: 1 },
    infoTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
    bodyCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
    divider: { backgroundColor: colors.border, height: 1 },
    visitCopy: { color: colors.muted, fontSize: 14, lineHeight: 21 },
    actions: { flexDirection: "row", gap: 10, marginTop: 16 },
    primaryButton: {
      alignItems: "center",
      backgroundColor: colors.secondary,
      borderRadius: 11,
      flex: 1,
      flexDirection: "row",
      gap: 7,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: 8,
    },
    primaryButtonText: { color: colors.textOnDark, fontSize: 13, fontWeight: "700" },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 11,
      borderWidth: 1,
      flex: 1,
      flexDirection: "row",
      gap: 7,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: 8,
    },
    secondaryButtonText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  });
}
