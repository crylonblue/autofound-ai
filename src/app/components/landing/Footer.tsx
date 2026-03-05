export default function Footer() {
  return (
    <footer className="py-16 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <span className="text-lg font-bold tracking-tight">
              autofound<span className="text-blue-500">.ai</span>
            </span>
            <p className="mt-3 text-sm text-zinc-500 leading-relaxed">
              Your AI workforce that never sleeps. Get more done with intelligent agents.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2.5 text-sm text-zinc-500">
              <li><a href="#use-cases" className="hover:text-zinc-300 transition">Use Cases</a></li>
              <li><a href="#how" className="hover:text-zinc-300 transition">How It Works</a></li>
              <li><a href="#pricing" className="hover:text-zinc-300 transition">Pricing</a></li>
              <li><a href="#faq" className="hover:text-zinc-300 transition">FAQ</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2.5 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-zinc-300 transition">About</a></li>
              <li><a href="#" className="hover:text-zinc-300 transition">Blog</a></li>
              <li><a href="#" className="hover:text-zinc-300 transition">Careers</a></li>
              <li><a href="#" className="hover:text-zinc-300 transition">Contact</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2.5 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-zinc-300 transition">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-zinc-300 transition">Terms of Service</a></li>
              <li><a href="#" className="hover:text-zinc-300 transition">Security</a></li>
            </ul>
          </div>
        </div>

        <div className="gradient-divider" />

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-600">
          <span>
            &copy; {new Date().getFullYear()} autofound.ai &mdash; All rights reserved.
          </span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-zinc-400 transition" aria-label="Twitter/X">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="#" className="hover:text-zinc-400 transition" aria-label="LinkedIn">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
