import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { LogOut, FolderKanban, CheckSquare, User, LayoutDashboard } from 'lucide-react';

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch projects assigned to this user
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      // Assuming you have a 'projects' table linked to employees
      const { data, error } = await supabase
        .from('projects') 
        .select('*'); 

      if (error) console.error("Error fetching projects:", error);
      else setProjects(data);
      setLoading(false);
    };

    if (activeTab === 'projects') fetchProjects();
  }, [activeTab]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-white">Employee Portal</h1>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-lg text-sm transition"
        >
          <LogOut size={16} /> Logout
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900/20 p-4 border-r border-slate-800/80 space-y-1">
          <button 
            onClick={() => setActiveTab('projects')}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'projects' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}
          >
            <FolderKanban size={18} />
            <span>Shared Projects</span>
          </button>
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'tasks' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}
          >
            <CheckSquare size={18} />
            <span>My Tasks</span>
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-6 capitalize">{activeTab}</h2>
          
          {loading ? (
            <div className="text-slate-500">Loading your data...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <div key={project.id} className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-indigo-500/50 transition">
                  <h3 className="font-semibold text-lg mb-2">{project.name}</h3>
                  <p className="text-slate-400 text-sm mb-4">{project.description}</p>
                  <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded">
                    {project.status || 'In Progress'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}