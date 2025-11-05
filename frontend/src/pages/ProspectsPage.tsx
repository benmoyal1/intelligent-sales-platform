import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { prospectsApi, callsApi } from '../api/client';
import { Search, Brain, Phone, TrendingUp, Plus, X, Edit2, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';

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
        <div className="text-gray-600">Loading prospects...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Prospects</h1>
          <p className="text-gray-600 mt-2">Manage and research prospects for outbound calls</p>
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
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredProspects.length)} of {filteredProspects.length} results
          {searchQuery && ` (filtered from ${prospects.length} total)`}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prospect
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Success Probability
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Instructions
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentProspects.map((prospect) => {
              const research = prospect.research_data
                ? JSON.parse(prospect.research_data)
                : null;

              return (
                <tr key={prospect.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{prospect.name}</div>
                      <div className="text-sm text-gray-500">{prospect.role}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{prospect.company}</div>
                    <div className="text-sm text-gray-500">{prospect.industry}</div>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {prospect.success_probability ? (
                      <div className="flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
                        {prospect.success_probability}%
                      </div>
                    ) : (
                      <button
                        onClick={() => handleResearch(prospect.id)}
                        disabled={researchingId === prospect.id}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 disabled:opacity-50"
                      >
                        <Brain className="w-3 h-3 mr-1" />
                        {researchingId === prospect.id ? 'Researching...' : 'Research'}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleOpenInstructions(prospect)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      {prospect.custom_instructions ? 'View/Edit' : 'Add'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
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
        <div className="text-center py-12 text-gray-500">
          {searchQuery ? 'No prospects match your search' : 'No prospects found'}
        </div>
      )}

      {/* Instructions Modal */}
      {showInstructionsModal && selectedProspect && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowInstructionsModal(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Custom Call Instructions
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowInstructionsModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    <strong>Prospect:</strong> {selectedProspect.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Company:</strong> {selectedProspect.company}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instructions for AI Agent (Optional)
                  </label>
                  <textarea
                    value={instructionsText}
                    onChange={(e) => setInstructionsText(e.target.value)}
                    rows={6}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="E.g., Focus on cost savings, mention competitor X, avoid discussing pricing until they show interest..."
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    These instructions will guide the AI during the call with this prospect.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
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
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleAddProspect}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Add New Prospect
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="john@company.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone *</label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="+972525703444"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Company *</label>
                      <input
                        type="text"
                        required
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="TechCorp"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Role *</label>
                      <input
                        type="text"
                        required
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="VP of Sales"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Industry</label>
                      <input
                        type="text"
                        value={formData.industry}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Technology"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Company Size</label>
                      <input
                        type="number"
                        value={formData.company_size}
                        onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="250"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Custom Call Instructions (Optional)
                      </label>
                      <textarea
                        value={formData.custom_instructions}
                        onChange={(e) => setFormData({ ...formData, custom_instructions: e.target.value })}
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="E.g., Focus on cost savings, mention competitor X, avoid discussing pricing..."
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Specific instructions to guide the AI during the call
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
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
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
