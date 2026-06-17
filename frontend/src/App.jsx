import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; 
import Login from './Login';
import AdminDashboard from './Admin';
import EmployeeDashboard from './EmployeeDashboard';
import ClientPortal from './ClientPortal';

export default function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null); 
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId) => {
    setLoading(true);
    
    // 1. Try to find the user in the Employees table
    const { data: employeeData } = await supabase
      .from('employees')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (employeeData) {
      setUserRole(employeeData.role.toLowerCase());
      setLoading(false);
      return;
    }

    // 2. Try to find the user in the Clients table
    const { data: clientData } = await supabase
      .from('clients')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (clientData) {
      setUserRole(clientData.role.toLowerCase());
    } else {
      console.warn("User ID not found in database:", userId);
      setUserRole('unassigned');
    }

    setLoading(false);
  };

  useEffect(() => {
    // Initial check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserRole(session.user.id);
      } else {
        setSession(null);
        setUserRole(null);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserRole(null);
    window.location.reload(); // Ensures state resets completely
  };

  if (loading) return <div className="p-10 text-white font-mono">Initializing System...</div>;
  if (!session) return <Login />;

  // ROLE-BASED ROUTING LOGIC
  switch (userRole) {
    case 'admin': 
      return <AdminDashboard onLogout={handleLogout} />;
    case 'staff': 
      return <EmployeeDashboard onLogout={handleLogout} />;
    case 'client': 
      return <ClientPortal onLogout={handleLogout} />;
    case 'unassigned':
      return (
        <div className="p-10 text-white">
          <h2>Account Pending Approval</h2>
          <p>Your account is created, but no role has been assigned yet.</p>
          <button onClick={handleLogout} className="bg-red-500 p-2 mt-4 rounded">Logout</button>
        </div>
      );
    default: 
      return (
        <div className="p-10 text-white">
          <h2>Access Denied</h2>
          <p>Role "{userRole}" is not authorized.</p>
          <button onClick={handleLogout} className="bg-red-500 p-2 mt-4 rounded">Logout and Try Again</button>
        </div>
      );
  }
}