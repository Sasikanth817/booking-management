import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
      {/* Subtle Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 -right-40 w-[28rem] h-[28rem] bg-blue-200 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob"></div>
        <div className="absolute -bottom-48 -left-40 w-[28rem] h-[28rem] bg-purple-200 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute top-56 left-24 w-[28rem] h-[28rem] bg-pink-200 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Floating Particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-blue-300 rounded-full opacity-30 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          ></div>
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center px-8 py-6 bg-white/80 backdrop-blur-sm shadow-lg">
        <div className="flex items-center space-x-3">
          <img src='/halls/Hall Logo.png' height={40} width={40} alt="HALL MATE" />
          <div className="text-sm font-semibold text-gray-800">HALL MATE</div>
        </div>
        <a href="/auth" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-full font-medium hover:from-blue-700 hover:to-purple-700 transition-colors">Sign Up</a>
      </header>

      {/* Hero */}
      <main className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center px-8 py-16 max-w-7xl mx-auto">
        {/* Left - Title */}
        <div className="flex-1">
          <h1 className="text-6xl md:text-7xl font-extrabold leading-[1.3] mb-6">
            <span className="block pb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-purple-700 to-pink-700">Hall Management</span>
            <span className="block text-gray-800">System</span>
          </h1>
          <p className="text-gray-600 text-lg mb-8 max-w-xl">
            Discover, check availability, and book campus gallery halls effortlessly with a modern, delightful interface.
          </p>
          <div className="flex items-center gap-4">
            <a href="/auth" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full font-medium hover:from-blue-700 hover:to-purple-700 transition-colors">Get Started</a>
          </div>
        </div>

        {/* Right - Static Logo Illustration */}
        <div className="flex justify-center md:justify-end">
          <div className="relative w-full max-w-xl">
            <img src="/halls/Hall Logo.png" alt="Hall Logo" className="w-full h-auto drop-shadow-xl" />
          </div>
        </div>
      </main>
    </div>
  )
} 
