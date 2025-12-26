import Link from "next/link";
import { Telescope, Code2, Activity, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Zoom
          </h1>
          <p className="text-xl text-gray-400">
            World Model Monitor - Observe, understand, and debug AI-powered applications
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Link
            href="/analyze"
            className="group p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-blue-500 transition-all duration-200"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                <Telescope className="w-6 h-6 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold">Analyze Codebase</h2>
            </div>
            <p className="text-gray-400">
              Point at a folder and get AI-powered suggestions for instrumenting your code with Monitor calls.
            </p>
          </Link>

          <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl opacity-60">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Activity className="w-6 h-6 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold">Live Monitor</h2>
            </div>
            <p className="text-gray-400">
              View real-time artifacts, operations, and checks from your running application.
            </p>
            <span className="text-sm text-gray-600 mt-2 block">Coming soon</span>
          </div>

          <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl opacity-60">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Code2 className="w-6 h-6 text-green-400" />
              </div>
              <h2 className="text-xl font-semibold">SDK Reference</h2>
            </div>
            <p className="text-gray-400">
              Complete documentation for the Monitor SDK with examples and best practices.
            </p>
            <span className="text-sm text-gray-600 mt-2 block">Coming soon</span>
          </div>

          <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl opacity-60">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <Zap className="w-6 h-6 text-orange-400" />
              </div>
              <h2 className="text-xl font-semibold">Insights</h2>
            </div>
            <p className="text-gray-400">
              Analyze patterns, bottlenecks, and anomalies in your application's behavior.
            </p>
            <span className="text-sm text-gray-600 mt-2 block">Coming soon</span>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Start</h3>
          <div className="space-y-4 text-gray-400">
            <p>
              1. <Link href="/analyze" className="text-blue-400 hover:underline">Analyze your codebase</Link> to identify instrumentation points
            </p>
            <p>
              2. Add the generated Monitor calls to your application
            </p>
            <p>
              3. Connect to Zoom to see real-time insights
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
