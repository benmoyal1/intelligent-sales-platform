import { useEffect, useState } from 'react';
import { prospectsApi, callsApi, campaignsApi } from '../api/client';
import { Users, Phone, Calendar, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [prospectsStats, callsStats, campaignsStats] = await Promise.all([
        prospectsApi.getStats(),
        callsApi.getStats(),
        campaignsApi.getStats(),
      ]);

      setStats({
        prospects: prospectsStats.data,
        calls: callsStats.data,
        campaigns: campaignsStats.data,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  const conversionRate =
    stats?.calls?.total_calls > 0
      ? ((stats.calls.meetings_booked / stats.calls.completed) * 100).toFixed(1)
      : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">AI-Driven Outbound Call Center System Overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Users className="w-6 h-6" />}
          title="Total Prospects"
          value={stats?.prospects?.total || 0}
          subtitle={`${stats?.prospects?.researched || 0} researched`}
          color="blue"
        />
        <StatCard
          icon={<Phone className="w-6 h-6" />}
          title="Total Calls"
          value={stats?.calls?.total_calls || 0}
          subtitle={`${stats?.calls?.completed || 0} completed`}
          color="green"
        />
        <StatCard
          icon={<Calendar className="w-6 h-6" />}
          title="Meetings Booked"
          value={stats?.calls?.meetings_booked || 0}
          subtitle={`${conversionRate}% conversion`}
          color="purple"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          title="Active Campaigns"
          value={stats?.campaigns?.active || 0}
          subtitle={`${stats?.campaigns?.total_campaigns || 0} total`}
          color="orange"
        />
      </div>

      {/* System Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Architecture</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Multi-Agent System:</span>
              <span className="font-medium text-gray-900">Research → Call → Booking</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">AI Model:</span>
              <span className="font-medium text-gray-900">GPT-4o-mini</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Conversation Type:</span>
              <span className="font-medium text-gray-900">Text-based Simulator</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average Sentiment:</span>
              <span className="font-medium text-gray-900">
                {((stats?.calls?.avg_sentiment || 0.5) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Features</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center">
              <span className="w-2 h-2 bg-indigo-600 rounded-full mr-3"></span>
              AI Research Agent analyzes prospects with GPT-4o
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-indigo-600 rounded-full mr-3"></span>
              Intelligent conversation with BANT qualification
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-indigo-600 rounded-full mr-3"></span>
              Real-time sentiment analysis
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-indigo-600 rounded-full mr-3"></span>
              Context-aware objection handling
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: number;
  subtitle: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function StatCard({ icon, title, value, subtitle, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className={`inline-flex p-3 rounded-lg ${colorClasses[color]} mb-4`}>{icon}</div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm font-medium text-gray-900">{title}</div>
      <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
    </div>
  );
}
