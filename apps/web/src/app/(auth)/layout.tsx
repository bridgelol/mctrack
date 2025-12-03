import { Network, BarChart3, Users, Zap, Shield } from 'lucide-react';

const features = [
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    description: 'Track player activity, revenue, and engagement metrics in real-time',
  },
  {
    icon: Users,
    title: 'Player Insights',
    description: 'Understand your player base with detailed session and behavior data',
  },
  {
    icon: Zap,
    title: 'Campaign Attribution',
    description: 'Measure ROI on your marketing campaigns with precision',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Role-based access control and audit logging for your team',
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-500 via-brand-500/90 to-brand-600 p-12 flex-col justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
            <Network className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">MCTrack</span>
        </div>

        {/* Features */}
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Powerful analytics for<br />Minecraft servers
            </h2>
            <p className="text-white/70 text-lg">
              Join thousands of server owners who trust MCTrack to understand their players and grow their communities.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="space-y-2">
                  <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm text-white/60">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Testimonial */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <p className="text-white/90 italic mb-4">
            &ldquo;MCTrack helped us understand our players better and increase our revenue by 40%. The campaign attribution feature alone paid for itself.&rdquo;
          </p>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold">
              JD
            </div>
            <div>
              <p className="text-white font-medium">John Doe</p>
              <p className="text-white/60 text-sm">CraftNetwork Owner</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-gray-950">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-brand-500 flex items-center justify-center">
              <Network className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-50">MCTrack</span>
          </div>

          {children}

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-gray-500">
            By continuing, you agree to our{' '}
            <a href="/terms" className="text-brand-400 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-brand-400 hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
