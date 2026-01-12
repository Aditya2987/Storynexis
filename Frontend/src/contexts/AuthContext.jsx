import { createContext, useContext, useEffect, useState } from 'react';
import { auth, signUp, signIn, signInWithGoogle, logOut, onAuthChange } from '../firebase/auth';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup = async (email, password, displayName) => {
    try {
      setError(null);
      const user = await signUp(email, password, displayName);
      return user;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const user = await signIn(email, password);
      return user;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      setError(null);
      const user = await signInWithGoogle();
      return user;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await logOut();
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const getIdToken = async () => {
    if (user) {
      return await user.getIdToken();
    }
    return null;
  };

  const value = {
    user,
    loading,
    error,
    signup,
    login,
    loginWithGoogle,
    logout,
    getIdToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
