import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Password strength checker
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { strength: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score <= 1) return { strength: 20, label: 'Weak', color: '#ef4444' };
    if (score === 2) return { strength: 40, label: 'Fair', color: '#f97316' };
    if (score === 3) return { strength: 60, label: 'Good', color: '#eab308' };
    if (score === 4) return { strength: 80, label: 'Strong', color: '#22c55e' };
    return { strength: 100, label: 'Excellent', color: '#10b981' };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    if (!acceptTerms) {
      return setError('Please accept the terms and conditions');
    }

    setLoading(true);

    try {
      await signup(email, password, displayName);
      navigate('/profile');
    } catch (error) {
      setError(getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      await loginWithGoogle();
      navigate('/profile');
    } catch (error) {
      setError(getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (code) => {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'This email is already registered.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/operation-not-allowed':
        return 'Email/password accounts are not enabled.';
      case 'auth/weak-password':
        return 'Password is too weak.';
      default:
        return 'An error occurred. Please try again.';
    }
  };

  return (
    <div className="auth-container">
      {/* Left Panel - Feature Showcase (visible on desktop) */}
      <div className="auth-showcase">
        <div className="showcase-shapes">
          <div className="showcase-shape showcase-shape-1"></div>
          <div className="showcase-shape showcase-shape-2"></div>
        </div>
        <div className="showcase-content">
          <div className="showcase-logo">
            <div className="showcase-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="showcase-logo-text">StoryNexis</span>
          </div>
          
          <h1 className="showcase-headline">
            Start Your <span>Creative Journey</span>
          </h1>
          <p className="showcase-description">
            Join thousands of writers creating amazing stories with AI assistance. 
            Your next bestseller is just a few clicks away.
          </p>

          <div className="showcase-features">
            <div className="showcase-feature">
              <div className="feature-icon green">🚀</div>
              <div className="feature-content">
                <h4>Get Started Free</h4>
                <p>No credit card required to begin your journey</p>
              </div>
            </div>
            <div className="showcase-feature">
              <div className="feature-icon purple">🔒</div>
              <div className="feature-content">
                <h4>Your Stories, Your Privacy</h4>
                <p>All your work stays private and secure</p>
              </div>
            </div>
            <div className="showcase-feature">
              <div className="feature-icon pink">💡</div>
              <div className="feature-content">
                <h4>Unlimited Creativity</h4>
                <p>Generate as many stories as you want</p>
              </div>
            </div>
            <div className="showcase-feature">
              <div className="feature-icon blue">📱</div>
              <div className="feature-content">
                <h4>Access Anywhere</h4>
                <p>Write from any device, anytime</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="auth-form-panel">
        {/* Mobile background shapes */}
        <div className="auth-bg-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
        </div>

        <div className="auth-card signup-card">
          {/* Back to home */}
          <Link to="/" className="auth-back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to home
          </Link>

          {/* Logo/Brand */}
          <div className="auth-brand">
            <div className="auth-logo">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="auth-brand-name">StoryNexis</span>
          </div>

          <h2>Create Account</h2>
          <p className="auth-subtitle">Start your storytelling adventure today</p>

          {error && (
            <div className="auth-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className={`form-group ${focusedField === 'displayName' || displayName ? 'focused' : ''}`}>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onFocus={() => setFocusedField('displayName')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Your name"
                  required
                  disabled={loading}
                  autoComplete="name"
                />
                <label htmlFor="displayName">Full Name</label>
              </div>
            </div>

            <div className={`form-group ${focusedField === 'email' || email ? 'focused' : ''}`}>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                  autoComplete="email"
                />
                <label htmlFor="email">Email Address</label>
              </div>
            </div>

            <div className={`form-group ${focusedField === 'password' || password ? 'focused' : ''}`}>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
                <label htmlFor="password">Password</label>
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              {password && (
                <div className="password-strength">
                  <div className="strength-bar">
                    <div 
                      className="strength-fill" 
                      style={{ 
                        width: `${passwordStrength.strength}%`,
                        backgroundColor: passwordStrength.color
                      }}
                    ></div>
                  </div>
                  <span className="strength-label" style={{ color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}
            </div>

            <div className={`form-group ${focusedField === 'confirmPassword' || confirmPassword ? 'focused' : ''}`}>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4"/>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
                <label htmlFor="confirmPassword">Confirm Password</label>
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <span className="input-hint error">Passwords don't match</span>
              )}
              {confirmPassword && password === confirmPassword && (
                <span className="input-hint success">✓ Passwords match</span>
              )}
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                />
                <span className="checkbox-custom"></span>
                I agree to the <a href="#" className="terms-link">Terms</a> and <a href="#" className="terms-link">Privacy Policy</a>
              </label>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="btn-spinner"></span>
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="divider">
            <span>or continue with</span>
          </div>

          <button
            type="button"
            className="btn-google"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
            </svg>
            Continue with Google
          </button>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
