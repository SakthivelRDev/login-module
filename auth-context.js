import React, { createContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Add a small delay to ensure Firebase is fully initialized
    const timer = setTimeout(() => {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          // Default role as admin when signed up
          setUser({ ...firebaseUser, role: 'admin' });
        } else {
          setUser(null);
        }
        setInitializing(false);
      }, (error) => {
        console.error("Auth state change error:", error);
        setInitializing(false);
      });

      return () => {
        clearTimeout(timer);
        unsubscribe();
      };
    }, 100); // Small delay to ensure Firebase is ready
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthContext.Provider value={{ user, initializing }}>
      {children}
    </AuthContext.Provider>
  );
};