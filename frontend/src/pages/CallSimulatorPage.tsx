import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { callsApi } from '../api/client';
import { Phone, Send, PhoneOff, TrendingUp, Heart } from 'lucide-react';

export default function CallSimulatorPage() {
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();
  const [call, setCall] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (callId) {
      loadCall();
    }
  }, [callId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadCall = async () => {
    try {
      const response = await callsApi.getOne(callId!);
      setCall(response.data);
      const conversation = JSON.parse(response.data.conversation);
      setMessages(conversation);
    } catch (error) {
      console.error('Failed to load call:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || sending) return;

    setSending(true);
    try {
      const response = await callsApi.sendMessage(callId!, inputMessage);

      // Add user message and AI response to UI
      const newMessages = [
        ...messages,
        { role: 'user', content: inputMessage, timestamp: new Date().toISOString() },
        {
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date().toISOString(),
        },
      ];

      setMessages(newMessages);
      setInputMessage('');
      setAnalysis(response.data.analysis);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleEndCall = async (outcome: string, meetingBooked: boolean) => {
    if (!confirm('Are you sure you want to end this call?')) return;

    try {
      await callsApi.end(callId!, outcome, meetingBooked);
      navigate('/prospects');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to end call');
    }
  };

  if (!call) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading call...</div>
      </div>
    );
  }

  const sentimentColor =
    analysis?.sentiment > 0.7
      ? 'text-green-600'
      : analysis?.sentiment < 0.4
      ? 'text-red-600'
      : 'text-yellow-600';

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{call.prospect_name}</h1>
            <p className="text-gray-600">
              {call.company} • {call.role}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {analysis && (
              <>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    <Heart className={`w-6 h-6 inline ${sentimentColor}`} />
                  </div>
                  <div className="text-xs text-gray-500">
                    {(analysis.sentiment * 100).toFixed(0)}% sentiment
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-900">
                    {analysis.qualification_status}
                  </div>
                  <div className="text-xs text-gray-500">Qualification</div>
                </div>
              </>
            )}
            <button
              onClick={() => handleEndCall('meeting_booked', true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              Book Meeting
            </button>
            <button
              onClick={() => handleEndCall('not_interested', false)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center"
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              End Call
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Chat Interface */}
        <div className="col-span-2 bg-white rounded-lg shadow flex flex-col" style={{ height: '600px' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="text-sm">{message.content}</div>
                  <div
                    className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-indigo-200' : 'text-gray-500'
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your response as the prospect..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={sending}
              />
              <button
                onClick={handleSendMessage}
                disabled={sending || !inputMessage.trim()}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
              >
                <Send className="w-4 h-4 mr-2" />
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Simulate prospect responses to see the AI agent in action
            </p>
          </div>
        </div>

        {/* Analysis Panel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Real-time Analysis</h2>

          {analysis ? (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Sentiment</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      analysis.sentiment > 0.7
                        ? 'bg-green-600'
                        : analysis.sentiment < 0.4
                        ? 'bg-red-600'
                        : 'bg-yellow-600'
                    }`}
                    style={{ width: `${analysis.sentiment * 100}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {(analysis.sentiment * 100).toFixed(0)}% positive
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Qualification Status</div>
                <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  {analysis.qualification_status}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Recommended Action</div>
                <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  {analysis.next_action.replace('_', ' ')}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Conversation Stats</div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>Total turns: {messages.length}</div>
                  <div>Duration: ~{messages.length * 15}s</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Send messages to see real-time analysis
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-xs text-gray-500 space-y-2">
              <p>
                <strong>Tip:</strong> The AI agent is using GPT-4o-mini with context-aware
                responses.
              </p>
              <p>Try different prospect responses to see how the agent adapts its strategy.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
