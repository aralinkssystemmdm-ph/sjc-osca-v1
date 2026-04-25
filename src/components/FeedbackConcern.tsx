import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  CheckCircle2, 
  Reply, 
  X,
  AlertCircle,
  ChevronDown,
  Download
} from 'lucide-react';
import { cn, exportToCSV } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface FeedbackItem {
  id: number;
  submitted_at: string;
  sender_name?: string;
  first_name?: string;
  last_name?: string;
  message: string;
  category: string;
  contact?: {
    address?: string;
    contact_number?: string;
    email?: string;
  };
  status: 'Pending' | 'Resolved';
  response?: string;
}

export default function FeedbackConcern() {
  const [data, setData] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [addressFilter, setAddressFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch Data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("https://api-dbosca.phoenix.com.ph/api/feedback-concerns", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });
      const result = await response.json();
      if (response.ok) {
        setData(result.data || []);
      } else {
        setError(result.message || "Failed to fetch feedback/concerns");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("An error occurred while fetching data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const itemText = (item.message || '').toString();
      const senderName = item.sender_name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Anonymous';
      const address = (item.contact?.address || '').toString();
      const search = (searchTerm || '').toLowerCase();
      const addrFilter = (addressFilter || '').toLowerCase();

      const matchesAddress = address.toLowerCase().includes(addrFilter);
      const matchesSearch = senderName.toLowerCase().includes(search) || 
                           itemText.toLowerCase().includes(search);
      return matchesAddress && matchesSearch;
    });
  }, [data, addressFilter, searchTerm]);

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Full Name',
      'Address',
      'Description',
      'Type',
      'Status'
    ];

    const dataToExport = filteredData.map(item => ({
      'Date': item.submitted_at,
      'Full Name': item.sender_name || `${item.first_name || ''} ${item.last_name || ''}`.trim(),
      'Address': item.contact?.address || 'N/A',
      'Description': item.message,
      'Type': item.category,
      'Status': item.status
    }));

    exportToCSV(dataToExport, headers, 'feedback_concern.csv');
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="space-y-10">
      <header className="mb-10">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Feedback & Concern</h2>
        <p className="text-slate-500 font-medium mt-1">Citizen Engagement Monitoring</p>
      </header>

      {/* Main Card Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600 font-bold text-sm">
            <AlertCircle className="w-5 h-5 transition-transform group-hover:scale-110" />
            {error}
          </div>
        )}
        
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
          <div className="flex flex-wrap items-center gap-4 flex-1">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-1 focus:ring-[#ef4444] focus:border-[#ef4444] outline-none transition-all shadow-sm"
              />
            </div>

            {/* Address Filter */}
            <div className="relative min-w-[200px]">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input 
                type="text"
                placeholder="Filter by Address"
                value={addressFilter}
                onChange={(e) => setAddressFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-1 focus:ring-[#ef4444] focus:border-[#ef4444] outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={handleExportCSV}
              disabled={filteredData.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <div className="h-10 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Entries</span>
                <span className="text-sm font-bold text-slate-900 leading-none">{filteredData.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 tracking-wider">Full Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 tracking-wider">Address</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 tracking-wider font-center">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-10 h-10 border-4 border-slate-900/10 border-t-slate-900 rounded-full animate-spin" />
                      <p className="text-slate-400 font-medium text-lg tracking-tight">Fetching entries...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <MessageSquare className="w-16 h-16 text-slate-100" />
                      <p className="text-slate-400 font-medium text-lg tracking-tight">No feedback or concerns found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={item.id || `feedback-${index}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-5">
                      <p className="text-xs font-medium text-slate-500">
                        {formatDate(item.submitted_at)}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-semibold text-slate-900">
                        {item.sender_name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Anonymous'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">{item.contact?.contact_number || item.contact_number}</p>
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-slate-600">
                      {item.contact?.address || 'N/A'}
                    </td>
                    <td className="px-6 py-5 max-w-md">
                      <p className="text-sm text-slate-600 font-medium leading-relaxed">
                        {item.message}
                      </p>
                      {item.response && (
                        <div className="mt-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Response sent:</p>
                          <p className="text-xs text-emerald-800 font-medium italic leading-relaxed">"{item.response}"</p>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
