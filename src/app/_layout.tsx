import { Stack } from "expo-router";
import { AppProvider } from "../context/AppContext";
import { AuthProvider } from "../context/AuthContext";

export default function RootLayout() {
  return (
    <AppProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthProvider>
    </AppProvider>
  );
}
