import { getUIConfig } from '@/lib/config';

export default async function HomePage() {
  const config = await getUIConfig();

  const getStatusColor = (status: 'success' | 'warning' | 'error') => {
    switch(status) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            {config.app.title}
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            {config.app.subtitle}
          </p>

          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold mb-4">🚀 {config.status.title}</h2>
            <div className="space-y-2 text-left">
              {config.status.items.map((item, idx) => (
                <p key={idx} className="flex items-center">
                  <span className={`w-3 h-3 ${getStatusColor(item.status)} rounded-full mr-2`}></span>
                  <span>{item.label}: {item.value}</span>
                </p>
              ))}
            </div>
          </div>

          <div className="mt-12">
            <h3 className="text-lg font-medium text-gray-700 mb-4">{config.features.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {config.features.items.map((feature, idx) => (
                <div key={idx} className="bg-white p-6 rounded-lg shadow">
                  <div className="text-3xl mb-2">{feature.icon}</div>
                  <h4 className="font-semibold">{feature.title}</h4>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 text-sm text-gray-500">
            <p>{config.app.version} | {config.app.techStack}</p>
          </div>
        </div>
      </div>
    </main>
  );
}