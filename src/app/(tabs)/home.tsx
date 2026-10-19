import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
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

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useApp();
  const styles = createStyles(colors);
  const [activeAction, setActiveAction] = useState<"menu" | "booking" | null>(
    null,
  );

  const activateAction = (action: "menu" | "booking") => {
    setActiveAction(action);
  };

  const clearAction = (action: "menu" | "booking") => {
    setActiveAction((current) => (current === action ? null : current));
  };

  const isMenuHovered = activeAction === "menu";
  const isBookingHovered = activeAction === "booking";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        title="The Tapas Pub & Grill"
        subtitle="Die Bult, Potchefstroom"
      />

      <View style={styles.pageContent}>
        <View style={styles.welcomeCard}>
          <Logo size={88} style={styles.logo} />
          <Text style={styles.eyebrow}>GOOD FOOD · GOOD COMPANY</Text>
          <Text style={styles.heroTitle}>Make yourself at home.</Text>
          <Text style={styles.heroDescription}>
            Come hungry, stay a while. Find your new favourite or book a table
            for your next get-together.
          </Text>
          <View style={styles.hoursPill}>
            <Ionicons name="time-outline" size={17} color={colors.success} />
            <Text style={styles.hoursText}>Bookings daily · 10:00–16:00</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>What are you in the mood for?</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Opens the food and drinks menu"
          onHoverIn={() => activateAction("menu")}
          onHoverOut={() => clearAction("menu")}
          onPressIn={() => activateAction("menu")}
          onPressOut={() => clearAction("menu")}
          style={[
            styles.actionCard,
            isMenuHovered && styles.actionCardHovered,
          ]}
          onPress={() => router.push("/(tabs)/menu")}
        >
          <View
            style={[
              styles.actionIcon,
              isMenuHovered ? styles.bookingIcon : styles.menuIcon,
            ]}
          >
            <Ionicons
              name="restaurant-outline"
              size={23}
              color={isMenuHovered ? colors.textOnDark : colors.accent}
            />
          </View>
          <View style={styles.actionCopy}>
            <Text
              style={[
                styles.actionTitle,
                isMenuHovered && styles.bookingTitle,
              ]}
            >
              Explore the menu
            </Text>
            <Text
              style={[
                styles.actionDescription,
                isMenuHovered && styles.bookingDescription,
              ]}
            >
              Food, drinks, favourites and specials
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={21}
            color={isMenuHovered ? colors.textOnDark : colors.mutedLight}
          />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityHint="Opens the table booking form"
          onHoverIn={() => activateAction("booking")}
          onHoverOut={() => clearAction("booking")}
          onPressIn={() => activateAction("booking")}
          onPressOut={() => clearAction("booking")}
          style={[
            styles.actionCard,
            isBookingHovered && styles.actionCardHovered,
          ]}
          onPress={() => router.push("/(tabs)/booking")}
        >
          <View
            style={[
              styles.actionIcon,
              isBookingHovered ? styles.bookingIcon : styles.neutralActionIcon,
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={23}
              color={isBookingHovered ? colors.textOnDark : colors.secondary}
            />
          </View>
          <View style={styles.actionCopy}>
            <Text
              style={[
                styles.actionTitle,
                isBookingHovered && styles.bookingTitle,
              ]}
            >
              Book your table
            </Text>
            <Text
              style={[
                styles.actionDescription,
                isBookingHovered && styles.bookingDescription,
              ]}
            >
              Pick your time, floor and favourite table
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={21}
            color={isBookingHovered ? colors.textOnDark : colors.mutedLight}
          />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityHint="Learn more about The Tapas Pub & Grill"
          onPress={() => router.push("/(tabs)/about")}
          style={styles.aboutLink}
        >
          <Ionicons
            name="information-circle-outline"
            size={19}
            color={colors.accent}
          />
          <Text style={styles.aboutLinkText}>About Tapas</Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.mutedLight}
          />
        </Pressable>

        <View style={styles.footerNote}>
          <Ionicons name="location-outline" size={18} color={colors.accent} />
          <Text style={styles.footerText}>
            Your local spot in Die Bult, Potchefstroom
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useApp>["colors"]) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: layout.pageBottomPadding },
  pageContent: {
    width: "100%",
    maxWidth: layout.contentMaxWidth,
    alignSelf: "center",
    paddingHorizontal: layout.horizontalPadding,
  },
  welcomeCard: {
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
  },
  heroTitle: {
    color: colors.text,
    fontSize: 27,
    fontWeight: "800",
    lineHeight: 34,
    marginTop: 9,
    textAlign: "center",
  },
  heroDescription: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 9,
    maxWidth: 430,
    textAlign: "center",
  },
  hoursPill: {
    alignItems: "center",
    backgroundColor: colors.successBackground,
    borderRadius: 24,
    flexDirection: "row",
    gap: 7,
    marginTop: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  hoursText: { color: colors.success, fontSize: 12, fontWeight: "700" },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 26,
  },
  actionCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 13,
    marginBottom: 10,
    minHeight: 82,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  actionCardHovered: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  actionIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  menuIcon: { backgroundColor: colors.errorBackground },
  bookingIcon: { backgroundColor: "rgba(255,255,255,0.16)" },
  neutralActionIcon: { backgroundColor: colors.secondaryTint },
  actionCopy: { flex: 1 },
  actionTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  actionDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  bookingTitle: { color: colors.textOnDark, fontSize: 16, fontWeight: "700" },
  bookingDescription: {
    color: colors.secondaryLight,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  footerNote: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    marginTop: 18,
  },
  aboutLink: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 22,
    padding: 8,
  },
  aboutLinkText: { color: colors.text, fontSize: 14, fontWeight: "700" },
  footerText: { color: colors.muted, fontSize: 12 },
  });
}
