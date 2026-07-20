interface LandingHeroProps {
  onLogin: () => void;
  ready: boolean;
  authenticated: boolean;
}

export function LandingHero({
  onLogin,
  ready,
  authenticated,
}: LandingHeroProps) {
  return (
    <div className="flex flex-col items-center gap-8 relative z-10 max-w-4xl">
      <div className="text-center space-y-6">
        <div className="inline-block px-4 py-2 bg-purple-500/20 border border-purple-400/30 rounded-full mb-2">
          <span className="text-purple-300 text-sm font-semibold">
            Powered by EIP-7702
          </span>
        </div>
        <h1 className="text-6xl font-bold bg-linear-to-r from-purple-400 via-purple-300 to-purple-500 bg-clip-text text-transparent leading-tight">
          Your Account.
          <br />
          Supercharged.
        </h1>
        <p className="text-gray-300 text-xl max-w-2xl mx-auto leading-relaxed">
          Upgrade your EOA to a{" "}
          <span className="text-purple-400 font-semibold">
            Universal Account
          </span>{" "}
          without deploying contracts or forcing your users to migrate assets.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10 text-center">
          <div className="text-purple-300 font-semibold mb-1">Same Address</div>
          <div className="text-sm text-gray-400">
            Your existing EOA IS your Universal Account.
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10 text-center">
          <div className="text-purple-300 font-semibold mb-1">
            Zero Transfers
          </div>
          <div className="text-sm text-gray-400">
            No asset migration required.
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10 text-center">
          <div className="text-purple-300 font-semibold mb-1">
            Chain Abstraction
          </div>
          <div className="text-sm text-gray-400">
            Swap across 15+ chains instantly.
          </div>
        </div>
      </div>

      <div className="mt-6 p-8 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl w-full max-w-md">
        <div className="flex flex-col items-center gap-6">
          <div className="text-center space-y-2">
            <p className="text-white font-bold text-sm uppercase tracking-wider">
              Experience the Future
            </p>
          </div>

          <button
            onClick={onLogin}
            disabled={!ready || authenticated}
            className="w-full bg-linear-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-500 text-white font-semibold py-4 px-10 rounded-xl transition-all duration-200 shadow-lg hover:shadow-purple-500/50 disabled:shadow-none"
          >
            {ready ? "Get Started" : "Loading..."}
          </button>
        </div>
      </div>

      <div className="mt-6 flex gap-6 text-center text-sm">
        <div className="flex items-center gap-2 text-gray-400">
          <span className="text-purple-400 font-bold">15+</span>
          <span>Chains</span>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <span className="text-purple-400 font-bold">EVM + Solana</span>
          <span>Support</span>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <span className="text-purple-400 font-bold">Unified</span>
          <span>Balance</span>
        </div>
      </div>
    </div>
  );
}
