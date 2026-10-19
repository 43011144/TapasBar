import { StyleSheet, Text, View } from "react-native";
import { layout } from "../constants/theme";
import { useApp } from "../context/AppContext";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  const { colors } = useApp();
  const styles = createStyles(colors);
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useApp>["colors"]) {
  return StyleSheet.create({
  container: {
    backgroundColor: colors.charcoal,
    paddingTop: 48,
    paddingHorizontal: layout.horizontalPadding,
    paddingBottom: 18,
  },
  content: {
    width: "100%",
    maxWidth: layout.contentMaxWidth,
    alignSelf: "center",
  },
  title: { fontSize: 28, fontWeight: "bold", color: colors.textOnDark },
  subtitle: {
    fontSize: 15,
    color: colors.accent,
    marginTop: 5,
    fontWeight: "600",
  },
  });
}
