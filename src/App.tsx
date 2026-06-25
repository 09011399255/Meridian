import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Login } from './components/Login'
import { ChatInterface } from './components/ChatInterface'
import { isLoggedIn } from './api'

// Temporary view types for stub screens
type ScreenView = 'landing' | 'onboarding' | 'signup' | 'login'

function App() {
  const [view, setView] = useState<ScreenView>(isLoggedIn() ? 'onboarding' : 'landing')

  // Handlers for the interactive buttons
  const handleTryMeridian = () => {
    console.log("entering meridian onboarding")
    setView('signup')
  }

  const handleSignup = () => {
    console.log("signup flow")
    setView('signup')
  }

  const handleLogin = () => {
    console.log("login flow")
    setView('login')
  }

  const handleGoBack = () => {
    setView('landing')
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col justify-between text-white selection:bg-[#FF51CB] selection:text-black">

      <AnimatePresence mode="wait">
        {view === 'landing' ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col justify-between min-h-screen"
          >
            {/* 1. HEADER / NAVIGATION */}
            <header className="w-full flex items-center justify-between px-5 py-6 md:px-8 md:py-8">
              {/* Logo Lockup */}
              <div className="flex items-center gap-[10px] select-none group cursor-pointer" onClick={() => window.location.reload()}>
                {/* Geometric N Glyph SVG */}
                <svg
                  viewBox="0 22 112 86"
                  className="w-[28px] h-[21.5px] md:w-[36px] md:h-[27.6px] shrink-0 transform transition-transform duration-500 group-hover:scale-105"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M111.967 22.4375H95.5009C91.4918 22.4375 87.8408 24.8 86.1942 28.451L79.4647 43.2701C76.1 50.6439 69.5137 55.9416 61.782 57.7313C59.1332 58.304 56.6276 56.2995 56.6276 53.6507V22.4375H51.3299C46.3186 22.4375 41.3789 23.8693 37.0835 26.5181C32.7882 29.1669 29.3518 32.9612 27.1326 37.4714L18.1122 55.512C16.6804 58.3756 13.8168 60.3085 10.5953 60.4517L0 60.8813L0.0715898 107.343H16.5373C20.5463 107.343 24.1974 104.981 25.8439 101.33L32.5018 86.5104C35.8665 79.1367 42.4528 73.839 50.1845 72.0493C52.8333 71.4766 55.339 73.4811 55.339 76.1299V107.343H60.6366C65.6479 107.343 70.5876 105.911 74.883 103.262C79.1784 100.614 82.6147 96.8194 84.834 92.3092L93.7827 74.2686C95.2145 71.405 98.0781 69.472 101.3 69.3289L111.895 68.8993L111.967 22.4375Z"
                    fill="#F7F7F7"
                  />
                </svg>
                {/* Wordmark text */}
                <span className="font-sans font-semibold text-[18px] md:text-[23px] tracking-tight text-white lowercase leading-none">
                  north<span className="text-[#F7F7F7]">.</span>
                </span>
              </div>

              {/* Log In Button (smaller/compact pill) */}
              <button
                onClick={handleLogin}
                className="bg-[#1A1A1A] hover:bg-[#262626] text-[#F7F7F7] font-sans font-medium text-[13px] md:text-[14px] px-[20px] py-[10px] rounded-full border border-transparent transition-all duration-200 active:scale-95 select-none"
              >
                Log in
              </button>
            </header>

            {/* 2. HERO CONTENT AREA */}
            <main className="w-full flex-1 flex flex-col justify-center items-center px-6 py-12 md:py-24 text-center">
              
              {/* Wordmark (Animate-In) */}
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                className="w-full max-w-5xl flex justify-center"
              >
                <h1 className="select-none text-center leading-[1.05] tracking-[-0.03em] pb-3" style={{ fontSize: 'clamp(3.5rem, 9.5vw, 8.5rem)' }}>
                  <span className="meridian-gradient-text meridian-wordmark">
                    Meridian
                  </span>
                </h1>
              </motion.div>

              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                className="font-sans font-medium text-textSecondary text-[15px] sm:text-[18px] md:text-[21px] leading-[1.4] max-w-[620px] mt-6 md:mt-8 px-4"
              >
                AI is reshaping every career.
                <br className="hidden sm:inline" /> Meridian tells you exactly where yours goes next.
              </motion.p>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.45 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mt-8 md:mt-10 w-full max-w-[420px] sm:max-w-none px-4"
              >
                {/* Primary Button */}
                <motion.button
                  onClick={handleTryMeridian}
                  whileHover={{ scale: 1.02, filter: 'brightness(1.05)' }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="w-full sm:w-auto bg-[#F7F7F7] text-black font-sans font-semibold text-[15px] md:text-[16px] px-8 py-4 rounded-full flex items-center justify-center gap-2 select-none cursor-pointer shadow-sm hover:shadow-md"
                >
                  Try Meridian
                  <span className="text-[16px] font-light transform transition-transform duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]">↗</span>
                </motion.button>

                {/* Secondary Button */}
                <motion.button
                  onClick={handleSignup}
                  whileHover={{ scale: 1.02, backgroundColor: '#262626' }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="w-full sm:w-auto bg-[#1A1A1A] text-white font-sans font-semibold text-[15px] md:text-[16px] px-8 py-4 rounded-full select-none cursor-pointer border border-transparent"
                >
                  Signup
                </motion.button>
              </motion.div>
            </main>

            {/* 3. GENERATIVE BOTTOM NEGATIVE SPACE */}
            <div className="w-full py-10 md:py-16" />
          </motion.div>
        ) : view === 'login' ? (
          <Login 
            onBackToLanding={handleGoBack}
            onSwitchToSignup={handleSignup}
            onLoginSuccess={() => setView('onboarding')}
            mode="login"
          />
        ) : view === 'signup' ? (
          <Login 
            onBackToLanding={handleGoBack}
            onSwitchToSignup={handleLogin}
            onLoginSuccess={() => setView('onboarding')}
            mode="signup"
          />
        ) : (
          <ChatInterface onLogout={() => setView('landing')} />
        )}
      </AnimatePresence>
    </div>
  )
}

export default App

