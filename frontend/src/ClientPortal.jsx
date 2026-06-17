import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function ClientPortal() {
  const [myProjects, setMyProjects] = useState([]);

  useEffect(() => {
    const fetchMyProjects = async () => {
      const user = supabase.auth.user(); // Ensure you have access to user ID
      
      // Get all project IDs shared with this specific client
      const { data: shares } = await supabase
        .from('text_shares')
        .select('project_id')
        .eq('profile_id', user.id);

      const projectIds = shares.map(s => s.project_id);

      // Fetch only those projects
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds);
        
      setMyProjects(projects || []);
    };
    fetchMyProjects();
  }, []);

  return (
    <div className="p-8 bg-slate-950 min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-6">Client Project Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {myProjects.map(p => (
          <div key={p.id} className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
            <h3 className="font-bold text-lg">{p.name}</h3>
            <p className="text-slate-400 text-sm mt-2">{p.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}