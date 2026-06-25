import React from 'react'

interface AuthLayoutProps {
  title: string
  secondaryText?: React.ReactNode
  navActionLabel: string
  onNavAction: () => void
  onLogoClick: () => void
  children?: React.ReactNode
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  secondaryText,
  navActionLabel,
  onNavAction,
  onLogoClick,
  children
}) => {
  return (
    <div className="flex-1 min-h-screen flex flex-col justify-between">
      {/* HEADER / NAVIGATION */}
      <header className="w-full flex items-center justify-between px-5 py-6 md:px-8 md:py-8">
        {/* Logo Lockup */}
        <div 
          className="flex items-center gap-[10px] select-none group cursor-pointer" 
          onClick={onLogoClick}
        >
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

        {/* Action Button (Sign up / Log in toggle) */}
        <button
          onClick={onNavAction}
          className="bg-darkGray hover:bg-hoverDarkGray text-[#F7F7F7] font-sans font-medium text-[13px] md:text-[14px] px-[20px] py-[10px] rounded-full border border-transparent transition-all duration-200 active:scale-95 select-none cursor-pointer"
        >
          {navActionLabel}
        </button>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-8 md:py-16">
        <div className="w-full max-w-[400px] flex flex-col items-center text-center">
          <h2 className="text-[32px] md:text-[40px] font-sans font-bold tracking-tight text-white mb-6 leading-tight select-none">
            {title}
          </h2>
          
          {secondaryText && (
            <div className="text-textSecondary text-[15px] md:text-[16px] font-medium leading-[1.5] -mt-2 mb-8 max-w-[340px]">
              {secondaryText}
            </div>
          )}

          {children}
        </div>
      </main>

      {/* FOOTER SPACE FOR BALANCE */}
      <footer className="w-full py-8 md:py-12" />
    </div>
  )
}
