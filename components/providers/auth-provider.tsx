"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import {
    onAuthStateChanged,
    User as FirebaseUser,
    signOut as firebaseSignOut,
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail
} from "firebase/auth";
import { auth } from "@/Firebase";
import { useRouter } from "next/navigation";
import { VerifyEmail } from "@/components/auth/verify-email";
import posthog from "posthog-js";
import { clearAuthData } from "@/lib/auth-storage";

const API_ENDPOINTS = {
    login: '/api/user/login',
    register: '/api/user/register',
    userProfile: '/api/user/profile',
};

// App-owned localStorage keys that must be wiped on logout. Firebase's own
// keys (firebase:authUser:*, firebase:host:*) are cleared by firebaseSignOut.
// PostHog state is handled via posthog.reset() below.
const APP_STORAGE_KEYS = [
    "zenith_registration_form_data",
];

interface UserProfile {
    uid: string;
    name: string;
    email: string;
    role: "user" | "admin" | "evaluator" | "frai";
    teamCode?: string;
    isLooking: boolean;
    profile_picture?: string;
    emailVerified?: boolean;
    [key: string]: any;
}

interface AuthContextType {
    user: UserProfile | null;
    // The raw Firebase user, exposed so consumers (like the dashboard) can
    // start their own authenticated fetches as soon as Firebase confirms the
    // session — without waiting for /api/user/profile to also come back.
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    login: (email: string, password: string, recaptchaToken?: string | null) => Promise<void>;
    register: (formData: FormData) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    getToken: () => Promise<string | null>;
    sendVerificationEmail: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    firebaseUser: null,
    loading: true,
    login: async () => { },
    register: async () => { },
    logout: async () => { },
    refreshUser: async () => { },
    getToken: async () => null,
    sendVerificationEmail: async () => { },
    resetPassword: async () => { },
});

