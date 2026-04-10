import { useState, useCallback, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  type User as FirebaseUser,
} from "firebase/auth";
import { ref, set, get, update } from "firebase/database";
import { auth, db, isFirebaseConfigured } from "@/utils/firebase";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: "instructor" | "student";
  totalStudents: number;
}

function mapUser(fbUser: FirebaseUser, extra?: { totalStudents?: number }): User {
  return {
    uid: fbUser.uid,
    email: fbUser.email ?? "",
    displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
    role: "instructor",
    totalStudents: extra?.totalStudents ?? 0,
  };
}

function getFriendlyErrorMessage(error: any) {
  const code = error?.code;
  switch (code) {
    case "auth/email-already-in-use":
      return "Email already exists.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Invalid email or password.";
    case "auth/weak-password":
      return "Password is too weak. It must be at least 6 characters.";
    case "auth/invalid-email":
      return "The email address is not valid.";
    case "auth/operation-not-allowed":
      return "Authentication is currently disabled.";
    default:
      return error?.message || "An unexpected error occurred.";
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (fbUser: FirebaseUser) => {
    if (!db) return mapUser(fbUser);
    try {
      const snap = await get(ref(db, `instructors/${fbUser.uid}`));
      const data = snap.val();
      return mapUser(fbUser, { totalStudents: data?.totalStudents ?? 0 });
    } catch {
      return mapUser(fbUser);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setInitializing(false);
      setError("Firebase is not configured. Please add your Firebase API keys to the .env file.");
      return;
    }
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const u = await loadProfile(fbUser);
        setUser(u);
      } else {
        setUser(null);
      }
      setInitializing(false);
    });
    return unsub;
  }, [loadProfile]);

  const login = useCallback(async (email: string, password: string) => {
    if (!auth) { setError("Firebase is not configured."); return; }
    setLoading(true);
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const u = await loadProfile(cred.user);
      setUser(u);
    } catch (e: any) {
      setError(getFriendlyErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [loadProfile]);

  const signup = useCallback(async (email: string, password: string, displayName?: string, totalStudents?: number) => {
    if (!auth) { setError("Firebase is not configured."); return; }
    setLoading(true);
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const name = displayName || email.split("@")[0];
      await updateProfile(cred.user, { displayName: name });
      if (db) {
        await set(ref(db, `instructors/${cred.user.uid}`), {
          displayName: name,
          email,
          totalStudents: totalStudents ?? 0,
        });
      }
      setUser(mapUser(cred.user, { totalStudents: totalStudents ?? 0 }));
    } catch (e: any) {
      setError(getFriendlyErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (newName: string, newEmail: string, newTotalStudents: number) => {
    if (!auth?.currentUser || !user) return;
    setLoading(true);
    setError(null);
    try {
      if (newName !== user.displayName) {
        await updateProfile(auth.currentUser, { displayName: newName });
      }
      if (newEmail !== user.email) {
        await updateEmail(auth.currentUser, newEmail);
      }
      if (db) {
        await update(ref(db, `instructors/${user.uid}`), {
          displayName: newName,
          email: newEmail,
          totalStudents: newTotalStudents,
        });
      }
      setUser({ ...user, displayName: newName, email: newEmail, totalStudents: newTotalStudents });
    } catch (e: any) {
      setError(e.message ?? "Update failed.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const logout = useCallback(async () => {
    if (!auth) return;
    await signOut(auth);
    setUser(null);
  }, []);

  return { user, loading, error, login, signup, logout, updateSettings, isAuthenticated: !!user, initializing };
}
