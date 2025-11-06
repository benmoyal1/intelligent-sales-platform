import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { prospectsApi, callsApi } from '../api/client';
import { Search, Brain, Phone, TrendingUp, Plus, X, Edit2, ChevronLeft, ChevronRight, MessageCircle, Eye } from 'lucide-react';
import ConversationViewer from '../components/ConversationViewer';

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<any[]>([]);
  const [filteredProspects, setFilteredProspects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [researchingId, setResearchingId] = useState<string | null>(null);
  const [startingCallId, setStartingCallId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<any | null>(null);
  const [instructionsText, setInstructionsText] = useState('');
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    role: '',
    industry: '',
    company_size: '',
    custom_instructions: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [selectedCallType, setSelectedCallType] = useState<'voice' | 'whatsapp'>('voice');
  const [selectedProspectName, setSelectedProspectName] = useState<string>('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailProspect, setDetailProspect] = useState<any | null>(null);
  const [prospectConversations, setProspectConversations] = useState<any[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadProspects();
  }, []);

  // Filter prospects based on search query
  useEffect(() => {
    const filtered = prospects.filter((prospect) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        prospect.name.toLowerCase().includes(searchLower) ||
        prospect.company.toLowerCase().includes(searchLower) ||
        (prospect.role && prospect.role.toLowerCase().includes(searchLower)) ||
        (prospect.industry && prospect.industry.toLowerCase().includes(searchLower))
      );
    });
    setFilteredProspects(filtered);
    setCurrentPage(1); // Reset to first page when search changes
  }, [prospects, searchQuery]);

  const loadProspects = async () => {
    try {
      const response = await prospectsApi.getAll();
      setProspects(response.data);
    } catch (error) {
      console.error('Failed to load prospects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async (prospectId: string) => {
    setLoadingConversations(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/prospects/${prospectId}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setProspectConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setProspectConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleViewConversation = (callId: string, callType: 'voice' | 'whatsapp', prospectName: string) => {
    setSelectedCallId(callId);
    setSelectedCallType(callType);
    setSelectedProspectName(prospectName);
    setShowDetailModal(false); // Close detail modal when viewing conversation
  };

  const handleOpenInstructions = (prospect: any) => {
    setSelectedProspect(prospect);
    setInstructionsText(prospect.custom_instructions || '');
    setShowInstructionsModal(true);
  };

  const handleSaveInstructions = async () => {
    if (!selectedProspect) return;

    setSavingInstructions(true);
    try {
      await prospectsApi.updateInstructions(selectedProspect.id, instructionsText);
      await loadProspects();
      setShowInstructionsModal(false);
      setSelectedProspect(null);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update instructions');
    } finally {
      setSavingInstructions(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredProspects.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProspects = filteredProspects.slice(startIndex, endIndex);

  const handleResearch = async (prospectId: string) => {
    setResearchingId(prospectId);
    try {
      await prospectsApi.runResearch(prospectId);
      await loadProspects();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Research failed');
    } finally {
      setResearchingId(null);
    }
  };

  const handleStartCall = async (prospectId: string, callType: 'voice' | 'whatsapp' = 'voice') => {
    setStartingCallId(prospectId);
    try {
      // Find the prospect
      const prospect = prospects.find(p => p.id === prospectId);

      // If voice call and prospect not researched, run research first
      if (callType === 'voice' && (!prospect?.research_data || prospect.status === 'new')) {
        console.log('Running research before voice call...');
        setResearchingId(prospectId);
        await prospectsApi.runResearch(prospectId);
        await loadProspects();
        setResearchingId(null);
      }

      // Now make the call
      const response = await callsApi.start(prospectId, callType);

      if (callType === 'voice') {
        // Navigate to call simulator for voice calls
        navigate(`/call/${response.data.call_id}`);
      } else {
        // Show success message for WhatsApp campaigns
        alert('WhatsApp campaign started! The AI will engage the prospect via WhatsApp.');
        setStartingCallId(null);
        await loadProspects();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to start call');
      setStartingCallId(null);
      setResearchingId(null);
    }
  };

  const handleAddProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await prospectsApi.create(formData);
      setShowAddModal(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        role: '',
        industry: '',
        company_size: '',
        custom_instructions: '',
      });
      await loadProspects();
      alert('Prospect added successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add prospect');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading prospects...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Prospects</h1>
          <p className="text-gray-400 mt-2">Manage and research prospects for outbound calls</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Prospect
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, company, role, or industry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-dark-border rounded-md leading-5 bg-dark-card text-gray-100 placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <p className="mt-2 text-sm text-gray-400">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredProspects.length)} of {filteredProspects.length} results
          {searchQuery && ` (filtered from ${prospects.length} total)`}
        </p>
      </div>

      <div className="bg-dark-card rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-dark-border">
          <thead className="bg-dark-hover">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Prospect
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Success Probability
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Instructions
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-dark-card divide-y divide-dark-border">
            {currentProspects.map((prospect) => {
              return (
                <tr
                  key={prospect.id}
                  className="hover:bg-dark-hover cursor-pointer"
                  onClick={() => {
                    setDetailProspect(prospect);
                    setShowDetailModal(true);
                    loadConversations(prospect.id);
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-100">{prospect.name}</div>
                      <div className="text-sm text-gray-400">{prospect.role}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-100">{prospect.company}</div>
                    <div className="text-sm text-gray-400">{prospect.industry}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        prospect.status === 'new'
                          ? 'bg-gray-100 text-gray-800'
                          : prospect.status === 'researched'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {prospect.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                    {prospect.success_probability ? (
                      <div className="flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
                        {prospect.success_probability}%
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResearch(prospect.id);
                        }}
                        disabled={researchingId === prospect.id}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-100 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Brain className="w-3 h-3 mr-1" />
                        {researchingId === prospect.id ? 'Researching...' : 'Research'}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenInstructions(prospect);
                      }}
                      className="inline-flex items-center px-3 py-1.5 border border-dark-border text-xs font-medium rounded text-gray-300 bg-dark-card hover:bg-dark-hover"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      {prospect.custom_instructions ? 'View/Edit' : 'Add'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                    {prospect.status !== 'contacted' ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleStartCall(prospect.id, 'voice')}
                          disabled={startingCallId === prospect.id || researchingId === prospect.id}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                          title={!prospect.research_data ? 'Will run research first' : 'Start voice call'}
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          {startingCallId === prospect.id ? 'Starting...' : 'Voice'}
                        </button>
                        <button
                          onClick={() => handleStartCall(prospect.id, 'whatsapp')}
                          disabled={startingCallId === prospect.id || researchingId === prospect.id}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                          title="Start WhatsApp campaign"
                        >
                          <MessageCircle className="w-3 h-3 mr-1" />
                          WhatsApp
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400">Contacted</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-dark-card px-4 py-3 flex items-center justify-between border-t border-dark-border sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-dark-border text-sm font-medium rounded-md text-gray-300 bg-dark-card hover:bg-dark-hover disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-dark-border text-sm font-medium rounded-md text-gray-300 bg-dark-card hover:bg-dark-hover disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-300">
                  Page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-dark-border bg-dark-card text-sm font-medium text-gray-400 hover:bg-dark-hover disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-indigo-600 border-indigo-500 text-indigo-100'
                          : 'bg-dark-card border-dark-border text-gray-400 hover:bg-dark-hover'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-dark-border bg-dark-card text-sm font-medium text-gray-400 hover:bg-dark-hover disabled:opacity-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {filteredProspects.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          {searchQuery ? 'No prospects match your search' : 'No prospects found'}
        </div>
      )}

      {/* Instructions Modal */}
      {showInstructionsModal && selectedProspect && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowInstructionsModal(false)}></div>

            <div className="inline-block align-bottom bg-dark-card rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-dark-card px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-100">
                    Custom Call Instructions
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowInstructionsModal(false)}
                    className="text-gray-400 hover:text-gray-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-400">
                    <strong>Prospect:</strong> {selectedProspect.name}
                  </p>
                  <p className="text-sm text-gray-400">
                    <strong>Company:</strong> {selectedProspect.company}
                  </p>
                </div>

                {selectedProspect.status === 'contacted' && selectedProspect.last_call_id && (
                  <div className="mb-4 p-3 bg-dark-hover rounded-md border border-dark-border">
                    <p className="text-sm text-gray-300 mb-2">
                      <strong>Last Call:</strong> {selectedProspect.last_call_type === 'voice' ? 'Voice Call' : 'WhatsApp'}
                    </p>
                    <button
                      onClick={() => {
                        setSelectedCallId(selectedProspect.last_call_id);
                        setSelectedCallType(selectedProspect.last_call_type || 'voice');
                        setSelectedProspectName(selectedProspect.name);
                      }}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View Conversation
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Instructions for AI Agent (Optional)
                  </label>
                  <textarea
                    value={instructionsText}
                    onChange={(e) => setInstructionsText(e.target.value)}
                    rows={6}
                    className="block w-full border border-dark-border rounded-md shadow-sm py-2 px-3 bg-dark-hover text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="E.g., Focus on cost savings, mention competitor X, avoid discussing pricing until they show interest..."
                  />
                  <p className="mt-2 text-xs text-gray-400">
                    These instructions will guide the AI during the call with this prospect.
                  </p>
                </div>
              </div>

              <div className="bg-dark-hover px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleSaveInstructions}
                  disabled={savingInstructions}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {savingInstructions ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInstructionsModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-dark-border shadow-sm px-4 py-2 bg-dark-card text-base font-medium text-gray-300 hover:bg-dark-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Prospect Modal */}
      {showAddModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAddModal(false)}></div>

            <div className="inline-block align-bottom bg-dark-card rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleAddProspect}>
                <div className="bg-dark-card px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-100">
                      Add New Prospect
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="text-gray-400 hover:text-gray-300"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300">Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full border border-dark-border rounded-md shadow-sm py-2 px-3 bg-dark-hover text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="mt-1 block w-full border border-dark-border rounded-md shadow-sm py-2 px-3 bg-dark-hover text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="john@company.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">Phone *</label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="mt-1 block w-full border border-dark-border rounded-md shadow-sm py-2 px-3 bg-dark-hover text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="+972525703444"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">Company *</label>
                      <input
                        type="text"
                        required
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="mt-1 block w-full border border-dark-border rounded-md shadow-sm py-2 px-3 bg-dark-hover text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="TechCorp"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">Role *</label>
                      <input
                        type="text"
                        required
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="mt-1 block w-full border border-dark-border rounded-md shadow-sm py-2 px-3 bg-dark-hover text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="VP of Sales"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">Industry</label>
                      <input
                        type="text"
                        value={formData.industry}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                        className="mt-1 block w-full border border-dark-border rounded-md shadow-sm py-2 px-3 bg-dark-hover text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Technology"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">Company Size</label>
                      <input
                        type="number"
                        value={formData.company_size}
                        onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                        className="mt-1 block w-full border border-dark-border rounded-md shadow-sm py-2 px-3 bg-dark-hover text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="250"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">
                        Custom Call Instructions (Optional)
                      </label>
                      <textarea
                        value={formData.custom_instructions}
                        onChange={(e) => setFormData({ ...formData, custom_instructions: e.target.value })}
                        rows={3}
                        className="mt-1 block w-full border border-dark-border rounded-md shadow-sm py-2 px-3 bg-dark-hover text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="E.g., Focus on cost savings, mention competitor X, avoid discussing pricing..."
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        Specific instructions to guide the AI during the call
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-dark-hover px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {submitting ? 'Adding...' : 'Add Prospect'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-dark-border shadow-sm px-4 py-2 bg-dark-card text-base font-medium text-gray-300 hover:bg-dark-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Conversation Viewer Modal */}
      {selectedCallId && (
        <ConversationViewer
          callId={selectedCallId}
          callType={selectedCallType}
          prospectName={selectedProspectName}
          onClose={() => setSelectedCallId(null)}
        />
      )}

      {/* Prospect Detail Modal */}
      {showDetailModal && detailProspect && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDetailModal(false)}></div>

            <div className="inline-block align-bottom bg-dark-card rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-dark-card px-4 pt-5 pb-4 sm:p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl leading-6 font-bold text-gray-100">
                      {detailProspect.name}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">{detailProspect.role}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-400 hover:text-gray-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider border-b border-dark-border pb-2">
                      Contact Information
                    </h4>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Email</label>
                      <p className="text-sm text-gray-100">{detailProspect.email || 'N/A'}</p>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Phone</label>
                      <p className="text-sm text-gray-100">{detailProspect.phone || 'N/A'}</p>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Status</label>
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          detailProspect.status === 'new'
                            ? 'bg-gray-100 text-gray-800'
                            : detailProspect.status === 'researched'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {detailProspect.status}
                      </span>
                    </div>
                  </div>

                  {/* Company Information */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider border-b border-dark-border pb-2">
                      Company Information
                    </h4>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Company</label>
                      <p className="text-sm text-gray-100">{detailProspect.company}</p>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Industry</label>
                      <p className="text-sm text-gray-100">{detailProspect.industry || 'N/A'}</p>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Company Size</label>
                      <p className="text-sm text-gray-100">
                        {detailProspect.company_size ? `${detailProspect.company_size} employees` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Research Data */}
                {detailProspect.research_data && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider border-b border-dark-border pb-2 mb-4">
                      Research Insights
                    </h4>
                    <div className="bg-dark-hover p-4 rounded-md">
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{detailProspect.research_data}</p>
                    </div>
                  </div>
                )}

                {/* Success Probability */}
                {detailProspect.success_probability && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider border-b border-dark-border pb-2 mb-4">
                      Success Probability
                    </h4>
                    <div className="flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                      <span className="text-2xl font-bold text-gray-100">{detailProspect.success_probability}%</span>
                      <span className="text-sm text-gray-400 ml-2">conversion likelihood</span>
                    </div>
                  </div>
                )}

                {/* Custom Instructions */}
                {detailProspect.custom_instructions && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider border-b border-dark-border pb-2 mb-4">
                      Custom Call Instructions
                    </h4>
                    <div className="bg-dark-hover p-4 rounded-md">
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{detailProspect.custom_instructions}</p>
                    </div>
                  </div>
                )}

                {/* Conversation History */}
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider border-b border-dark-border pb-2 mb-4">
                    Conversation History
                  </h4>
                  {loadingConversations ? (
                    <div className="text-center py-4 text-gray-400 text-sm">Loading conversations...</div>
                  ) : prospectConversations.length === 0 ? (
                    <div className="text-center py-4 text-gray-400 text-sm">No conversations yet</div>
                  ) : (
                    <div className="space-y-2">
                      {prospectConversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          className="bg-dark-hover p-3 rounded-md hover:bg-opacity-80 cursor-pointer transition-colors"
                          onClick={() => handleViewConversation(conversation.id, conversation.call_type, detailProspect.name)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {conversation.call_type === 'voice' ? (
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                  <Phone className="w-4 h-4 text-white" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                                  <MessageCircle className="w-4 h-4 text-white" />
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-100">
                                  {conversation.call_type === 'voice' ? 'Voice Call' : 'WhatsApp'}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {new Date(conversation.created_at).toLocaleString()} • {conversation.message_count} messages
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full ${
                                  conversation.status === 'completed'
                                    ? 'bg-gray-700 text-gray-300'
                                    : conversation.status === 'in_progress'
                                    ? 'bg-green-900 text-green-300'
                                    : 'bg-yellow-900 text-yellow-300'
                                }`}
                              >
                                {conversation.status}
                              </span>
                              <Eye className="w-4 h-4 text-gray-400" />
                            </div>
                          </div>
                          {conversation.outcome && (
                            <div className="mt-2 text-xs text-gray-400">
                              Outcome: {conversation.outcome}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-6 pt-6 border-t border-dark-border flex justify-end gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDetailModal(false);
                      handleOpenInstructions(detailProspect);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-dark-border text-sm font-medium rounded text-gray-300 bg-dark-card hover:bg-dark-hover"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Instructions
                  </button>

                  {detailProspect.status !== 'contacted' && (
                    <>
                      {!detailProspect.success_probability && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDetailModal(false);
                            handleResearch(detailProspect.id);
                          }}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                          <Brain className="w-4 h-4 mr-2" />
                          Run Research
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDetailModal(false);
                          handleStartCall(detailProspect.id, 'voice');
                        }}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Start Voice Call
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDetailModal(false);
                          handleStartCall(detailProspect.id, 'whatsapp');
                        }}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded text-white bg-emerald-600 hover:bg-emerald-700"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        WhatsApp Campaign
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