import { useToast } from "@/hooks/use-toast";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { toast } = useToast();

    // forceRefresh: when true, force-reloads the Firebase user (network call)
    //   and force-refreshes the ID token (another network call). Use this only
    //   when something has actually changed server-side that we need to pick
    //   up — e.g. after email verification (emailVerified flag flipped) or an
    //   explicit "refresh" action.
    // Default false: skip both extra round-trips. The cached token is still
    //   valid (Firebase auto-refreshes ~5min before expiry) and emailVerified
    //   is persisted in the SDK's local store. Saves ~600-800ms per call.
    const fetchUserProfile = async (
        currentUser: FirebaseUser,
        forceRefresh: boolean = false,
    ) => {
        try {
            if (forceRefresh) {
                await currentUser.reload();
            }
            const token = await currentUser.getIdToken(forceRefresh);
            const response = await fetch(API_ENDPOINTS.userProfile, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                // Handle both direct object return and { success: true, data: ... } format
                const userData = data.success ? data.data : data;
                
                if (userData) {
                    setUser({
                        ...userData,
                        emailVerified: currentUser.emailVerified
                    });
                } else {
                    console.error("User data is empty");
                    setUser(null);
                }
            } else {
                console.error("Failed to fetch user profile:", response.status, response.statusText);
                // If 404, maybe they are registered in Firebase but not MongoDB yet (registration flow)
                setUser(null);
                if (response.status !== 404) {
                    toast({
                        variant: "destructive",
                        title: "Error fetching profile",
                        description: "Failed to load user profile. Please try refreshing the page."
                    });
                }
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            setUser(null);
            toast({
                variant: "destructive",
                title: "Connection Error",
                description: "Could not connect to the server. Please check your internet connection."
            });
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            // Publish the Firebase user IMMEDIATELY (before profile fetch) so
            // consumers can fire their own authenticated calls in parallel
            // with /api/user/profile instead of waiting in series.
            setFirebaseUser(fbUser);
            if (fbUser) {
                await fetchUserProfile(fbUser);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = useCallback(async (email: string, password: string, recaptchaToken?: string | null) => {
        try {
            setLoading(true); // Start loading immediately
            const response = await fetch(API_ENDPOINTS.login, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, recaptcha_token: recaptchaToken ?? null }),
            });

            const data = await response.json();

            if (!response.ok) {
                setLoading(false); // Stop loading on error
                if (response.status === 401) {
                    throw new Error(data.message || 'Invalid email or password.');
                } else if (response.status === 404) {
                    throw new Error(data.message || 'Account not found. Please register first.');
                } else if (response.status === 500) {
                    throw new Error(data.message || 'Server error. Please try again later.');
                } else {
                    throw new Error(data.message || 'Login failed. Please try again.');
                }
            }

            if (data.status !== 'success' && !data.token) {
                setLoading(false); // Stop loading on error
                if (!data.token) {
                    throw new Error(data.message || 'Login failed. Please try again.');
                }
            }

            await signInWithEmailAndPassword(auth, email, password);
            // Don't set loading to false here; let onAuthStateChanged handle it
        } catch (error) {
            console.error('Login error:', error);
            setLoading(false); // Ensure loading is stopped on error
            throw error;
        }
    }, []);

    const register = useCallback(async (formData: FormData) => {
        try {
            setLoading(true); // Start loading immediately
            const response = await fetch(API_ENDPOINTS.register, {
                method: 'POST',
                body: formData,
            });

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                // If response is not JSON, create a basic error
                setLoading(false);
                throw new Error(`Registration failed with status ${response.status}. Please try again.`);
            }

            if (!response.ok) {
                setLoading(false); // Stop loading on error
                // Extract error message from response - handle both message and error fields
                let errorMessage = data?.message || data?.error || `Registration failed with status ${response.status}. Please try again.`;
                if (data?.errors && typeof data.errors === 'object' && Object.keys(data.errors).length > 0) {
                    const errorKeys = Object.keys(data.errors);
                    if (errorKeys.length === 1) {
                        errorMessage = data.errors[errorKeys[0]];
                    }
                }
                
                const error = new Error(errorMessage);
                
                if (data?.errors && typeof data.errors === 'object') {
                    (error as any).fieldErrors = data.errors;
                }
                
                throw error;
            }

            if (data.message && data.message.toLowerCase().includes('success')) {
                // Now log the user in to Firebase with the credentials from formData
                const email = formData.get('email') as string;
                const password = formData.get('password') as string;

                if (email && password) {
                    await signInWithEmailAndPassword(auth, email, password);
                    // Don't set loading to false here; let onAuthStateChanged handle it
                } else {
                    if (data.user) {
                        // Handle case where we might not have password (e.g. if we change flow)
                        setLoading(false);
                    }
                }
                return;
            }

            setLoading(false);
            throw new Error(data.message || 'Registration failed. Please try again.');
        } catch (error) {
            console.error('Auth provider register error:', error);
            console.error('Auth provider register error type:', typeof error);
            console.error('Auth provider register error instanceof Error:', error instanceof Error);
            setLoading(false); // Ensure loading is stopped on error
            // Ensure we always throw an Error object
            if (error instanceof Error) {
                throw error;
            } else {
                throw new Error(String(error) || 'Registration failed. Please try again.');
            }
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            // 1. Firebase: drops its own session keys + token refresh state.
            await firebaseSignOut(auth);

            // 2. App-owned localStorage: clear PII left by the registration
            //    form draft + the legacy auth storage so the next person on
            //    this browser can't read it.
            if (typeof window !== "undefined") {
                try {
                    for (const key of APP_STORAGE_KEYS) {
                        window.localStorage.removeItem(key);
                    }
                    clearAuthData();
                } catch (storageError) {
                    // Storage may be unavailable (private mode, quota). Don't
                    // block sign-out on this — Firebase is already cleared.
                    console.error("logout: storage clear failed", storageError);
                }
            }

            // 3. PostHog: drop the distinct_id so the next user isn't
            //    attributed to this account.
            try {
                posthog.reset();
            } catch (phError) {
                console.error("logout: posthog.reset failed", phError);
            }

            // 4. Local React state.
            setUser(null);
            setFirebaseUser(null);

            router.push("/login");
        } catch (error) {
            console.error("Error signing out:", error);
        }
    }, [router]);

    const refreshUser = useCallback(async () => {
        if (auth.currentUser) {
            setLoading(true);
            // Force reload + token refresh — this is the explicit "I changed
            // something server-side, pick it up" path (e.g. after email
            // verification). fetchUserProfile handles both internally.
            await fetchUserProfile(auth.currentUser, true);
            setLoading(false);
        }
    }, []);

    const getToken = useCallback(async () => {
        if (auth.currentUser) {
            return await auth.currentUser.getIdToken();
        }
        return null;
    }, []);

    const sendVerificationEmail = useCallback(async () => {
        if (auth.currentUser) {
            // Include continueUrl to redirect to dashboard after verification
            const actionCodeSettings = {
                url: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/action?continueUrl=/dashboard`,
                handleCodeInApp: false,
            };
            await sendEmailVerification(auth.currentUser, actionCodeSettings);
        }
    }, []);

    const resetPassword = useCallback(async (email: string) => {
        try {
            const actionCodeSettings = {
                url: `${typeof window !== 'undefined' ? window.location.origin : ''}/login`,
                handleCodeInApp: false,
            };
            await sendPasswordResetEmail(auth, email, actionCodeSettings);
        } catch (error: any) {
            console.error("Error sending password reset email:", error);
            throw new Error(error.message || "Failed to send password reset email.");
        }
    }, []);

    // Show VerifyEmail component if logged in but email not verified (admin users skip verification)
    const showVerificationScreen = !loading && user && !user.emailVerified && user.role !== 'admin';

    const contextValue = useMemo(() => ({
        user,
        firebaseUser,
        loading,
        login,
        register,
        logout,
        refreshUser,
        getToken,
        sendVerificationEmail,
        resetPassword
    }), [user, firebaseUser, loading, login, register, logout, refreshUser, getToken, sendVerificationEmail, resetPassword]);

    return (
        <AuthContext.Provider value={contextValue}>
            {showVerificationScreen ? (
                <VerifyEmail
                    email={user.email}
                    onResend={sendVerificationEmail}
                    onLogout={logout}
                />
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
}

export const useAuthContext = () => useContext(AuthContext);
