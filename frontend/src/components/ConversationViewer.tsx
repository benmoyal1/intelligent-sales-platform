import { useState, useEffect, useRef } from 'react';
import { X, MessageCircle, Phone, MessageSquare, PhoneOff } from 'lucide-react';
import axios from 'axios';

interface Message {
  role: string;
  content: string;
  timestamp?: string;
  vapiCallId?: string;
  status?: string;
}

interface Props {
  callId: string;
  callType: 'voice' | 'whatsapp';
  prospectName: string;
  onClose: () => void;
}

export default function ConversationViewer({ callId, callType, prospectName, onClose }: Props) {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [status, setStatus] = useState('loading');
  const [isLoading, setIsLoading] = useState(true);
  const [isEndingCall, setIsEndingCall] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversation
  const fetchConversation = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/calls/${callId}/conversation`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setConversation(response.data.conversation || []);
      setStatus(response.data.status || 'unknown');
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
      setIsLoading(false);
    }
  };

  // End active call
  const handleEndCall = async () => {
    if (!confirm('Are you sure you want to end this call?')) {
      return;
    }

    setIsEndingCall(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL}/calls/${callId}/end-active`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Refresh conversation to show updated status
      await fetchConversation();
    } catch (error) {
      console.error('Failed to end call:', error);
      alert('Failed to end call. Please try again.');
    } finally {
      setIsEndingCall(false);
    }
  };

  // Auto-refresh conversation every 2 seconds if call is in progress
  useEffect(() => {
    fetchConversation();

    const interval = setInterval(() => {
      if (status === 'in_progress' || status === 'active') {
        fetchConversation();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [callId, status]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Filter out system messages (like vapiCallId entry)
  const messages = conversation.filter((msg) => msg.content && msg.role !== undefined);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-dark-border flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {callType === 'voice' ? (
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-100">{prospectName}</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-400">
                  {callType === 'voice' ? 'Voice Call' : 'WhatsApp'}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    status === 'in_progress' || status === 'active'
                      ? 'bg-green-900 text-green-300'
                      : status === 'completed'
                      ? 'bg-gray-700 text-gray-300'
                      : 'bg-yellow-900 text-yellow-300'
                  }`}
                >
                  {status}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400">Loading conversation...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
              <p>No messages yet</p>
              {(status === 'in_progress' || status === 'active') && (
                <p className="text-sm">Waiting for conversation to start...</p>
              )}
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      message.role === 'assistant'
                        ? 'bg-dark-hover text-gray-100'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        {message.timestamp && (
                          <p className="text-xs mt-1 opacity-70">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-border">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div>
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center space-x-4">
              {(status === 'in_progress' || status === 'active') && (
                <>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Live updates</span>
                  </div>
                  {callType === 'voice' && (
                    <button
                      onClick={handleEndCall}
                      disabled={isEndingCall}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      <PhoneOff className="w-4 h-4" />
                      <span>{isEndingCall ? 'Ending...' : 'End Call'}</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
