import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AuthLayout } from './AuthLayout'
import { api, setToken } from '../api'

interface LoginProps {
  onBackToLanding: () => void
  onSwitchToSignup: () => void
  onLoginSuccess?: () => void
  mode?: 'login' | 'signup'
}

export const Login: React.FC<LoginProps> = ({ 
  onBackToLanding, 
  onSwitchToSignup, 
  onLoginSuccess,
  mode: initialMode = 'login'
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Sync state if prop changes
  useEffect(() => {
    setMode(initialMode)
    setError('')
  }, [initialMode])

  const handleGoogleLogin = () => {
    console.log("Google Login stub clicked")
  }

  const validateEmail = (val: string) => {
    return val.includes('@') && val.includes('.')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (mode === 'signup' && !displayName.trim()) {
      setError('Name is required')
      return
    }

    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    if (!password.trim() || password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)
    try {
      if (mode === 'signup') {
        const response = await api.auth.register({
          email,
          password,
          display_name: displayName
        });
        setToken(response.token);
        onLoginSuccess?.();
      } else {
        const response = await api.auth.login({
          email,
          password
        });
        setToken(response.token);
        onLoginSuccess?.();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const toggleMode = () => {
    const newMode = mode === 'login' ? 'signup' : 'login'
    setMode(newMode)
    setError('')
    onSwitchToSignup() // Inform parent App component to update its screen view
  }

  return (
    <motion.div
      key={`${mode}-form`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full flex flex-col items-center"
    >
      <AuthLayout
        title={mode === 'login' ? "Welcome back" : "Create account"}
        navActionLabel={mode === 'login' ? "Sign up" : "Log in"}
        onNavAction={toggleMode}
        onLogoClick={onBackToLanding}
      >
        {/* Google Login Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full bg-[#1A1A1A] hover:bg-[#222222] text-white font-sans font-semibold text-[15px] py-4 rounded-full flex items-center justify-center border border-transparent transition-all duration-200 active:scale-[0.98] select-none cursor-pointer mb-6"
        >
          <svg className="w-[18px] h-[18px] mr-3 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="w-full flex items-center justify-center mb-6">
          <span className="font-sans font-medium text-textSecondary text-[13px] uppercase tracking-wider select-none">
            Or
          </span>
        </div>

        {/* Real credentials Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 items-center">
          
          {/* Display Name Input (Only on Signup) */}
          {mode === 'signup' && (
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              disabled={isLoading}
              className="w-full bg-[#1A1A1A] hover:bg-[#202020] focus:bg-[#202020] text-white border border-transparent rounded-full px-6 py-4 font-sans text-[15px] focus:outline-none placeholder-white/30 transition-all duration-200"
            />
          )}

          {/* Email Input */}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            disabled={isLoading}
            className="w-full bg-[#1A1A1A] hover:bg-[#202020] focus:bg-[#202020] text-white border border-transparent rounded-full px-6 py-4 font-sans text-[15px] focus:outline-none placeholder-white/30 transition-all duration-200"
          />

          {/* Password Input */}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? "Create a password" : "Password"}
            disabled={isLoading}
            className="w-full bg-[#1A1A1A] hover:bg-[#202020] focus:bg-[#202020] text-white border border-transparent rounded-full px-6 py-4 font-sans text-[15px] focus:outline-none placeholder-white/30 transition-all duration-200"
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white hover:bg-[#F7F7F7] disabled:bg-white/40 text-black font-sans font-semibold text-[15px] py-4 rounded-full flex items-center justify-center transition-all duration-200 active:scale-[0.98] cursor-pointer shadow-sm mt-2 relative"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <span>{mode === 'login' ? 'Log in' : 'Create account'}</span>
            )}
          </button>

          {/* Error messages if any */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[#FF51CB] font-sans font-medium text-[13px] mt-2 self-start pl-4"
            >
              {error}
            </motion.div>
          )}
        </form>
      </AuthLayout>
    </motion.div>
  )
}
