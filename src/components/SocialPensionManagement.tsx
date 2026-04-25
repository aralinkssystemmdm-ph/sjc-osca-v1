import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Check, 
  X, 
  AlertCircle,
  ChevronDown,
  Eye,
  Loader2,
  Plus,
  MoreVertical,
  Filter,
  RefreshCw,
  Pencil
} from 'lucide-react';
import { cn } from '../lib/utils';
import BenefitsProfileModal from './BenefitsProfileModal';
import { motion, AnimatePresence } from 'motion/react';

interface SocialPensionManagementProps {
  hideHeader?: boolean;
}

export default function SocialPensionManagement({ 
  hideHeader = false
}: SocialPensionManagementProps) {
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [barangayFilter, setBarangayFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  const fetchApplications = async () => {
    setIsLoading(true);
    setApplications([]); 
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("https://api-dbosca.phoenix.com.ph/api/social-pension", {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      const result = await response.json();
      
      // Handle the data structure: { data: { ...fields } } or { data: [ ... ] }
      // User requirement: const records = response.data?.data ? [response.data.data] : [];
      let records: any[] = [];
      if (result.data) {
        if (Array.isArray(result.data)) {
          records = result.data;
        } else if (result.data.data) {
          records = Array.isArray(result.data.data) ? result.data.data : [result.data.data];
        } else {
          records = [result.data];
        }
      }
      
      // Normalize data types (age to Number) and handle status
      const normalizedApps = records.map(app => ({
        ...app,
        age: Number(app.age || 0),
        reg_status: (app.reg_status || "pending").toLowerCase()
      }));
      
      setApplications(normalizedApps);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const updateStatus = async (id: number, selectedStatus: string) => {
    try {
      const token = localStorage.getItem("token");
      const record = applications.find(a => a.id === id);
      if (!record) return;

      const payload = {
        citizen_id: record.citizen_id || "",
        first_name: record.first_name || "",
        middle_name: record.middle_name || "",
        last_name: record.last_name || "",
        birth_date: record.birth_date || "",
        age: Number(record.age || 0),
        contact_number: record.contact_number || "",
        barangay: record.barangay || "",
        city_municipality: record.city_municipality || "",
        province: record.province || "",
        scid_number: record.scid_number || "",
        reg_status: selectedStatus.toLowerCase()
      };

      const response = await fetch(`https://api-dbosca.phoenix.com.ph/api/social-pension/${id}`, {
        method: "PUT",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Update local state immediately as requested
        setApplications(prev => prev.map(app => 
          app.id === id ? { ...app, reg_status: selectedStatus.toLowerCase(), age: Number(app.age || 0) } : app
        ));
        setOpenDropdownId(null);
      } else {
        const errData = await response.json();
        alert("Failed to update status: " + (errData.message || response.statusText));
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("An error occurred");
    }
  };

  const [isEditMode, setIsEditMode] = useState(false);

  const handleNewEntry = () => {
    // Create a template for a new application
    const newApp: any = {
      id: undefined, // Indicates new entry
      first_name: "",
      middle_name: "",
      last_name: "",
      suffix: "",
      birth_date: "",
      age: 0,
      sex: "",
      civil_status: "",
      citizenship: "Filipino",
      address: "",
      barangay: "",
      city_municipality: "",
      province: "",
      scid_number: "",
      citizen_id: "",
      email: "",
      registration_type: "Social Pension (DSWD)",
      reg_status: "pending"
    };
    setSelectedApp(newApp);
    setIsEditMode(true);
    setIsProfileModalOpen(true);
  };

  const handleSave = async (updatedApp: any) => {
    try {
      const token = localStorage.getItem("token");
      const isNew = !updatedApp.id;
      const url = isNew 
        ? "https://api-dbosca.phoenix.com.ph/api/social-pension" 
        : `https://api-dbosca.phoenix.com.ph/api/social-pension/${updatedApp.id}`;
      
      const payload = {
        citizen_id: updatedApp.citizen_id || "",
        scid_number: updatedApp.scid_number || "",
        first_name: updatedApp.first_name || "",
        middle_name: updatedApp.middle_name || "",
        last_name: updatedApp.last_name || "",
        birth_date: updatedApp.birth_date || "",
        age: Number(updatedApp.age || 0),
        contact_number: updatedApp.contact_number || "",
        barangay: updatedApp.barangay || "",
        city_municipality: updatedApp.city_municipality || "",
        province: updatedApp.province || "",
        reg_status: (updatedApp.reg_status || "pending").toLowerCase()
      };

      const response = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await fetchApplications();
        setIsProfileModalOpen(false);
        setSelectedApp(null);
        alert(isNew ? "New application created successfully" : "Profile updated successfully");
      } else {
        const data = await response.json();
        alert(data.message || `Failed to ${isNew ? 'create' : 'update'} profile`);
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("An error occurred during save");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this application?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://api-dbosca.phoenix.com.ph/api/social-pension/${id}`, {
        method: "DELETE",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        setApplications(prev => prev.filter(app => app.id !== id));
        setOpenDropdownId(null);
        alert("Application deleted successfully");
      } else {
        alert("Failed to delete application");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("An error occurred during deletion");
    }
  };

  const filteredApplications = applications.filter(app => {
    const fullName = (app.full_name || `${app.first_name || ''} ${app.last_name || ''}`).toLowerCase();
    const scid = String(app.scid_number || "");
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || scid.includes(searchTerm);
    const matchesBarangay = barangayFilter === 'All' || app.barangay === barangayFilter;
    
    const appStatus = (app.reg_status || "").toLowerCase();
    const matchesStatus = statusFilter === 'All' || appStatus === statusFilter.toLowerCase();
    return matchesSearch && matchesBarangay && matchesStatus;
  });

  const uniqueBarangays = ['All', ...Array.from(new Set(applications.map(app => app.barangay).filter(Boolean)))].sort();

  const handleViewProfile = (app: any, isEdit = false) => {
    const mappedApp = {
      ...app,
      registration_type: "Social Pension (DSWD)"
    };
    setSelectedApp(mappedApp);
    setIsEditMode(isEdit);
    setIsProfileModalOpen(true);
  };

  const formatDate = (date: any) => {
    if (!date) return '---';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return '---';
    }
  };

  return (
    <div className="space-y-8">
      {!hideHeader && (
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Social Pension (DSWD)</h2>
            <p className="text-slate-500 font-medium mt-1">Benefit Application Registry</p>
          </div>
          <button 
            className="flex items-center gap-2 px-6 py-3 bg-[#ef4444] text-white rounded-xl font-semibold text-sm hover:bg-red-600 transition-all shadow-sm"
            onClick={handleNewEntry}
          >
            <Plus className="w-4 h-4" />
            New Entry
          </button>
        </header>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name or SCID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-1 focus:ring-[#ef4444] focus:border-[#ef4444] outline-none transition-all shadow-sm"
          />
        </div>
        <div className="relative">
          <select 
            value={barangayFilter}
            onChange={(e) => setBarangayFilter(e.target.value)}
            className="appearance-none bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm font-medium text-slate-900 outline-none focus:ring-1 focus:ring-[#ef4444] focus:border-[#ef4444] transition-all cursor-pointer min-w-[160px] shadow-sm"
          >
            {uniqueBarangays.map(bg => <option key={bg} value={bg}>{bg}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm font-medium text-slate-900 outline-none focus:ring-1 focus:ring-[#ef4444] focus:border-[#ef4444] transition-all cursor-pointer min-w-[160px] shadow-sm"
          >
            <option value="All">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="disapproved">Disapproved</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 tracking-wider">Applied Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 tracking-wider">SCID Number</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 tracking-wider">Full Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 tracking-wider text-center">Age</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 tracking-wider">Barangay</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 tracking-wider text-center">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 tracking-wider text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-12 h-12 text-[#EF4444] animate-spin" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Applications...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <AlertCircle className="w-16 h-16 text-slate-100" />
                      <p className="text-slate-400 font-medium text-lg">No records found matching criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app, index) => {
                  const normalizedStatus = (app.reg_status || "pending").toLowerCase();
                  return (
                    <tr key={app.id || `app-${index}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-xs font-medium text-slate-500">{formatDate(app.created_at)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-semibold text-[#ef4444] tracking-wider">{app.scid_number || '---'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {app.full_name || `${app.last_name || ''}, ${app.first_name || ''} ${app.middle_name || ''}`}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <p className="text-sm font-medium text-slate-600">{app.age}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-medium text-slate-500">{app.barangay || '---'}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className={cn(
                          "inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider",
                          normalizedStatus === 'approved' && "bg-emerald-50 text-emerald-600 border-emerald-100",
                          normalizedStatus === 'pending' && "bg-amber-50 text-amber-600 border-amber-100",
                          (normalizedStatus === 'rejected' || normalizedStatus === 'disapproved') && "bg-rose-50 text-rose-600 border-rose-100",
                        )}>
                          {normalizedStatus || 'pending'}
                        </div>
                      </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(openDropdownId === app.id ? null : app.id);
                          }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>
                        
                        <AnimatePresence>
                          {openDropdownId === app.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-30" 
                                onClick={() => setOpenDropdownId(null)}
                              />
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-40"
                              >
                                <button 
                                  onClick={() => {
                                    handleViewProfile(app, false);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-600 transition-all"
                                >
                                  <Eye className="w-4 h-4 text-slate-400" />
                                  View Profile
                                </button>
                                <button 
                                  onClick={() => updateStatus(app.id, 'approved')}
                                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-emerald-50 rounded-lg text-xs font-semibold text-emerald-600 transition-all"
                                >
                                  <Check className="w-4 h-4" />
                                  Approve
                                </button>
                                <button 
                                  onClick={() => updateStatus(app.id, 'disapproved')}
                                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-rose-50 rounded-lg text-xs font-semibold text-rose-600 transition-all"
                                >
                                  <X className="w-4 h-4" />
                                  Disapprove
                                </button>
                                <button 
                                  onClick={() => updateStatus(app.id, 'pending')}
                                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-amber-50 rounded-lg text-xs font-semibold text-amber-600 transition-all"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                  Move to Pending
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isProfileModalOpen && selectedApp && (
          <BenefitsProfileModal 
            application={selectedApp}
            isOpen={isProfileModalOpen}
            onClose={() => {
              setIsProfileModalOpen(false);
              setIsEditMode(false);
            }}
            onSave={handleSave} 
            initialIsEditing={isEditMode}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

