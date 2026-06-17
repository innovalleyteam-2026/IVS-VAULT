// Main Project Vault CRM Client view
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './login';
import AdminDashboard from './Admin';       // Your heavy, full CRM
import EmployeeDashboard from './EmployeeDashboard'; // Simplified project view
import ClientPortal from './ClientPortal';
import { LogOut } from 'lucide-react';
import { 
  projectAPI, 
  credentialAPI, 
  renewalAPI,
  notesAPI,
  remindersAPI,
  filesAPI,
  profilesAPI,
  projectSharesAPI,
  employeesAPI, // <--- Add this
  clientsAPI // Hooking up your explicit assignment mappings endpoints
} from './api';
import { 
  FolderKanban, KeyRound, CalendarClock, Cpu, Settings, 
  Lock, Unlock, Eye, Copy, RefreshCw, AlertCircle, Plus, 
  FileText, ShieldCheck, X, FileUp, ClipboardList, Users, UserCheck, EyeOff, Share2
} from 'lucide-react';

export default function App() {
    
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [credentials, setCredentials] = useState([]);
    const [renewals, setRenewals] = useState([]);
    
    // State arrays for resources
    const [notes, setNotes] = useState([]);
    const [reminders, setReminders] = useState([]);
    const [files, setFiles] = useState([]);
    
    // V2 STATE PANELS FOR ASSIGNMENT SYSTEMS
    const [profiles, setProfiles] = useState([]);
    const [allProfiles, setAllProfiles] = useState([]); // Cache for the modal selector input dropdown
    const [projectShares, setProjectShares] = useState([]); // Tracks existing permissions for the shared card
    const [sharingProject, setSharingProject] = useState(null); // Reference pointer to active project target
    const [showShareModal, setShowShareModal] = useState(false);
    const [userSession] = useState({ id: 'current-user-id', role: 'Admin', email: 'admin@vault.com' }); 

    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'employees', 'clients', 'renewals'
    const [projectSubTab, setProjectSubTab] = useState('overview'); // 'overview', 'credentials', 'notes', 'renewals', 'files'
    const [loading, setLoading] = useState(false);
    const [decryptedPasswords, setDecryptedPasswords] = useState({});
    
    const [editingCredential, setEditingCredential] = useState(null);
    const [editingNote, setEditingNote] = useState(null);
    const [editingReminder, setEditingReminder] = useState(null);

    // 👇 ADDED V2 CONTROLLERS FOR DYNAMIC SHARING SUB-TYPES
const [shareTargetType, setShareTargetType] = useState('employees'); // 'employees' or 'clients'
const [modalEmployees, setModalEmployees] = useState([]);
const [modalClients, setModalClients] = useState([]);
    
    const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload(); // Force refresh to redirect to login
  };
    // Project Form State containing all 7 core fields
    const [showNewProjModal, setShowNewProjModal] = useState(false);
    const [newProj, setNewProj] = useState({ 
        name: '', 
        client_name: '', 
        status: 'Active', 
        start_date: '', 
        due_date: '', 
        description: '', 
        remarks: '' 
    });

    // Password verification prompt modal state
    const [securityPrompt, setSecurityPrompt] = useState({ show: false, targetId: null, tokenInput: '' });

    // Fetch initial datasets conditional on sidebar selection paths
    useEffect(() => {
        loadDashboardData();
    }, [activeTab]);

    const loadDashboardData = async () => {
    setLoading(true);
    try {
        if (activeTab === 'dashboard') {
            const pRes = await projectAPI.getAll();
            setProjects(pRes.data || []);
        } else if (activeTab === 'renewals') {
            const rRes = await renewalAPI.getAll();
            setRenewals(rRes.data || []);
        } else if (activeTab === 'employees') {
            // 👇 Clean extraction directly from your custom staff table
            const empRes = await employeesAPI.getAll();
            setProfiles(empRes.data || []);
        } else if (activeTab === 'clients') {
            // 👇 Clean extraction directly from your custom client table
            const clRes = await clientsAPI.getAll();
            setProfiles(clRes.data || []);
            const pRes = await projectAPI.getAll();
            setProjects(pRes.data || []);
        }
    } catch (err) {
        console.error("API Fetch Error:", err.message);
    } finally {
        setLoading(false);
    }
};

    // 👇 INJECTED: Handles opening the share config console modal drawer safely
   const handleOpenSharingPanel = async (targetProject, event) => {
    event.stopPropagation(); // Avoids opening the standard project workspace views
    setSharingProject(targetProject);
    setLoading(true);
    setShareTargetType('employees'); // Reset selector filter window view to default employee mode
    try {
        // Query both discrete tables and current project assignments in parallel
        const [empRes, clRes, sActive] = await Promise.all([
            employeesAPI.getAll(),
            clientsAPI.getAll(),
            projectSharesAPI.getByProject(targetProject.id)
        ]);
        setModalEmployees(empRes.data || []);
        setModalClients(clRes.data || []);
        setProjectShares(sActive.data || []);
        setShowShareModal(true);
    } catch (err) {
        alert("Error syncing sharing registry metadata fields: " + err.message);
    } finally {
        setLoading(false);
    }
};

    // Aggregates sub-resources from Supabase when workspace focus switches
    const selectProjectWorkspace = async (project) => {
        setSelectedProject(project);
        setProjectSubTab('overview');
        setLoading(true);
        try {
            const [cRes, nRes, rRes, fRes] = await Promise.all([
                credentialAPI.getByProject(project.id),
                notesAPI.getByProject(project.id),
                remindersAPI.getByProject(project.id),
                filesAPI.getByProject(project.id)
            ]);
            setCredentials(cRes.data || []);
            setNotes(nRes.data || []);
            setReminders(rRes.data || []);
            setFiles(fRes.data || []);
            setDecryptedPasswords({}); 
        } catch (err) {
            console.error("API Error fetching project details:", err.message);
        } finally {
            setLoading(false);
        }
    };

    // Helper to pull fresh state variables following form submits
    const refreshProjectSubData = async (projectId) => {
        try {
            const [cRes, nRes, rRes, fRes] = await Promise.all([
                credentialAPI.getByProject(projectId),
                notesAPI.getByProject(projectId),
                remindersAPI.getByProject(projectId),
                filesAPI.getByProject(projectId)
            ]);
            setCredentials(cRes.data || []);
            setNotes(nRes.data || []);
            setReminders(rRes.data || []);
            setFiles(fRes.data || []);
        } catch (err) {
            console.error("Data reload collapse:", err.message);
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        try {
            await projectAPI.create(newProj);
            loadDashboardData();
            setShowNewProjModal(false);
            setNewProj({ name: '', client_name: '', status: 'Active', start_date: '', due_date: '', description: '', remarks: '' });
        } catch (err) {
            alert("Error creating project: " + err.message);
        }
    };

    const triggerPasswordDecryption = (credId) => {
        setSecurityPrompt({ show: true, targetId: credId, tokenInput: '' });
    };

    const handleVerifyDecrypt = async (e) => {
        e.preventDefault();
        const { targetId, tokenInput } = securityPrompt;
        if (!tokenInput) return;

        try {
            const res = await credentialAPI.decrypt(targetId, tokenInput);
            setDecryptedPasswords(prev => ({
                ...prev,
                [targetId]: res.data.password
            }));
            setSecurityPrompt({ show: false, targetId: null, tokenInput: '' });
        } catch (err) {
            alert(err.response?.data?.error || "Invalid master passphrase clearance.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col antialiased">
          {/* HEADER: Title and Logout are here */}
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white tracking-tight">IVS Admin</h1>
        
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-lg transition text-sm font-medium"
        >
          <LogOut size={16} />
          Logout
        </button>
      </header>

            {/* View container structure */}
            <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
                
                {/* Main Control Sidebar */}
                <aside className="w-full md:w-64 bg-slate-900/20 p-4 border-r border-slate-800/80 space-y-1">
                    <button 
                        onClick={() => { setActiveTab('dashboard'); setSelectedProject(null); }}
                        className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${activeTab === 'dashboard' && !selectedProject ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-900'}`}
                    >
                        <Cpu className="w-4 h-4" />
                        <span>System Dashboards</span>
                    </button>

                    <button 
                        onClick={() => { setActiveTab('employees'); setSelectedProject(null); }}
                        className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${activeTab === 'employees' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-900'}`}
                    >
                        <Users className="w-4 h-4" />
                        <span>Employees Management</span>
                    </button>

                    <button 
                        onClick={() => { setActiveTab('clients'); setSelectedProject(null); }}
                        className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${activeTab === 'clients' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-900'}`}
                    >
                        <UserCheck className="w-4 h-4" />
                        <span>Client Portals Mappings</span>
                    </button>
                    
                    <button 
                        onClick={() => { setActiveTab('renewals'); setSelectedProject(null); }}
                        className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${activeTab === 'renewals' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-900'}`}
                    >
                        <CalendarClock className="w-4 h-4" />
                        <span>Renewal Milestones</span>
                    </button>
                </aside>

                {/* Workspace Output Panels */}
                <main className="flex-1 p-6 overflow-y-auto">
                    {loading && (
                        <div className="text-center py-24 text-slate-500 font-mono text-xs animate-pulse tracking-wider">
                            Retrieving live datasets from database registry cluster...
                        </div>
                    )}

                    {/* 👇 UPDATED: EMPLOYEES TIER MANAGEMENT VIEW SHOWING ALL NAMES AND IDS */}
                    {!loading && activeTab === 'employees' && (
                        <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 shadow-xl">
                            <div>
                                <h2 className="text-md font-bold text-white">Internal Team Access Rights</h2>
                                <p className="text-xs text-slate-400">Map internal developer roles and credential viewing scopes natively across your infrastructure profiles.</p>
                            </div>
                            <div className="divide-y divide-slate-800/60 text-xs font-mono">
                                {profiles.length === 0 ? (
                                    <div className="text-center py-6 text-slate-500">No matching employee configuration profiles registered inside database indices.</div>
                                ) : (
                                    profiles.map(p => (
                                        <div key={p.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/40">
                                            <div>
                                                <span className="text-white font-sans font-bold text-sm block">{p.full_name || "Staff Member"}</span>
                                                <span className="text-[10px] text-slate-500">ID Key: <span className="text-slate-300 font-bold">{p.id}</span></span>
                                            </div>
                                            <select 
                                                defaultValue={p.role}
                                                onChange={async (e) => {
                                                    try {
                                                        await profilesAPI.update(p.id, { role: e.target.value });
                                                        alert("Role privileges synced successfully.");
                                                    } catch (err) { alert(err.message); }
                                                }}
                                                className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-violet-500 font-sans"
                                            >
                                                {['Super Admin', 'Admin', 'Manager', 'Staff', 'Viewer'].map(r => (
                                                    <option key={r} value={r}>{r}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* 👇 UPDATED: CLIENT PORTAL ACCOUNT ASSIGNMENT VIEW SHOWING ALL CLIENT NAMES AND IDS */}
                    {!loading && activeTab === 'clients' && (
                        <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 shadow-xl">
                            <div>
                                <h2 className="text-md font-bold text-white">External Customer Portal Assignments</h2>
                                <p className="text-xs text-slate-400">Link tenant client rows directly to an isolated project space view context constraint framework.</p>
                            </div>
                            <div className="divide-y divide-slate-800/60 text-xs font-mono">
                                {profiles.length === 0 ? (
                                    <div className="text-center py-6 text-slate-500">No exterior tenant profile nodes mapped inside storage indexes.</div>
                                ) : (
                                    profiles.map(p => (
                                        <div key={p.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/40">
                                            <div>
                                                <span className="text-white font-sans font-bold text-sm block">{p.full_name || "External Client Account"}</span>
                                                <span className="text-[10px] text-slate-400 font-mono block">Client ID: <span className="text-slate-300 font-bold">{p.id}</span></span>
                                                <span className="text-[11px] text-slate-500 block mt-0.5">Linked Workspace: <span className="text-violet-400 font-bold font-mono">{p.projects?.name || 'None (Isolated Space)'}</span></span>
                                            </div>
                                            <select 
                                                defaultValue={p.associated_project_id || ''}
                                                onChange={async (e) => {
                                                    try {
                                                        await profilesAPI.update(p.id, { role: 'Client', associated_project_id: e.target.value || null });
                                                        loadDashboardData();
                                                    } catch (err) { alert(err.message); }
                                                }}
                                                className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-violet-500 font-sans"
                                            >
                                                <option value="">-- Disconnect Portal Stream --</option>
                                                {projects.map(proj => <option key={proj.id} value={proj.id}>{proj.name}</option>)}
                                            </select>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* DASHBOARD ROUTE VIEW (INJECTED WITH INTERACTIVE SHARE ACTIONS ON EACH CARD ELEMENT) */}
                    {!loading && activeTab === 'dashboard' && !selectedProject && (
                        <div className="space-y-6 max-w-6xl mx-auto">
                            {/* Analytics KPI Matrix */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl shadow-sm">
                                    <span className="text-[10px] text-slate-400 font-bold tracking-wider block mb-1">TOTAL PROJECTS</span>
                                    <span className="text-2xl font-mono font-black text-white">{projects.length}</span>
                                </div>
                                <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl shadow-sm">
                                    <span className="text-[10px] text-slate-400 font-bold tracking-wider block mb-1">ACTIVE INSTANCES</span>
                                    <span className="text-2xl font-mono font-black text-emerald-400">
                                        {projects.filter(p => p.status === 'Active').length}
                                    </span>
                                </div>
                                <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl shadow-sm">
                                    <span className="text-[10px] text-slate-400 font-bold tracking-wider block mb-1">EXPIRING RENEWALS</span>
                                    <span className="text-2xl font-mono font-black text-amber-400">{renewals.length}</span>
                                </div>
                                <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl shadow-sm flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] text-slate-400 font-bold tracking-wider block">PROVISION ENGINE</span>
                                        <span className="text-xs text-violet-400 font-medium block mt-0.5">Deploy Client Cluster</span>
                                    </div>
                                    <button 
                                        onClick={() => setShowNewProjModal(true)}
                                        className="p-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition shadow-md"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Main Grid Workspaces List */}
                            <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-xl space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Client Pipelines Directory</h3>
                                
                                {projects.length === 0 ? (
                                    <div className="text-center py-12 text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-lg">
                                        No active workspaces compiled. Click the plus widget to deploy.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {projects.map(p => (
                                            <div 
                                                key={p.id}
                                                onClick={() => selectProjectWorkspace(p)}
                                                className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl cursor-pointer hover:border-violet-500 hover:bg-slate-900/40 transition flex flex-col justify-between space-y-3 shadow-sm group"
                                            >
                                                <div>
                                                    <div className="flex justify-between items-start gap-2">
                                                        <h4 className="text-sm font-bold text-white group-hover:text-violet-400 transition">{p.name}</h4>
                                                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${p.status === 'Active' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>{p.status}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-400">Client: {p.client_name}</p>
                                                    {p.description && (
                                                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-2 bg-slate-900/50 p-2 rounded border border-slate-800/30 font-sans">{p.description}</p>
                                                    )}
                                                </div>
                                                <div className="text-[10px] font-mono text-slate-500 border-t border-slate-900 pt-2 flex justify-between items-center">
                                                    {/* 👇 INJECTED SHARE ACTION LINK CONTROLLER LINK */}
                                                    <button 
                                                        type="button" 
                                                        onClick={(e) => handleOpenSharingPanel(p, e)}
                                                        className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-1.5 rounded-md font-sans font-semibold text-[11px] transition shadow-sm hover:border-slate-700"
                                                    >
                                                        <Share2 className="w-3.5 h-3.5 text-violet-400" /> Share Project
                                                    </button>
                                                    <span className="text-violet-500 text-[11px] group-hover:translate-x-0.5 transition-transform font-sans font-bold">Inspect →</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* DRILL DOWN DETAILED WORKSPACE VIEW */}
                    {!loading && selectedProject && (
                        <div className="max-w-5xl mx-auto space-y-6">
                            {/* Back Tracking Bar */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800/80 p-4 rounded-xl">
                                <div>
                                    <button onClick={() => setSelectedProject(null)} className="text-[11px] text-violet-400 hover:text-violet-300 transition font-mono block mb-1">← RETURN TO SYSTEM DIRECTORY</button>
                                    <h2 className="text-xl font-black text-white tracking-tight">{selectedProject.name}</h2>
                                    <p className="text-xs text-slate-400 font-medium">Account Owner: {selectedProject.client_name}</p>
                                </div>
                                <div className="flex bg-slate-950 p-1 border border-slate-800 rounded-lg font-mono text-[10px] divide-x divide-slate-800">
                                    <div className="px-3 py-1">Start: <span className="text-slate-300 font-bold">{selectedProject.start_date || 'N/A'}</span></div>
                                    <div className="px-3 py-1">Due: <span className="text-rose-400 font-bold">{selectedProject.due_date || 'N/A'}</span></div>
                                </div>
                            </div>

                            {/* Inside Project Mini Segment Tabs */}
                            <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-px">
                                {[
                                    { id: 'overview', name: 'Overview', icon: FileText },
                                    { id: 'credentials', name: 'Credentials', icon: KeyRound },
                                    { id: 'notes', name: 'NotePad', icon: ClipboardList },
                                    { id: 'renewals', name: 'Dues', icon: CalendarClock },
                                    { id: 'files', name: 'File Storage', icon: FileUp }
                                ].map(tab => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => { setProjectSubTab(tab.id); setEditingCredential(null); setEditingNote(null); setEditingReminder(null); }}
                                            className={`flex items-center space-x-2 px-4 py-2 border-b-2 text-xs font-semibold tracking-wide transition whitespace-nowrap ${projectSubTab === tab.id ? 'border-violet-500 text-white bg-slate-900/40' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                            <span>{tab.name}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* SUB-TAB CONTENTS */}
                            {projectSubTab === 'overview' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
                                        <div>
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Operational Description</h4>
                                            <p className="text-sm text-slate-300 bg-slate-950 p-4 rounded-lg border border-slate-800/40 whitespace-pre-line leading-relaxed">
                                                {selectedProject.description || "No project description summary defined for this tracking segment instance."}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Internal Remarks</h4>
                                        <p className="text-xs font-mono text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800/40 whitespace-pre-line">
                                            {selectedProject.remarks || "No internal administration remarks cataloged."}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* CREDENTIALS SUB-TAB INTERFACE WITH V2 GRANULAR SHARING TOGGLES */}
                            {projectSubTab === 'credentials' && (
                                <div className="space-y-6 animate-in fade-in duration-150">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Dynamic Form Console */}
                                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl h-fit">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                                    <Plus className="w-3.5 h-3.5 text-violet-500" />
                                                    <span>{editingCredential ? "Modify Asset Key Parameters" : "Register New Access Key"}</span>
                                                </h4>
                                                {editingCredential && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setEditingCredential(null)} 
                                                        className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 hover:text-white px-2 py-0.5 rounded transition"
                                                    >
                                                        Cancel Edit
                                                    </button>
                                                )}
                                            </div>

                                            <form 
                                                key={editingCredential ? `edit-${editingCredential.id}` : 'create-mode'}
                                                onSubmit={async (e) => {
                                                    e.preventDefault(); const form = e.target;
                                                    const payload = { project_id: selectedProject.id, title: form.title.value, category: form.category.value, login_url: form.login_url.value, auth_type: form.auth_type.value, email: form.email.value, username: form.username.value, plain_password: form.plain_password.value, remarks: form.remarks.value, client_visible: form.client_visible.checked, expiry_date: form.expiry_date.value || null };
                                                    try { if (editingCredential) { await credentialAPI.update(editingCredential.id, payload); setEditingCredential(null); } else { await credentialAPI.create(payload); } form.reset(); refreshProjectSubData(selectedProject.id); } catch (err) { alert("Action error: " + (err.response?.data?.error || err.message)); }
                                                }} 
                                                className="space-y-3 text-xs"
                                            >
                                                <div>
                                                    <label className="block text-slate-400 mb-1">Title *</label>
                                                    <input required name="title" type="text" defaultValue={editingCredential ? editingCredential.title : ""} placeholder="e.g. Main Hosting" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500" />
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-slate-400 mb-1">Category *</label>
                                                        <select name="category" defaultValue={editingCredential ? editingCredential.category : "Domain"} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white focus:outline-none focus:border-violet-500">
                                                            {['Domain', 'Hosting', 'Vercel', 'Supabase', 'Cloudflare', 'Google', 'Facebook', 'Instagram', 'LinkedIn', 'YouTube', 'GitHub', 'SMTP', 'WordPress', 'Database', 'Other'].map(cat => (
                                                                <option key={cat} value={cat}>{cat}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-slate-400 mb-1">Auth Type *</label>
                                                        <select name="auth_type" defaultValue={editingCredential ? editingCredential.auth_type : "Password"} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white focus:outline-none focus:border-violet-500">
                                                            <option value="Password">Password</option>
                                                            <option value="2FA Backup Code">2FA Backup Code</option>
                                                            <option value="API Token / Key">API Token / Key</option>
                                                            <option value="SSH Key / Cert">SSH Key / Cert</option>
                                                            <option value="OAuth Client ID">OAuth Client ID</option>
                                                            <option value="Other">Other Token Type</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-slate-400 mb-1">Login URL</label>
                                                    <input name="login_url" type="url" defaultValue={editingCredential ? editingCredential.login_url || "" : ""} placeholder="https://cpanel.host.com" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500" />
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-slate-400 mb-1">Email</label>
                                                        <input name="email" type="email" defaultValue={editingCredential ? editingCredential.email || "" : ""} placeholder="admin@gmail.com" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-slate-400 mb-1">Username</label>
                                                        <input name="username" type="text" defaultValue={editingCredential ? editingCredential.username || "" : ""} placeholder="abc_admin" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500" />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-slate-400 mb-1 font-medium text-slate-300">
                                                        {editingCredential ? "Password (Leave as dots to keep original)" : "Password *"}
                                                    </label>
                                                    <input required name="plain_password" type="password" defaultValue={editingCredential ? "••••••••••••" : ""} placeholder="••••••••" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-white focus:outline-none focus:border-violet-500" />
                                                </div>

                                                <div>
                                                    <label className="block text-slate-400 mb-1">Expiry Date</label>
                                                    <input name="expiry_date" type="date" defaultValue={editingCredential ? editingCredential.expiry_date || "" : ""} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-white focus:outline-none focus:border-violet-500" />
                                                </div>

                                                <div>
                                                    <label className="block text-slate-400 mb-1">Remarks</label>
                                                    <textarea name="remarks" rows={2} defaultValue={editingCredential ? editingCredential.remarks || "" : ""} placeholder="Configuration parameters..." className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500 resize-none" />
                                                </div>

                                                <label className="flex items-center space-x-3 p-2 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer select-none">
                                                    <input type="checkbox" name="client_visible" defaultChecked={editingCredential?.client_visible || false} className="accent-violet-500 w-4 h-4 rounded cursor-pointer" />
                                                    <div>
                                                        <span className="text-white font-bold block text-[11px]">Allow Client Visibility</span>
                                                        <span className="text-[10px] text-slate-500 block">Makes this single element key inspectable via Client dashboard portals.</span>
                                                    </div>
                                                </label>

                                                <button type="submit" className={`w-full py-2.5 rounded-lg font-semibold text-white transition shadow-md ${editingCredential ? "bg-amber-600 hover:bg-amber-700 shadow-amber-950/20" : "bg-violet-600 hover:bg-violet-700 shadow-violet-950/40"}`}>
                                                    {editingCredential ? "Commit Structural Upgrades" : "Commit Encrypted Vault Entry"}
                                                </button>
                                            </form>
                                        </div>

                                        {/* Display Records Grid Column */}
                                        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Access Key Registry</h3>
                                            {credentials.length === 0 ? (
                                                <div className="text-center py-12 text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-lg">No records mapped to this space.</div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {credentials.map(c => (
                                                        <div key={c.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between space-y-3 shadow-md group hover:border-slate-700 transition duration-150">
                                                            <div>
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <h4 className="text-sm font-bold text-white group-hover:text-violet-400 transition">{c.title}</h4>
                                                                        <span className="text-[9px] font-mono mt-0.5 text-slate-500 block">Auth Class: <span className="text-slate-400 font-bold">{c.auth_type}</span></span>
                                                                    </div>
                                                                    <div className="flex flex-col items-end gap-1.5">
                                                                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-violet-400 border border-slate-800/60">{c.category}</span>
                                                                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${c.client_visible ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/50" : "bg-slate-900 text-slate-500 border-slate-800"}`}>
                                                                            {c.client_visible ? "Portal Unmasked" : "Internal Hide"}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="space-y-1 font-mono text-[11px] text-slate-400 mt-3 bg-slate-900/30 p-2 rounded border border-slate-800/40">
                                                                    {c.login_url && <div className="truncate">URL: <a href={c.login_url} target="_blank" rel="noreferrer" className="text-violet-400 hover:underline">{c.login_url}</a></div>}
                                                                    {c.username && <div>User: <span className="text-slate-200">{c.username}</span></div>}
                                                                    {c.email && <div className="truncate">Email: <span className="text-slate-200">{c.email}</span></div>}
                                                                    {c.expiry_date && <div className="text-amber-400/80">Expires: {c.expiry_date}</div>}
                                                                    {c.remarks && <div className="text-slate-500 font-sans italic border-t border-slate-900/60 pt-1 mt-1 break-words">{c.remarks}</div>}
                                                                </div>
                                                            </div>

                                                            <div className="flex gap-2 items-center">
                                                                <div className="flex-1 flex justify-between items-center bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                                                                    <span className="font-mono text-xs tracking-wider">PWD: <span className="font-sans font-bold text-violet-400 select-all tracking-normal ml-1">{decryptedPasswords[c.id] || '••••••••'}</span></span>
                                                                    <button onClick={() => triggerPasswordDecryption(c.id)} className="p-1 text-slate-400 hover:text-white bg-slate-900 rounded border border-slate-800/40 transition"><Eye className="w-3.5 h-3.5" /></button>
                                                                </div>
                                                                <button type="button" onClick={() => { setEditingCredential(c); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-2 rounded-lg font-medium transition">Edit</button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* NOTEBOOKS TAB WITH SHARING ACCESSIBILITY CONTROLS */}
                            {projectSubTab === 'notes' && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
                                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl h-fit">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                                <Plus className="w-3.5 h-3.5 text-violet-500" />
                                                <span>{editingNote ? "Modify Notebook Fragment" : "Compose New Fragment"}</span>
                                            </h4>
                                            {editingNote && (
                                                <button type="button" onClick={() => setEditingNote(null)} className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 hover:text-white px-2 py-0.5 rounded transition">Cancel Edit</button>
                                            )}
                                        </div>

                                        <form 
                                            key={editingNote ? `edit-note-${editingNote.id}` : 'create-note-mode'}
                                            onSubmit={async (e) => {
                                                e.preventDefault(); const form = e.target;
                                                const payload = { project_id: selectedProject.id, title: form.title.value, content: form.content.value, client_visible: form.client_visible.checked, tags: form.tags.value || null };
                                                try { if (editingNote) { await notesAPI.update(editingNote.id, payload); setEditingNote(null); } else { await notesAPI.create(payload); } form.reset(); refreshProjectSubData(selectedProject.id); } catch(err) { alert(err.message); }
                                            }} 
                                            className="space-y-3 text-xs"
                                        >
                                            <input required name="title" defaultValue={editingNote ? editingNote.title : ""} placeholder="Note Title" className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-md text-white focus:outline-none focus:border-violet-500" />
                                            <textarea required name="content" defaultValue={editingNote ? editingNote.content : ""} placeholder="Content Markdown..." rows={6} className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-md font-mono text-white resize-none focus:outline-none focus:border-violet-500" />
                                            <input name="tags" defaultValue={editingNote ? editingNote.tags || "" : ""} placeholder="Tags (comma separated)" className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-md text-white focus:outline-none focus:border-violet-500" />
                                            
                                            <label className="flex items-center space-x-3 p-2 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer select-none">
                                                <input type="checkbox" name="client_visible" defaultChecked={editingNote?.client_visible || false} className="accent-violet-500 w-4 h-4 rounded cursor-pointer" />
                                                <div>
                                                    <span className="text-white font-bold block text-[11px]">Expose to Client Dashboard</span>
                                                    <span className="text-[10px] text-slate-500 block">Streams this notepad log into the authenticated external account portal.</span>
                                                </div>
                                            </label>

                                            <button type="submit" className={`w-full py-2 rounded-lg font-semibold text-white transition shadow-md ${editingNote ? "bg-amber-600 hover:bg-amber-700" : "bg-violet-600 hover:bg-violet-700"}`}>
                                                {editingNote ? "Save Operational Upgrades" : "Append Workspace Note"}
                                            </button>
                                        </form>
                                    </div>
                                    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Notebook Dashboard Stream</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {notes.map(n => (
                                                <div key={n.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 flex flex-col justify-between shadow-md group hover:border-slate-700 transition">
                                                    <div>
                                                        <div className="flex justify-between items-start border-b border-slate-900 pb-1.5">
                                                            <div>
                                                                <h4 className="text-xs font-bold text-white group-hover:text-violet-400 transition">{n.title}</h4>
                                                                <span className={`text-[8px] font-mono px-1 rounded border inline-block mt-1 ${n.client_visible ? "bg-violet-950/40 text-violet-400 border-violet-900/40" : "bg-slate-900 text-slate-500 border-slate-800"}`}>
                                                                    {n.client_visible ? "Client Shared" : "Internal Hidden"}
                                                                </span>
                                                            </div>
                                                            <span className="text-[9px] text-slate-500 font-mono">{new Date(n.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                        <p className="text-xs font-mono whitespace-pre-line text-slate-300 bg-slate-900/30 p-2 border border-slate-800/40 rounded mt-1">{n.content}</p>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-2">
                                                        <div className="flex gap-1 flex-wrap">{n.tags && n.tags.split(',').map(t=><span key={t} className="text-[9px] bg-violet-950/40 text-violet-400 border-violet-900/40 px-1.5 py-0.5 rounded">#{t.trim()}</span>)}</div>
                                                        <button type="button" onClick={() => { setEditingNote(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-[11px] font-sans text-slate-300 bg-slate-900 border border-slate-800 px-2 py-1 rounded hover:bg-slate-800 transition">Edit</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* RENEWALS / DUES SUB-TAB PROCEDURES */}
                            {projectSubTab === 'renewals' && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl h-fit">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Sync Tracker Node</h4>
                                        <form onSubmit={async (e) => {
                                            e.preventDefault(); const form = e.target;
                                            try { if(editingReminder) { await remindersAPI.update(editingReminder.id, { project_id: selectedProject.id, title: form.title.value, type: form.type.value, expiry_date: form.expiry_date.value, reminder_days: form.reminder_days.value }); setEditingReminder(null); } else { await remindersAPI.create({ project_id: selectedProject.id, title: form.title.value, type: form.type.value, expiry_date: form.expiry_date.value, reminder_days: form.reminder_days.value }); } form.reset(); refreshProjectSubData(selectedProject.id); } catch(err) { alert(err.message); }
                                        }} className="space-y-3 text-xs">
                                            <input required name="title" defaultValue={editingReminder ? editingReminder.title : ""} placeholder="Item Name" className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded text-white" />
                                            <select name="type" defaultValue={editingReminder ? editingReminder.type : "Domain Renewal"} className="w-full bg-slate-950 border border-slate-800 px-2 py-2 rounded text-white">
                                                {['Domain Renewal', 'Hosting Renewal', 'SSL Expiry', 'Subscription Renewals'].map(t=><option key={t} value={t}>{t}</option>)}
                                            </select>
                                            <input required name="expiry_date" type="date" defaultValue={editingReminder ? editingReminder.expiry_date : ""} className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded font-mono text-white" />
                                            <input name="reminder_days" type="number" defaultValue={editingReminder ? editingReminder.reminder_days : 30} className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded text-white" />
                                            <button type="submit" className="w-full bg-violet-600 py-2 rounded font-semibold text-white">Save Milestone Node</button>
                                        </form>
                                    </div>
                                    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-xl text-xs font-mono">
                                        <table className="w-full text-left border-collapse">
                                            <thead><tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50"><th className="p-2">Asset Name</th><th className="p-2">Type</th><th className="p-2 text-right">Target Expiry</th><th className="p-2 text-center">Action</th></tr></thead>
                                            <tbody className="divide-y divide-slate-800/40 text-slate-300">
                                                {reminders.map(r=><tr key={r.id} className="hover:bg-slate-900/20"><td className="p-2 font-bold text-white">{r.title}</td><td className="p-2 text-slate-400">{r.type}</td><td className="p-2 text-right text-rose-400 font-bold">{r.expiry_date}</td><td className="p-2 text-center"><button type="button" onClick={() => setEditingReminder(r)} className="bg-slate-900 px-2 py-0.5 border border-slate-800 rounded text-slate-400 hover:text-white">Edit</button></td></tr>)}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* STORAGE FILES SUB-TAB */}
                            {projectSubTab === 'files' && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl h-fit">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Push Cloud Metadata</h4>
                                        <form onSubmit={async (e) => {
                                            e.preventDefault(); const form = e.target; const picker = form.elements.file_picker;
                                            if(!picker.files || picker.files.length === 0) { alert("Choose file."); return; }
                                            const fReader = new FileReader(); fReader.readAsDataURL(picker.files[0]);
                                            fReader.onload = async () => {
                                                try { await filesAPI.create({ project_id: selectedProject.id, name: form.display_name.value || picker.files[0].name, file_type: form.file_type.value, client_visible: form.client_visible.checked, file_data: fReader.result }); form.reset(); refreshProjectSubData(selectedProject.id); } catch(err) { alert(err.message); }
                                            };
                                        }} className="space-y-3 text-xs">
                                            <input name="display_name" placeholder="Custom Display Title" className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded text-white" />
                                            <select name="file_type" className="w-full bg-slate-950 border border-slate-800 px-2 py-2 rounded text-white">
                                                {['Logo', 'PDFs', 'Contracts', 'Screenshots', 'Backups'].map(t=><option key={t} value={t}>{t}</option>)}
                                            </select>
                                            <label className="border border-dashed border-slate-800 p-4 rounded bg-slate-950 block text-center cursor-pointer text-slate-400"><input type="file" name="file_picker" className="hidden" />Upload Content File Buffer</label>
                                            <label className="flex items-center space-x-3 p-2 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer"><input type="checkbox" name="client_visible" className="accent-violet-500 w-4 h-4" /><div><span className="text-white font-bold block text-[11px]">Allow Client Download</span></div></label>
                                            <button type="submit" className="w-full bg-violet-600 py-2 rounded text-white font-bold">Stream Binary Node</button>
                                        </form>
                                    </div>
                                    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3 text-xs font-mono">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Attached Project Files</h3>
                                        {files.map(f => (
                                            <div key={f.id} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex justify-between items-center">
                                                <div className="truncate"><span className="text-white font-sans font-bold block truncate">{f.name}</span><span className="text-[9px] text-slate-500 block">Class: {f.file_type} • {f.client_visible ? <span className="text-violet-400 font-bold">Portal Visible</span> : "Internal Hidden"}</span></div>
                                                <div className="flex gap-2 items-center">
                                                    <button type="button" onClick={async () => { await filesAPI.update(f.id, { ...f, client_visible: !f.client_visible }); refreshProjectSubData(selectedProject.id); }} className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold border ${f.client_visible ? 'bg-violet-950 text-violet-400 border-violet-900' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>{f.client_visible ? "Hide Link" : "Share Portal"}</button>
                                                    {f.file_data && <a href={f.file_data} download={f.name} className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-slate-300">Get</a>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* GLOBAL RENEWALS SCHEDULE MATRIX */}
                    {!loading && activeTab === 'renewals' && (
                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl max-w-5xl mx-auto space-y-4">
                            <div><h3 className="text-md font-bold text-white mb-1">Global Milestone Renewal Schedule</h3><p className="text-xs text-slate-400 font-sans">Active monitoring logs of system assets approaching target expiries.</p></div>
                            <div className="overflow-x-auto border border-slate-800 rounded-lg bg-slate-950 font-mono text-xs"><table className="w-full text-left border-collapse"><thead><tr className="border-b border-slate-800 bg-slate-900/50 text-[10px] text-slate-400 uppercase tracking-wider"><th className="p-3">Tracked Item Name</th><th className="p-3">Category Type</th><th className="p-3 text-right">Target Expiry Date</th></tr></thead><tbody className="divide-y divide-slate-800/60">{renewals.map(r => (<tr key={r.id} className="hover:bg-slate-900/30 transition"><td className="p-3 font-semibold text-white">{r.title}</td><td className="p-3 text-slate-400">{r.type}</td><td className="p-3 text-right text-rose-400 font-bold">{r.expiry_date}</td></tr>))}</tbody></table></div>
                        </div>
                    )}
                </main>
            </div>

            {/* 👇 INJECTED MODAL CANVAS: ADMINISTRATIVE WORKSPACE SHARING PRIVILEGE CONSOLE */}
            {/* 👇 UPDATE: ADMINISTRATIVE WORKSPACE SHARING PRIVILEGE CONSOLE */}
{showShareModal && sharingProject && (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <button onClick={() => { setShowShareModal(false); setSharingProject(null); }} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            
            <div className="mb-4">
                <span className="text-[10px] font-mono tracking-wider text-violet-400 font-bold block mb-0.5">PUBLIC ASSIGNMENTS ACCESS CONTROL GATEWAY</span>
                <h3 className="text-md font-bold text-white">Share Project: <span className="text-violet-400 font-mono font-black">{sharingProject.name}</span></h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">Select a destination category path to provision secure cross-tenant infrastructure records.</p>
            </div>

            {/* 1. DYNAMIC TWO-OPTION VIEW SEGMENT PICKER TOGGLE */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 border border-slate-800 rounded-lg mb-4">
                <button 
                    type="button" 
                    onClick={() => setShareTargetType('employees')}
                    className={`py-1.5 text-xs font-semibold rounded-md transition ${shareTargetType === 'employees' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-900/50'}`}
                >
                    Share with Employees Team
                </button>
                <button 
                    type="button" 
                    onClick={() => setShareTargetType('clients')}
                    className={`py-1.5 text-xs font-semibold rounded-md transition ${shareTargetType === 'clients' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-900/50'}`}
                >
                    Share with Clients Portal
                </button>
            </div>

            {/* Account Selection and Permissions Input Bar */}
            <form onSubmit={async (e) => {
                e.preventDefault(); const form = e.target;
                if (!form.profile_id.value) { alert("Please select a valid identity target first."); return; }
                const payload = {
                    project_id: sharingProject.id,
                    profile_id: form.profile_id.value,
                    can_view: form.can_view.checked,
                    can_edit_credentials: form.can_edit_credentials.checked,
                    can_edit_notes: form.can_edit_notes.checked,
                    can_edit_files: form.can_edit_files.checked
                };
                try {
                    await projectSharesAPI.upsert(payload);
                    const freshShares = await projectSharesAPI.getByProject(sharingProject.id);
                    setProjectShares(freshShares.data || []);
                    alert("Access permissions successfully synchronized.");
                } catch(err) { alert(err.message); }
            }} className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-xs font-sans">
                
                <div>
                    <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                        {shareTargetType === 'employees' ? 'Select Target Employee *' : 'Select Target Client Account *'}
                    </label>
                    
                    {/* 2. CONTEXT SWITCHING SELECT LIST (SHOWING EXPLICIT NAMES AND EXTRACTED IDS) */}
                    <select required key={shareTargetType} name="profile_id" className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-2 text-white focus:outline-none font-mono text-[11px]">
                        <option value="">-- Choose Identity Target Node --</option>
                        {shareTargetType === 'employees' ? (
                            modalEmployees.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                    Name: {emp.full_name} | Emp ID: {emp.id.substring(0,8)}... ({emp.role})
                                </option>
                            ))
                        ) : (
                            modalClients.map(cl => (
                                <option key={cl.id} value={cl.id}>
                                    Client: {cl.full_name} | Client ID: {cl.id.substring(0,8)}... {cl.company_name ? `(${cl.company_name})` : ''}
                                </option>
                            ))
                        )}
                    </select>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-slate-300 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/40">
                    <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" name="can_view" defaultChecked={true} className="accent-violet-500 w-3.5 h-3.5" /> Read View</label>
                    <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" name="can_edit_credentials" className="accent-violet-500 w-3.5 h-3.5" /> Edit Credentials</label>
                    <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" name="can_edit_notes" className="accent-violet-500 w-3.5 h-3.5" /> Edit Notes</label>
                    <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" name="can_edit_files" className="accent-violet-500 w-3.5 h-3.5" /> Edit Files</label>
                </div>
                
                <button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-md font-bold transition text-xs shadow-md">
                    Commit Allocation Access Rights Matrix
                </button>
            </form>

            {/* Shared Permissions Ledger List Output Log */}
            <div className="mt-4 flex-1 overflow-y-auto space-y-2 border border-slate-800 p-3 bg-slate-950/40 rounded-xl text-xs">
                <h4 className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-2">Current Active Workspace Shares Log</h4>
                {projectShares.length === 0 ? (
                    <div className="text-center py-6 text-slate-600 italic font-mono">This tracking envelope has no customized user mapping privileges. Protected by system default overrides.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full font-mono text-left text-[11px] border-collapse">
                            <thead className="border-b border-slate-800 text-slate-500 uppercase font-bold text-[9px]">
                                <tr>
                                    <th className="pb-1.5">User Profile</th>
                                    <th className="pb-1.5 text-center">View</th>
                                    <th className="pb-1.5 text-center">Credentials</th>
                                    <th className="pb-1.5 text-center">Notes</th>
                                    <th className="pb-1.5 text-center">Files</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900/50 text-slate-300">
                                {projectShares.map(sh => (
                                    <tr key={sh.id} className="hover:bg-slate-900/20">
                                        <td className="py-2">
                                            <span className="text-white font-sans font-bold block">{sh.profiles?.full_name}</span>
                                            <span className="text-[9px] text-slate-500 font-mono">Role: {sh.profiles?.role}</span>
                                        </td>
                                        <td className="py-2 text-center text-emerald-400 font-black">{sh.can_view ? "✓" : "✗"}</td>
                                        <td className={`py-2 text-center font-black ${sh.can_edit_credentials ? "text-emerald-400" : "text-slate-600"}`}>{sh.can_edit_credentials ? "Edit" : "Read Only"}</td>
                                        <td className={`py-2 text-center font-black ${sh.can_edit_notes ? "text-emerald-400" : "text-slate-600"}`}>{sh.can_edit_notes ? "Edit" : "Read Only"}</td>
                                        <td className={`py-2 text-center font-black ${sh.can_edit_files ? "text-emerald-400" : "text-slate-600"}`}>{sh.can_edit_files ? "Edit" : "Read Only"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    </div>
)}

            {/* MODAL WINDOW: SYSTEM PROVISION PROJECT ROUTER CONTAINER */}
            {showNewProjModal && (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button onClick={() => setShowNewProjModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            <h3 className="text-lg font-bold text-white mb-1">Deploy Core Cluster</h3>
            
            <form onSubmit={handleCreateProject} className="space-y-4 text-xs mt-4">
                {/* Row 1: Project & Client */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-slate-400 mb-1">Project Name *</label><input required type="text" value={newProj.name} onChange={e => setNewProj({...newProj, name: e.target.value})} placeholder="e.g. ABC Real Estate" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none" /></div>
                    <div><label className="block text-slate-400 mb-1">Client Owner Name *</label><input required type="text" value={newProj.client_name} onChange={e => setNewProj({...newProj, client_name: e.target.value})} placeholder="e.g. John Doe" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none" /></div>
                </div>

                {/* Row 2: Email & Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-slate-400 mb-1">Email ID</label><input type="email" value={newProj.email} onChange={e => setNewProj({...newProj, email: e.target.value})} placeholder="client@example.com" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none" /></div>
                    <div><label className="block text-slate-400 mb-1">Phone Number</label><input type="tel" value={newProj.phone} onChange={e => setNewProj({...newProj, phone: e.target.value})} placeholder="10-digit" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none" /></div>
                </div>

                {/* Row 3: Status & Comments */}
                <div><label className="block text-slate-400 mb-1">Operational Lifecycle Status</label><select value={newProj.status} onChange={e => setNewProj({...newProj, status: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"><option value="Active">Active</option><option value="On Hold">On Hold</option><option value="Completed">Completed</option></select></div>
                
                <div>
                    <label className="block text-slate-400 mb-1">Comments</label>
                    <textarea 
                        value={newProj.comments} 
                        onChange={e => setNewProj({...newProj, comments: e.target.value})} 
                        placeholder="Add project notes here..." 
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none h-20 resize-none"
                    />
                </div>

                <button type="submit" className="w-full bg-violet-600 py-2.5 rounded-lg text-white font-bold transition shadow-md">Write Row Entry Instance</button>
            </form>
        </div>
    </div>
)}

            {/* CRYPTOGRAPHY CIPHER VERIFICATION GUARD */}
            {securityPrompt.show && (
                <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleVerifyDecrypt} className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-xl shadow-2xl p-5 space-y-4">
                        <div className="flex items-center space-x-2.5 text-amber-400 bg-amber-950/30 p-2.5 border border-amber-900/50 rounded-lg"><ShieldCheck className="w-5 h-5 shrink-0" /><p className="text-[11px] leading-snug font-sans font-medium">Warning: Operational decryption query requested.</p></div>
                        <input required autoFocus type="password" value={securityPrompt.tokenInput} onChange={e => setSecurityPrompt({...securityPrompt, tokenInput: e.target.value})} placeholder="Enter Master Token Key" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-violet-500" />
                        <div className="flex gap-2 text-xs font-sans"><button type="button" onClick={() => setSecurityPrompt({ show: false, targetId: null, tokenInput: '' })} className="flex-1 bg-slate-900 border border-slate-800 py-2 rounded-lg text-slate-300">Cancel</button><button type="submit" className="flex-1 bg-violet-600 text-white font-bold py-2 rounded-lg">Run Cipher Pass</button></div>
                    </form>
                </div>
            )}
        </div>
    );
}