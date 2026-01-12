import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Animated Loading Component
const LoadingScreen = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background animated shapes */}
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        filter: 'blur(80px)',
        opacity: 0.4,
        top: '-50px',
        right: '-50px',
        animation: 'pulse 4s ease-in-out infinite'
      }}></div>
      <div style={{
        position: 'absolute',
        width: '250px',
        height: '250px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #f093fb, #f5576c)',
        filter: 'blur(80px)',
        opacity: 0.3,
        bottom: '-50px',
        left: '-50px',
        animation: 'pulse 4s ease-in-out infinite 1s'
      }}></div>

      {/* Loader Container */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2rem',
        zIndex: 1
      }}>
        {/* Animated Logo */}
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 20px 40px rgba(102, 126, 234, 0.4)',
          animation: 'logoFloat 2s ease-in-out infinite'
        }}>
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            style={{ width: '45px', height: '45px', color: 'white' }}
          >
            <path 
              d="M12 2L2 7L12 12L22 7L12 2Z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M2 17L12 22L22 17" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M2 12L12 17L22 12" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Brand Name */}
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          margin: 0
        }}>
          StoryNexis
        </h1>

        {/* Loading Spinner */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center'
        }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                animation: 'bounce 1.4s ease-in-out infinite',
                animationDelay: `${i * 0.16}s`
              }}
            />
          ))}
        </div>

        {/* Loading Text */}
        <p style={{
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '0.938rem',
          margin: 0,
          letterSpacing: '0.05em'
        }}>
          Loading your stories...
        </p>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.1); opacity: 0.6; }
        }
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(3deg); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return user ? children : <Navigate to="/login" />;
};

export default ProtectedRoute;
