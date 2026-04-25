import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  ClipboardList,
  User,
  RefreshCw,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  MoreVertical,
  Eye,
  Edit3,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, exportToCSV } from '../lib/utils';
import { Application } from '../App';

interface MasterlistProps {
  onViewProfile: (app: Application) => void;
  refreshTrigger?: number;
  onMoveToPending: (citizenId: number) => void;
  onResetPassword: (id: number) => void;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export default function Masterlist({ onViewProfile, refreshTrigger, onMoveToPending, onResetPassword }: MasterlistProps) {
  const [masterlistData, setMasterlistData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVitalStatuses, setSelectedVitalStatuses] = useState<string[]>([]);
  const [barangay, setBarangay] = useState('');
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<any>(null);

  const fetchMasterlist = useCallback(async (page: number = 1) => {
    setIsLoading(true);
    setError(null);
    setMasterlistData([]); // Reset data before fetch
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {
        "Accept": "application/json"
      };
      
      if (token && token !== 'undefined' && token !== 'null') {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('per_page', '10');
      
      if (selectedVitalStatuses.length > 0) {
        // Pass as comma-separated string for vital_status support in backend
        params.append('vital_status', selectedVitalStatuses.join(','));
      }
      
      if (barangay) {
        params.append('barangay', barangay);
      }
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const url = `https://api-dbosca.phoenix.com.ph/api/masterlist?${params.toString()}`;
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      let data = [];
      if (result.data && Array.isArray(result.data.data)) {
        data = result.data.data;
      } else if (Array.isArray(result.data)) {
        data = result.data;
      } else if (Array.isArray(result)) {
        data = result;
      }
      setMasterlistData(data);
      if (result.meta) {
        setPagination(result.meta);
      } else if (result.data && result.data.meta) {
        setPagination(result.data.meta);
      }
    } catch (err) {
      console.error("FETCH MASTERLIST ERROR:", err);
      setError("Failed to load masterlist data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, selectedVitalStatuses, barangay]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMasterlist(1);
    }, 300); // Small debounce for real-time search
    return () => clearTimeout(timer);
  }, [searchTerm, selectedVitalStatuses, barangay, fetchMasterlist, refreshTrigger]);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    if (openDropdownId !== null) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [openDropdownId]);

  const toggleVitalStatus = (status: string) => {
    setSelectedVitalStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
  };

