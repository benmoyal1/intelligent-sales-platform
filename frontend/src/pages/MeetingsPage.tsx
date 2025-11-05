import { useEffect, useState } from 'react';
import { meetingsApi } from '../api/client';
import { Calendar, Clock, User, Building2, Mail, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadMeetings();
    loadStats();
  }, []);

  const loadMeetings = async () => {
    try {
      const response = await meetingsApi.getAll();
      setMeetings(response.data);
    } catch (error) {
      console.error('Failed to load meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await meetingsApi.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleStatusUpdate = async (meetingId: string, newStatus: string) => {
    try {
      await meetingsApi.updateStatus(meetingId, newStatus);
      await loadMeetings();
      await loadStats();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update status');
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no-show':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Calendar className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      case 'no-show':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading meetings...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Scheduled Meetings</h1>
        <p className="text-gray-600 mt-2">View and manage upcoming prospect meetings</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Meetings</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total_meetings || 0}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-semibold text-blue-600">{stats.scheduled || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-semibold text-green-600">{stats.completed || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">No-Shows</p>
                <p className="text-2xl font-semibold text-yellow-600">{stats.no_shows || 0}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>
      )}

      {/* Meetings List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {meetings.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No meetings scheduled yet
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {meetings.map((meeting) => {
              const datetime = formatDateTime(meeting.scheduled_time);

              return (
                <div key={meeting.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`px-2 py-1 rounded-full flex items-center space-x-1 text-xs font-semibold ${getStatusColor(meeting.status)}`}>
                          {getStatusIcon(meeting.status)}
                          <span className="ml-1">{meeting.status}</span>
                        </div>
                        <span className="text-xs text-gray-500 uppercase">{meeting.meeting_type}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center text-gray-900 mb-2">
                            <User className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium">{meeting.prospect_name}</span>
                          </div>
                          <div className="flex items-center text-gray-600 text-sm mb-1">
                            <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                            <span>{meeting.company}</span>
                          </div>
                          <div className="flex items-center text-gray-600 text-sm">
                            <Mail className="w-4 h-4 mr-2 text-gray-400" />
                            <span>{meeting.email || 'No email'}</span>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center text-gray-900 mb-2">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium">{datetime.date}</span>
                          </div>
                          <div className="flex items-center text-gray-600 text-sm mb-1">
                            <Clock className="w-4 h-4 mr-2 text-gray-400" />
                            <span>{datetime.time} ({meeting.duration_minutes} min)</span>
                          </div>
                          {meeting.account_manager_name && (
                            <div className="flex items-center text-gray-600 text-sm">
                              <User className="w-4 h-4 mr-2 text-gray-400" />
                              <span>AM: {meeting.account_manager_name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {meeting.notes && (
                        <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {meeting.notes}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {meeting.status === 'scheduled' && (
                      <div className="ml-4 flex flex-col space-y-2">
                        <button
                          onClick={() => handleStatusUpdate(meeting.id, 'completed')}
                          className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded"
                        >
                          Mark Complete
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(meeting.id, 'no-show')}
                          className="px-3 py-1 text-xs font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded"
                        >
                          No-Show
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(meeting.id, 'cancelled')}
                          className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
