import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, loginUser, registerUser, logoutUser, createUserDocument } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Create auth context
const AuthContext = createContext(null);

// Hook to use auth context
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  console.log("AuthProvider initializing...");
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Listen for auth state changes
  useEffect(() => {
    console.log("Auth state listener initializing...");
    let authStateChanged = false;
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      authStateChanged = true;
      console.log("Auth state changed:", user ? `User: ${user.uid}` : "No user");
      
      try {
        setCurrentUser(user);
        
        // If user exists (just logged in or page reload), create/get their Firestore document
        if (user) {
          console.log("Creating/updating user document in Firestore");
          await createUserDocument(user.uid, { email: user.email });
        }
      } catch (err) {
        console.error("Error in auth state change handler:", err);
        setError(err.message);
      } finally {
        console.log("Setting loading to false");
        setLoading(false);
      }
    }, (error) => {
      console.error("Auth state observer error:", error);
      setError(error.message);
      setLoading(false);
    });

    // Safety timeout - if auth state doesn't change in 5 seconds, set loading to false
    const timeoutId = setTimeout(() => {
      if (!authStateChanged) {
        console.log("Auth state change timeout - no response after 5 seconds");
        setLoading(false);
        setError("Authentication timed out. Please refresh the page.");
      }
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  // Sign up function
  const signup = async (email, password) => {
    setError('');
    try {
      console.log("Attempting to register user:", email);
      const userCredential = await registerUser(email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      console.log("Creating user document for new signup");
      await createUserDocument(user.uid, { email: user.email });
      
      return user;
    } catch (err) {
      console.error("Signup error:", err);
      setError(err.message);
      throw err;
    }
  };

  // Login function
  const login = async (email, password) => {
    setError('');
    try {
      console.log("Attempting to login user:", email);
      const userCredential = await loginUser(email, password);
      return userCredential.user;
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message);
      throw err;
    }
  };

  // Logout function
  const logout = async () => {
    setError('');
    try {
      console.log("Attempting to logout user");
      await logoutUser();
    } catch (err) {
      console.error("Logout error:", err);
      setError(err.message);
      throw err;
    }
  };

  const value = {
    currentUser,
    error,
    loading,
    signup,
    login,
    logout
  };

  console.log("AuthProvider rendering, loading:", loading);
  
  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          background: '#13111a',
          color: 'white',
          flexDirection: 'column'
        }}>
          <h2>Loading...</h2>
          {error && (
            <div style={{ 
              color: '#ff6b6b', 
              marginTop: '1rem', 
              padding: '1rem', 
              background: 'rgba(255, 107, 107, 0.1)', 
              borderRadius: '8px',
              maxWidth: '80%'
            }}>
              {error}
            </div>
          )}
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              backgroundColor: '#7b68ee',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </div>
      )}
    </AuthContext.Provider>
  );
}; 