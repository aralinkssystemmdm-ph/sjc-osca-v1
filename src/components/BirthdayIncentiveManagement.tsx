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

interface BirthdayIncentiveManagementProps {
  hideHeader?: boolean;
}

export default function BirthdayIncentiveManagement({ 
  hideHeader = false
}: BirthdayIncentiveManagementProps) {
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
    setApplications([]); // Reset state before fetch
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("https://api-dbosca.phoenix.com.ph/api/birthday-incentives", {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();
      const apps = Array.isArray(data.data?.data) ? data.data.data : (Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
      setApplications(apps);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const getCleanPath = (file: any) => {
    if (!file) return "";
    if (typeof file === "string" && file.startsWith("[")) {
      try {
        const parsed = JSON.parse(file);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const item = parsed[0];
          if (typeof item === 'string') return item;
          return item.path || item.file_path || file;
        }
      } catch (e) {}
    }
    if (Array.isArray(file) && file.length > 0) {
      const item = file[0];
      if (typeof item === 'string') return item;
      return item.path || item.file_path || "";
    }
    if (typeof file === "string" && file.startsWith("http")) {
       const parts = file.split('/storage/');
       if (parts.length > 1) return parts[1];
    }
    return file;
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const token = localStorage.getItem("token");
      const appToUpdate = applications.find(a => a.id === id);
      if (!appToUpdate) return;

      const fd = new FormData();
      
      // Required fields
      fd.append("citizen_id", appToUpdate.citizen_id || "");
      fd.append("scid_number", appToUpdate.scid_number || "");
      fd.append("first_name", appToUpdate.first_name || "");
      fd.append("middle_name", appToUpdate.middle_name || "");
      fd.append("last_name", appToUpdate.last_name || "");
      fd.append("birth_date", appToUpdate.birth_date || "");
      fd.append("age", String(appToUpdate.age || 0));
      fd.append("contact_number", appToUpdate.contact_number || "");
      fd.append("barangay", appToUpdate.barangay || "");
      fd.append("city_municipality", appToUpdate.city_municipality || "");
      fd.append("province", appToUpdate.province || "");
      fd.append("incentive_tier", appToUpdate.incentive_tier || "");
      fd.append("reg_status", status.toLowerCase());

      // Include existing birth certificate path
      const bcPath = getCleanPath(appToUpdate.birthcertificate || appToUpdate.birth_certificate || appToUpdate.birth_certificate_url);
      if (bcPath) fd.append("birthcertificate", bcPath);

      // Laravel PUT override
      fd.append("_method", "PUT");

      const response = await fetch(`https://api-dbosca.phoenix.com.ph/api/birthday-incentives/${id}`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: fd
      });

      if (response.ok) {
        setApplications(prev => prev.map(app => app.id === id ? { ...app, reg_status: status.toLowerCase() } : app));
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
    const newApp: any = {
      id: undefined,
      citizen_id: "",
      scid_number: "",
      first_name: "",
      middle_name: "",
      last_name: "",
      birth_date: "",
      age: "",
      contact_number: "",
      barangay: "",
      city_municipality: "",
      province: "",
      incentive_tier: "",
      reg_status: "pending"
    };
    setSelectedApp(newApp);
    setIsEditMode(true);
    setIsProfileModalOpen(true);
  };

  const handleSave = async (updatedApp: any, files?: File[]) => {
    try {
      const token = localStorage.getItem("token");
      const isNew = !updatedApp.id;
      const url = isNew 
        ? "https://api-dbosca.phoenix.com.ph/api/birthday-incentives" 
        : `https://api-dbosca.phoenix.com.ph/api/birthday-incentives/${updatedApp.id}`;
      
      const fd = new FormData();
      
      // Strict required fields filtering
      const requiredFields = [
        "citizen_id", "scid_number", "first_name", "middle_name", "last_name", 
        "birth_date", "age", "contact_number", "barangay", 
        "city_municipality", "province", "incentive_tier", "reg_status"
      ];

      requiredFields.forEach(field => {
        const val = updatedApp[field];
        if (val !== undefined && val !== null) {
          fd.append(field, String(val));
        } else {
          fd.append(field, "");
        }
      });

      // Handle Files - Only birthcertificate is allowed
      if (files && files.length > 0) {
        // Find the birth certificate file, avoiding captured photos
        const birthCertFile = files.find(f => 
          (f.name.toLowerCase().includes("birth") || f.name.toLowerCase().includes("certificate") || f.name === "document") && 
          f.name !== "captured_photo.jpg"
        );
        
        if (birthCertFile) {
          fd.append("birthcertificate", birthCertFile);
        }
      } else if (!isNew) {
        // If updating and no new file, preserve existing birthcertificate path if available
        const existingBc = getCleanPath(updatedApp.birthcertificate || updatedApp.birth_certificate || updatedApp.birth_certificate_url);
        if (existingBc) fd.append("birthcertificate", existingBc);
      }

      if (!isNew) {
        fd.append("_method", "PUT");
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: fd
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
      const response = await fetch(`https://api-dbosca.phoenix.com.ph/api/birthday-incentives/${id}`, {
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
    const fullName = `${app.first_name} ${app.last_name}`.toLowerCase();
    const scid = app.scid_number || "";
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || scid.includes(searchTerm);
    const matchesBarangay = barangayFilter === 'All' || app.barangay === barangayFilter;
    const matchesStatus = statusFilter === 'All' || app.reg_status === statusFilter.toLowerCase();
    return matchesSearch && matchesBarangay && matchesStatus;
  });

  const uniqueBarangays = ['All', ...Array.from(new Set(applications.map(app => app.barangay).filter(Boolean)))].sort();

  const handleViewProfile = (app: any, isEdit = false) => {
    const mappedApp = {
      ...app,
      registration_type: "Birthday Cash Incentive"
    };
    setSelectedApp(mappedApp);
    setIsEditMode(isEdit);
    setIsProfileModalOpen(true);
  };

  const formatDate = (date: any) => {
    if (!date) return '---';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-8">
      {!hideHeader && (
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Birthday Cash Incentive</h2>
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
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Disapproved">Disapproved</option>
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
                filteredApplications.map((app, index) => (
                  <tr key={app.id || `app-${index}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-xs font-medium text-slate-500">{formatDate(app.created_at || app.registration_date)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-semibold text-[#ef4444] tracking-wider text-center">{app.scid_number || '---'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-900">
                        {app.last_name}, {app.first_name} {app.middle_name || ''}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <p className="text-sm font-medium text-slate-600">{app.incentive_tier || app.age}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-medium text-slate-500 text-center">{app.barangay}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider",
                        app.reg_status === 'approved' && "bg-emerald-50 text-emerald-600 border-emerald-100",
                        app.reg_status === 'pending' && "bg-amber-50 text-amber-600 border-amber-100",
                        (app.reg_status === 'rejected' || app.reg_status === 'disapproved') && "bg-rose-50 text-rose-600 border-rose-100",
                      )}>
                        {app.reg_status}
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
                                  View Details
                                </button>
                                <button 
                                  onClick={() => {
                                    handleViewProfile(app, true);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 rounded-lg text-xs font-semibold text-indigo-600 transition-all"
                                >
                                  <Pencil className="w-4 h-4 text-indigo-400" />
                                  Edit Profile
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
                                <button 
                                  onClick={() => handleDelete(app.id)}
                                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-rose-50 rounded-lg text-xs font-semibold text-rose-500 transition-all border-t border-slate-100"
                                >
                                  <X className="w-4 h-4 py-0.5" />
                                  Delete
                                </button>
                              </motion.div>
                            </>
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
