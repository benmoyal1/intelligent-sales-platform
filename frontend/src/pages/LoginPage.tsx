import { useState } from 'react';
import { authApi } from '../api/client';
import { Bot } from 'lucide-react';

interface Props {
  onLogin: (token: string) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(username, password);
      onLogin(response.data.token);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-md w-full bg-dark-card rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center">
              <Bot className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-100">Outbound AI System</h1>
          <p className="text-gray-400 mt-2">Alta Home Assignment Demo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-dark-hover text-gray-100 placeholder-gray-500"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-dark-hover text-gray-100 placeholder-gray-500"
              required
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-900 bg-opacity-30 p-3 rounded-md">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <div className="text-sm text-gray-300 bg-dark-hover p-4 rounded-md">
            <p className="font-semibold mb-2">Demo Credentials:</p>
            <p>Username: <code className="bg-dark-card px-2 py-1 rounded">test</code></p>
            <p>Password: <code className="bg-dark-card px-2 py-1 rounded">test123</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}
