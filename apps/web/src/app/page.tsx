import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
  BarChart3,
  Users,
  TrendingUp,
  Zap,
  Shield,
  Globe,
  Gamepad2,
  DollarSign,
  ArrowRight,
  Check,
  ChevronDown,
  Github,
  Twitter,
  MessageCircle,
  Network,
  Target,
  RefreshCw,
  Layers,
} from 'lucide-react';

export default async function HomePage() {
  const session = await auth();

  // If logged in, redirect to dashboard
  if (session?.user) {
    redirect('/networks');
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-brand-500 flex items-center justify-center">
                <Network className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl">MCTrack</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-400 hover:text-white transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-gray-400 hover:text-white transition-colors">
                Pricing
              </a>
              <a href="#faq" className="text-gray-400 hover:text-white transition-colors">
                FAQ
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-gray-300 hover:text-white transition-colors px-4 py-2"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm">
                <Zap className="h-4 w-4" />
                Real-time Analytics for Minecraft
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
                Run your server{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-purple-400">
                  like a business
                </span>
              </h1>
              <p className="text-xl text-gray-400 max-w-lg">
                MCTrack gives you the same analytics tools Fortune 500 companies use —
                built specifically for Minecraft servers.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold transition-all text-lg group"
                >
                  Get started free
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-6 py-3 rounded-xl font-semibold transition-all text-lg"
                >
                  See how it works
                </a>
              </div>
              <div className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-gray-400">Free forever plan</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-gray-400">5 minute setup</span>
                </div>
              </div>
            </div>

            {/* Right: Dashboard Preview */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-brand-500/20 to-purple-500/20 blur-3xl rounded-full" />
              <div className="relative rounded-2xl border border-gray-800 bg-gray-900/80 backdrop-blur-xl p-6 shadow-2xl">
                {/* Mini dashboard preview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-100">Today's Overview</h3>
                    <span className="text-xs text-gray-500">Live</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <StatPreview label="Unique Players" value="2,847" change="+12%" />
                    <StatPreview label="Peak CCU" value="342" change="+8%" />
                    <StatPreview label="Revenue" value="$1,247" change="+23%" />
                    <StatPreview label="Avg Session" value="47m" change="+5%" />
                  </div>
                  {/* Mini chart */}
                  <div className="h-32 bg-gray-800/50 rounded-lg p-3 relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 right-0 h-24">
                      <svg viewBox="0 0 300 100" className="w-full h-full" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0,80 Q30,60 60,65 T120,50 T180,55 T240,30 T300,40 L300,100 L0,100 Z"
                          fill="url(#chartGradient)"
                        />
                        <path
                          d="M0,80 Q30,60 60,65 T120,50 T180,55 T240,30 T300,40"
                          fill="none"
                          stroke="rgb(99, 102, 241)"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                    <span className="text-xs text-gray-500">Player Activity</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos/Trust Bar */}
      <section className="py-12 border-y border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm mb-8">
            Trusted by server owners tracking millions of players
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-50">
            <div className="flex items-center gap-2 text-gray-400">
              <Gamepad2 className="h-6 w-6" />
              <span className="font-semibold">HyperPixel</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Layers className="h-6 w-6" />
              <span className="font-semibold">CraftMC</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Globe className="h-6 w-6" />
              <span className="font-semibold">MinePlus</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Shield className="h-6 w-6" />
              <span className="font-semibold">BlockVerse</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Everything you need to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-purple-400">
                grow your server
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              From player acquisition to monetization, MCTrack provides the insights
              you need to make data-driven decisions.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={Users}
              title="Acquisition"
              description="Track where your players come from with campaign attribution and referral analytics."
              color="blue"
            />
            <FeatureCard
              icon={BarChart3}
              title="Engagement"
              description="Monitor session duration, peak times, and player activity patterns in real-time."
              color="purple"
            />
            <FeatureCard
              icon={RefreshCw}
              title="Retention"
              description="Cohort analysis shows D1, D7, D30 retention rates to identify churn points."
              color="green"
            />
            <FeatureCard
              icon={DollarSign}
              title="Monetization"
              description="Revenue tracking with ARPU, ARPPU, and LTV metrics from your webstore."
              color="orange"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Up and running in minutes
            </h2>
            <p className="text-xl text-gray-400">
              No complex setup. Just install, configure, and watch the data flow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Install the Plugin"
              description="Download our lightweight plugin for Spigot, BungeeCord, or Velocity. Works with any Minecraft server."
            />
            <StepCard
              number="2"
              title="Connect Your Server"
              description="Add your API key to the config file. Sessions are automatically tracked as players join and leave."
            />
            <StepCard
              number="3"
              title="Analyze & Grow"
              description="View real-time analytics in your dashboard. Make data-driven decisions to grow your server."
            />
          </div>
        </div>
      </section>

      {/* Feature Showcase */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl sm:text-5xl font-bold">
                Real-time insights,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-purple-400">
                  actionable data
                </span>
              </h2>
              <p className="text-xl text-gray-400">
                Stop guessing and start knowing. MCTrack provides the metrics that matter
                for growing your Minecraft server.
              </p>
              <ul className="space-y-4">
                <FeatureListItem>Live CCU and player activity monitoring</FeatureListItem>
                <FeatureListItem>Platform breakdown (Java & Bedrock)</FeatureListItem>
                <FeatureListItem>Geographic player distribution</FeatureListItem>
                <FeatureListItem>Revenue and payment analytics</FeatureListItem>
                <FeatureListItem>Campaign ROI tracking</FeatureListItem>
                <FeatureListItem>Team collaboration with role-based access</FeatureListItem>
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-brand-500/20 blur-3xl rounded-full" />
              <div className="relative rounded-2xl border border-gray-800 bg-gray-900/80 backdrop-blur-xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-gray-800 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-4 text-sm text-gray-500">Analytics Dashboard</span>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    {['2.8K', '342', '$1.2K', '47m'].map((val, i) => (
                      <div key={i} className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-white">{val}</div>
                        <div className="text-xs text-gray-500">
                          {['Players', 'CCU', 'Revenue', 'Avg Time'][i]}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="h-40 bg-gray-800/30 rounded-lg flex items-end justify-around p-4 gap-2">
                    {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 95, 70].map((h, i) => (
                      <div
                        key={i}
                        className="w-full bg-brand-500/80 rounded-t"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Support */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Works with your setup
            </h2>
            <p className="text-xl text-gray-400">
              From single servers to large proxy networks, MCTrack scales with you.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <PlatformCard
              title="Single Server"
              description="Perfect for standalone Spigot/Paper servers. Simple one-plugin setup."
              items={['Spigot', 'Paper', 'Purpur', 'Fabric']}
            />
            <PlatformCard
              title="Proxy Networks"
              description="Track players across your entire network with proxy support."
              items={['BungeeCord', 'Velocity', 'Waterfall']}
              featured
            />
            <PlatformCard
              title="Cross-Platform"
              description="Full support for both Java and Bedrock players."
              items={['Geyser', 'Floodgate', 'GeyserMC']}
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-400">
              Start free, upgrade when you need more. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white">Free</h3>
                <p className="text-gray-400 mt-2">Perfect for getting started</p>
              </div>
              <div className="mb-6">
                <span className="text-5xl font-bold text-white">$0</span>
                <span className="text-gray-400">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <PricingFeature>Up to 1,000 monthly players</PricingFeature>
                <PricingFeature>Real-time analytics dashboard</PricingFeature>
                <PricingFeature>7-day data retention</PricingFeature>
                <PricingFeature>Basic retention metrics</PricingFeature>
                <PricingFeature>Email support</PricingFeature>
              </ul>
              <Link
                href="/register"
                className="block w-full text-center py-3 rounded-xl border border-gray-700 text-white font-semibold hover:bg-gray-800 transition-colors"
              >
                Get Started Free
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="rounded-2xl border-2 border-brand-500 bg-gray-900/50 p-8 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-brand-500 rounded-full text-sm font-semibold">
                Most Popular
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white">Pro</h3>
                <p className="text-gray-400 mt-2">For growing servers</p>
              </div>
              <div className="mb-6">
                <span className="text-5xl font-bold text-white">$25</span>
                <span className="text-gray-400">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <PricingFeature>Unlimited players</PricingFeature>
                <PricingFeature>Advanced analytics & segmentation</PricingFeature>
                <PricingFeature>90-day data retention</PricingFeature>
                <PricingFeature>LTV & cohort analysis</PricingFeature>
                <PricingFeature>Campaign attribution</PricingFeature>
                <PricingFeature>Webstore integrations (Tebex, PayNow)</PricingFeature>
                <PricingFeature>Team collaboration</PricingFeature>
                <PricingFeature>Priority support</PricingFeature>
              </ul>
              <Link
                href="/register"
                className="block w-full text-center py-3 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-4">
            <FAQItem
              question="How does MCTrack track players?"
              answer="MCTrack uses a lightweight plugin that sends session events (join/leave) to our servers. We don't store any sensitive player data — just UUIDs, session times, and optional platform info."
            />
            <FAQItem
              question="Does it affect server performance?"
              answer="No. The plugin is extremely lightweight and uses async HTTP requests. Most servers see zero impact on TPS. The plugin only sends data on player join/leave events."
            />
            <FAQItem
              question="Do you support Bedrock players?"
              answer="Yes! If you're using Geyser/Floodgate, we automatically detect Bedrock players and track them separately. You'll see platform breakdowns in your analytics."
            />
            <FAQItem
              question="How do I connect my webstore?"
              answer="We support Tebex and PayNow.gg. Just add your API key in the dashboard settings, and we'll automatically sync your payment data for revenue analytics."
            />
            <FAQItem
              question="Can my team access the dashboard?"
              answer="Yes! You can invite team members with different roles (Admin, Moderator, Viewer) and granular permissions. Each member gets their own login."
            />
            <FAQItem
              question="What happens if I exceed my plan limits?"
              answer="We'll never cut off your data. If you exceed limits, we'll notify you and you can upgrade anytime. Historical data is always preserved."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            Ready to grow your server?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Join thousands of server owners using MCTrack to make data-driven decisions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-8 py-4 rounded-xl font-semibold transition-all text-lg group"
            >
              Get started for free
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="https://discord.gg/mctrack"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-8 py-4 rounded-xl font-semibold transition-all text-lg"
            >
              <MessageCircle className="h-5 w-5" />
              Join our Discord
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center">
                  <Network className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-lg">MCTrack</span>
              </div>
              <p className="text-gray-400 text-sm">
                Analytics for Minecraft servers. Track, analyze, and grow.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="https://docs.mctrack.net" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="https://docs.mctrack.net/api" className="hover:text-white transition-colors">API Reference</a></li>
                <li><a href="/status" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="mailto:support@mctrack.net" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-gray-800">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} MCTrack. All rights reserved.
            </p>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <a href="https://twitter.com/mctrack" className="text-gray-500 hover:text-white transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="https://github.com/mctrack" className="text-gray-500 hover:text-white transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="https://discord.gg/mctrack" className="text-gray-500 hover:text-white transition-colors">
                <MessageCircle className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Component: Stat Preview Card
function StatPreview({ label, value, change }: { label: string; value: string; change: string }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-white">{value}</span>
        <span className="text-xs text-green-400">{change}</span>
      </div>
    </div>
  );
}

// Component: Feature Card
function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: 'blue' | 'purple' | 'green' | 'orange';
}) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };

  return (
    <div className="p-6 rounded-2xl border border-gray-800 bg-gray-900/50 hover:bg-gray-900 transition-colors group">
      <div className={`w-12 h-12 rounded-xl ${colors[color]} border flex items-center justify-center mb-4`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

// Component: Step Card
function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-brand-500 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

// Component: Feature List Item
function FeatureListItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
        <Check className="h-3 w-3 text-brand-400" />
      </div>
      <span className="text-gray-300">{children}</span>
    </li>
  );
}

// Component: Platform Card
function PlatformCard({
  title,
  description,
  items,
  featured,
}: {
  title: string;
  description: string;
  items: string[];
  featured?: boolean;
}) {
  return (
    <div
      className={`p-6 rounded-2xl border ${
        featured ? 'border-brand-500 bg-brand-500/5' : 'border-gray-800 bg-gray-900/50'
      }`}
    >
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 mb-4">{description}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="px-3 py-1 rounded-full bg-gray-800 text-gray-300 text-sm"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// Component: Pricing Feature
function PricingFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
      <span className="text-gray-300">{children}</span>
    </li>
  );
}

// Component: FAQ Item
function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group">
      <summary className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50 cursor-pointer hover:bg-gray-800 transition-colors list-none">
        <span className="font-medium text-white">{question}</span>
        <ChevronDown className="h-5 w-5 text-gray-400 group-open:rotate-180 transition-transform" />
      </summary>
      <div className="px-4 pb-4 pt-2 text-gray-400">
        {answer}
      </div>
    </details>
  );
}