  const updateStatus = async (id: number, status: string) => {
    // ... existing updateStatus remains for other status changes if needed
    // but we'll use handleMoveToPending for the specific action
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {
        "Accept": "application/json",
        "Content-Type": "application/json"
      };
      if (token && token !== 'undefined' && token !== 'null') {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Determine if it's a citizen_id or application_id
      // If the ID is large, it's likely a citizen_id
      const isCitizenId = id > 1000000; // Heuristic or check if we have context
      const endpoint = isCitizenId 
        ? `https://api-dbosca.phoenix.com.ph/api/masterlist/${id}`
        : `https://api-dbosca.phoenix.com.ph/api/applications/${id}`;

      const res = await fetch(endpoint, {
        method: "PUT",
        headers,
        body: JSON.stringify({ reg_status: status })
      });

      if (res.ok) {
        alert(`Status updated to ${status}`);
        fetchMasterlist(pagination?.current_page || 1);
      } else {
        const data = await res.json();
        alert(`Update failed: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("Update failed");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMasterlist(1);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '---';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}-${day}-${year}`;
    } catch (e) {
      return dateString;
    }
  };

  const formatFullName = (item: any) => {
    const parts = [
      item.first_name,
      item.middle_name,
      item.last_name,
      item.suffix
    ].filter(Boolean);
    return parts.join(' ').toUpperCase();
  };

  const handleViewProfileClick = (item: any) => {
    // Map the fields to match the Application interface expected by ProfileModal
    // Ensure all fields from API response are preserved exactly
    const mappedApp: Application = {
      ...item,
      id: item.application_id || item.id || item.citizen_id,
      application_id: item.application_id || item.id,
      citizen_id: item.citizen_id,
      // Ensure support_inkind_details is used if kind_support_details is present
      support_inkind_details: item.support_inkind_details || item.kind_support_details,
    };
    
    onViewProfile(mappedApp);
  };

  const handleExportCSV = () => {
    const headers = [
      'SCID Number',
      'Name',
      'Birth Date',
      'Barangay',
      'Registration Type',
      'Issued ID'
    ];

    const dataToExport = masterlistData.map(item => ({
      'SCID Number': item.scid_number || '',
      'Name': formatFullName(item),
      'Birth Date': formatDate(item.birth_date),
      'Barangay': item.barangay || '',
      'Registration Type': item.registration_type || 'OFFICIAL',
      'Issued ID': item.id_status === 'new' ? 'Not Issued' : 'Issued'
    }));

    exportToCSV(dataToExport, headers, 'masterlist.csv');
  };

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Masterlist</h2>
        <p className="text-slate-500 font-medium mt-1">Official Registry (SCID Protocol)</p>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-4 flex-1">
            <form onSubmit={handleSearch} className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-1 focus:ring-[#ef4444] focus:border-[#ef4444] outline-none transition-all"
              />
            </form>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => toggleVitalStatus('active')}
                className={cn(
                  "px-5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  selectedVitalStatuses.includes('active')
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Active
              </button>
              <button
                onClick={() => toggleVitalStatus('deceased')}
                className={cn(
                  "px-5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  selectedVitalStatuses.includes('deceased')
                    ? "bg-white text-red-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Deceased
              </button>
            </div>

            <div className="relative">
              <select 
                value={barangay}
                onChange={(e) => setBarangay(e.target.value)}
                className="pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 appearance-none focus:ring-1 focus:ring-[#ef4444] focus:border-[#ef4444] outline-none transition-all cursor-pointer"
              >
                <option value="">All Barangays</option>
                <option value="Barangay 1">Barangay 1</option>
                <option value="Barangay 2">Barangay 2</option>
                <option value="Barangay 3">Barangay 3</option>
                <option value="Barangay 4">Barangay 4</option>
                <option value="Barangay 5">Barangay 5</option>
                <option value="Sta. Ana">Sta. Ana</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleExportCSV}
              disabled={isLoading || masterlistData.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 tracking-wider">SCID Number</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 tracking-wider">Full Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 tracking-wider text-center">Birth Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 tracking-wider text-center">Barangay</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 tracking-wider text-center">Date Approved</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 tracking-wider text-center">Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 tracking-wider text-center">ID Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 tracking-wider text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-8 py-32 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-8 h-8 animate-spin" />
                      <p className="font-medium text-sm">Fetching registry...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-8 py-32 text-center">
                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="text-red-500 font-medium">{error}</p>
                  </td>
                </tr>
              ) : masterlistData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-8 py-32 text-center text-slate-400 font-medium">
                    No registry records found
                  </td>
                </tr>
              ) : (
                masterlistData.map((item) => (
                  <tr key={item.id || item.citizen_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-[#ef4444] font-mono">
                        {item.scid_number || '---'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatFullName(item)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <p className="text-xs font-medium text-slate-600">
                        {formatDate(item.birth_date)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <p className="text-xs font-semibold text-slate-700">
                        {item.barangay || '---'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <p className="text-xs font-medium text-slate-500">
                        {formatDate(item.date_created)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center text-[10px] font-bold text-slate-400 tracking-wider">
                      {item.registration_type || 'OFFICIAL'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        (() => {
                          const status = (item.id_status || 'NEW').toString().toLowerCase();
                          if (status === 'new' || status === 'pending') return "bg-amber-50 text-amber-600 border border-amber-200";
                          if (status === 'printed') return "bg-blue-50 text-blue-600 border border-blue-200";
                          if (status === 'released' || status === 'issued') return "bg-indigo-50 text-indigo-600 border border-indigo-200";
                          if (status === 'for releasing') return "bg-blue-50 text-blue-600 border border-blue-200"; // Same as printed
                          if (status === 'rejected' || status === 'cancelled' || status === 'disapproved') return "bg-rose-50 text-rose-600 border border-rose-200";
                          if (status === 'approved') return "bg-emerald-50 text-emerald-600 border border-emerald-200";
                          return "bg-slate-50 text-slate-600 border border-slate-200";
                        })()
                      )}>
                        {item.id_status || 'NEW'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const rowId = item.id || item.citizen_id;
                            setOpenDropdownId(openDropdownId === rowId ? null : rowId);
                          }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>

                          <AnimatePresence>
                            {openDropdownId === (item.id || item.citizen_id) && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95, x: 10 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95, x: 10 }}
                                className="absolute right-12 top-1/2 -translate-y-1/2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 overflow-hidden origin-right"
                              >
                              <button 
                                onClick={() => {
                                  handleViewProfileClick(item);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                                View Profile
                              </button>
                              <button 
                                onClick={() => {
                                  handleViewProfileClick(item);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                                Edit Profile
                              </button>
                              <button 
                                onClick={() => {
                                  onResetPassword(item.id || item.citizen_id);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-colors"
                              >
                                <Key className="w-4 h-4" />
                                Reset Password
                              </button>
                              <div className="h-px bg-slate-50 my-1" />
                              <button 
                                onClick={() => {
                                  onMoveToPending(item.citizen_id);
                                  setOpenDropdownId(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-black text-amber-600 uppercase tracking-widest hover:bg-amber-50 transition-colors"
                              >
                                <RefreshCw className="w-4 h-4" />
                                Move to Pending
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.last_page > 1 && (
          <div className="mt-10 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Showing page {pagination.current_page} of {pagination.last_page} ({pagination.total} total)
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => fetchMasterlist(pagination.current_page - 1)}
                disabled={pagination.current_page === 1 || isLoading}
                className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 hover:text-[#0F172A] hover:bg-slate-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, pagination.last_page))].map((_, i) => {
                  let pageNum = pagination.current_page - 2 + i;
                  if (pagination.current_page <= 2) pageNum = i + 1;
                  if (pagination.current_page >= pagination.last_page - 1) pageNum = pagination.last_page - 4 + i;
                  
                  if (pageNum > 0 && pageNum <= pagination.last_page) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => fetchMasterlist(pageNum)}
                        className={cn(
                          "w-10 h-10 rounded-xl text-xs font-black transition-all",
                          pagination.current_page === pageNum 
                            ? "bg-slate-900 text-white shadow-lg shadow-slate-200" 
                            : "text-slate-400 hover:bg-slate-50"
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                })}
              </div>

              <button 
                onClick={() => fetchMasterlist(pagination.current_page + 1)}
                disabled={pagination.current_page === pagination.last_page || isLoading}
                className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 hover:text-[#0F172A] hover:bg-slate-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChevronDown(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
