import { getConfig } from './lib/config';

export default async function HomePage() {
  const config = await getConfig();

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Vioverse
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Credit Report Analysis System
          </p>

          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold mb-4">📊 Supported Bureaus</h2>
            <div className="space-y-2 text-left">
              {Object.values(config.bureaus).map((bureau) => (
                <p key={bureau.code} className="flex items-center">
                  <span
                    className={`inline-block w-3 h-3 rounded-full mr-2`}
                    style={{ backgroundColor: bureau.color }}
                  ></span>
                  {bureau.name} ({bureau.code})
                </p>
              ))}
            </div>
          </div>

          <div className="mt-12">
            <h3 className="text-lg font-medium text-gray-700 mb-4">Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl mb-2">🔍</div>
                <h4 className="font-semibold">Violation Detection</h4>
                <p className="text-sm text-gray-600">Identify FCRA violations across all bureaus</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl mb-2">📈</div>
                <h4 className="font-semibold">Data Analysis</h4>
                <p className="text-sm text-gray-600">Comprehensive credit report analysis</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl mb-2">📋</div>
                <h4 className="font-semibold">Reporting</h4>
                <p className="text-sm text-gray-600">Generate detailed violation reports</p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-sm text-gray-500">
            <p>v3.0.0 | Next.js 14 + TypeScript</p>
          </div>
        </div>
      </div>
    </main>
  );
}