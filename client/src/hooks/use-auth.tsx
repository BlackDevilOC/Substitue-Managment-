import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation, UseMutationResult } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "../lib/queryClient";

interface User {
  id: number;
  username: string;
  isAdmin: boolean;
}

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<{ success: boolean }, Error, void>;
};

interface LoginData {
  username: string;
  password: string;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  // Default user for auto-login
  const defaultUser: User = {
    id: 1,
    username: "Rehan",
    isAdmin: true
  };

  // Load user from server API with auto-login
  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        // First try to get user from session
        const response = await fetch('/api/user', {
          method: 'GET',
          credentials: 'include',
        });
        
        if (response.ok) {
          const userData = await response.json();
          return userData as User;
        }
        
        // If not authenticated, perform auto-login
        const loginResponse = await fetch('/api/login', {
          method: 'POST',
          body: JSON.stringify({ username: "Rehan", password: "0315" }),
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        
        if (loginResponse.ok) {
          return await loginResponse.json() as User;
        }
        
        // If auto-login fails, use default user as fallback
        console.warn('Auto-login failed, using default user');
        return defaultUser;
      } catch (error) {
        console.error('Error in auth flow:', error);
        // In case of any errors, use default user
        return defaultUser;
      }
    },
    // Refresh auth state every 5 minutes to keep session alive
    refetchInterval: 5 * 60 * 1000,
    // Don't refetch on window focus - rely on interval only
    refetchOnWindowFocus: false,
    // Retry 3 times if authentication fails
    retry: 3,
    retryDelay: 1000,
  });

  const loginMutation = useMutation<User, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      const response = await fetch('/api/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Login failed');
      }
      
      return await response.json() as User;
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Welcome back!",
        description: `Logged in as ${user.username}`,
      });
      // Refetch user data to ensure we have the latest
      refetchUser();
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation<{ success: boolean }, Error, void>({
    mutationFn: async () => {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Logout failed');
      }
      
      return await response.json() as { success: boolean };
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message || "Failed to logout",
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}