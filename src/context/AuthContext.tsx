import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import {
  getCurrentUser,
  createFirstManager as requestCreateFirstManager,
  signIn as requestSignIn,
  signOut as requestSignOut,
  signUp as requestSignUp,
  type AuthUser,
  type Credentials,
  type UserRole,
} from "../services/authService";

const TOKEN_KEY = "tap-auth-session";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  initializationError: string | null;
  signIn: (credentials: Credentials, role: UserRole) => Promise<void>;
  signUp: (credentials: Credentials) => Promise<void>;
  createFirstManager: (
    credentials: Credentials & { setupCode: string },
  ) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function readToken() {
  if (Platform.OS === "web") {
    return globalThis.sessionStorage?.getItem(TOKEN_KEY) ?? null;
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function storeToken(token: string | null) {
  if (Platform.OS === "web") {
    if (token) {
      globalThis.sessionStorage?.setItem(TOKEN_KEY, token);
    } else {
      globalThis.sessionStorage?.removeItem(TOKEN_KEY);
    }
    return;
  }
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let isCurrent = true;
    const restoreSession = async () => {
      try {
        const storedToken = await readToken();
        if (!storedToken) {
          return;
        }
        const response = await getCurrentUser(storedToken);
        if (isCurrent) {
          setToken(storedToken);
          setUser(response.user);
        }
      } catch (error) {
        if (error instanceof Error && "status" in error && error.status === 401) {
          await storeToken(null);
        } else if (isCurrent) {
          setInitializationError(
            error instanceof Error
              ? error.message
              : "Could not restore your account session.",
          );
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };
    void restoreSession();
    return () => {
      isCurrent = false;
    };
  }, []);

  const acceptAuthResponse = useCallback(async (response: {
    token: string;
    user: AuthUser;
  }) => {
    await storeToken(response.token);
    setToken(response.token);
    setUser(response.user);
    setInitializationError(null);
  }, []);

  const signIn = useCallback(
    async (credentials: Credentials, role: UserRole) => {
      await acceptAuthResponse(await requestSignIn(credentials, role));
    },
    [acceptAuthResponse],
  );

  const signUp = useCallback(
    async (credentials: Credentials) => {
      await acceptAuthResponse(await requestSignUp(credentials));
    },
    [acceptAuthResponse],
  );

  const createFirstManager = useCallback(
    async (credentials: Credentials & { setupCode: string }) => {
      await acceptAuthResponse(await requestCreateFirstManager(credentials));
    },
    [acceptAuthResponse],
  );

  const signOut = useCallback(async () => {
    const currentToken = token;
    if (currentToken) {
      await requestSignOut(currentToken);
    }
    await storeToken(null);
    setUser(null);
    setToken(null);
  }, [token]);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      initializationError,
      signIn,
      signUp,
      createFirstManager,
      signOut,
    }),
    [
      createFirstManager,
      initializationError,
      isLoading,
      signIn,
      signOut,
      signUp,
      token,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
