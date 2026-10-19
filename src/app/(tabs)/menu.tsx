import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ScreenHeader from "../../components/ScreenHeader";
import TapasItemCard from "../../components/TapasItemCard";
import {
  DRINKS_MENU,
  FOOD_MENU,
  type MenuCategory,
} from "../../constants/menuData";
import { layout } from "../../constants/theme";
import { useApp } from "../../context/AppContext";

const menuTabs = ["Food", "Drinks"] as const;
type MenuTab = (typeof menuTabs)[number];

export default function MenuScreen() {
  const {
    colors,
    orderItems,
    addToOrder,
    menuOverrides,
    menuError,
    refreshMenuOverrides,
  } = useApp();
  const styles = createStyles(colors);
  const [activeTab, setActiveTab] = useState<MenuTab>("Food");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const currentMenu = (activeTab === "Food" ? FOOD_MENU : DRINKS_MENU).map(
    (category) => ({
      ...category,
      items: category.items
        .filter((item) => menuOverrides[item.id]?.isActive !== false)
        .map((item) => {
          const override = menuOverrides[item.id];
          return override
            ? {
                ...item,
                name: override.name,
                price: override.priceCents / 100,
              }
            : item;
        }),
    }),
  );
  const activeCategory: MenuCategory =
    currentMenu.find((category) => category.name === selectedCategory) ??
    currentMenu[0];

  const handleTabChange = (tab: MenuTab) => {
    setActiveTab(tab);
    setSelectedCategory(null);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Our Menu"
        subtitle="The Tapas Pub & Grill · Die Bult"
      />
      {!!menuError && (
        <View style={styles.menuError}>
          <Text style={styles.menuErrorText}>{menuError}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void refreshMenuOverrides()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Retry menu sync</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.menuSwitch}>
        {menuTabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <Pressable
              key={tab}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              style={[styles.menuTab, isActive && styles.menuTabActive]}
              onPress={() => handleTabChange(tab)}
            >
              <Ionicons
                name={tab === "Food" ? "fast-food-outline" : "beer-outline"}
                size={18}
                color={isActive ? colors.textOnDark : colors.muted}
              />
              <Text
                style={[
                  styles.menuTabText,
                  isActive && styles.menuTabTextActive,
                ]}
              >
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.categoryWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContainer}
        >
          {currentMenu.map((category) => {
            const isActive = activeCategory.name === category.name;
            return (
              <Pressable
                key={category.name}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                style={[
                  styles.categoryButton,
                  isActive && styles.categoryButtonActive,
                ]}
                onPress={() => setSelectedCategory(category.name)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    isActive && styles.categoryTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        key={`${activeTab}-${activeCategory.name}`}
        data={activeCategory.items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.categoryBanner}>
            <Image
              source={activeCategory.image}
              style={styles.bannerImage}
              resizeMode="cover"
              accessibilityLabel={`${activeCategory.name} menu`}
            />
            <View style={styles.bannerCopy}>
              <Text style={styles.bannerEyebrow}>
                {activeTab === "Food" ? "FROM THE KITCHEN" : "FROM THE BAR"}
              </Text>
              <Text style={styles.bannerTitle}>{activeCategory.name}</Text>
              <Text style={styles.bannerCount}>
                {activeCategory.items.length}{" "}
                {activeCategory.items.length === 1 ? "item" : "items"}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TapasItemCard
            name={item.name}
            description={item.description}
            price={item.price}
            quantity={
              orderItems.find((orderItem) => orderItem.id === item.id)
                ?.quantity ?? 0
            }
            onAdd={() => addToOrder(item)}
          />
        )}
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useApp>["colors"]) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  menuError: {
    alignSelf: "center",
    backgroundColor: colors.errorBackground,
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 12,
    maxWidth: layout.contentMaxWidth,
    padding: 12,
    width: "100%",
  },
  menuErrorText: { color: colors.error, fontSize: 13, lineHeight: 19 },
  retryButton: { alignSelf: "flex-start", marginTop: 8, minHeight: 36, justifyContent: "center" },
  retryText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  menuSwitch: {
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    maxWidth: layout.contentMaxWidth,
    padding: 5,
    width: "100%",
  },
  menuTab: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  menuTabActive: { backgroundColor: colors.charcoal },
  menuTabText: { color: colors.muted, fontSize: 14, fontWeight: "700" },
  menuTabTextActive: { color: colors.textOnDark },
  categoryWrapper: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    marginTop: 8,
  },
  categoryContainer: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: layout.horizontalPadding,
    paddingVertical: 12,
  },
  categoryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  categoryButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  categoryText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  categoryTextActive: { color: colors.textOnDark },
  listContainer: {
    alignSelf: "center",
    maxWidth: layout.contentMaxWidth,
    paddingBottom: layout.pageBottomPadding,
    paddingHorizontal: layout.horizontalPadding,
    paddingTop: 16,
    width: "100%",
  },
  categoryBanner: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    marginBottom: 16,
    overflow: "hidden",
    padding: 12,
  },
  bannerImage: {
    backgroundColor: colors.border,
    borderRadius: 11,
    height: 88,
    width: 96,
  },
  bannerCopy: { flex: 1 },
  bannerEyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  bannerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 5,
  },
  bannerCount: { color: colors.muted, fontSize: 12, marginTop: 5 },
  });
}
