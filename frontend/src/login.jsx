import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { ShieldCheck, Mail, Hash, ArrowLeft } from 'lucide-react';

export default function Login() {
  const [step, setStep] = useState('email'); // 'email' or 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // STEP 1: Send OTP to Email
 // In your Login.jsx
const handleSendOtp = async (e) => {
  e.preventDefault();
  
  const { error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      shouldCreateUser: true,
      // REMOVE emailRedirectTo here so it doesn't force a link redirect
    },
  });

  if (error) {
    alert(error.message);
  } else {
    // Keep the user on this page to enter the code
    setStep('otp'); 
  }
};

const handleVerifyOtp = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError(null);

  console.log("Attempting verification for:", email, "with code:", otp);

  const { data, error } = await supabase.auth.verifyOtp({
    email: email,
    token: otp,
    type: 'magiclink', // Ensure this matches your template!
  });

  if (error) {
    console.error("VERIFICATION FAILED:", error.message);
    setError(error.message);
  } else {
    console.log("VERIFICATION SUCCESS! Session:", data.session);
    // DO NOT manually redirect here. 
    // App.jsx's onAuthStateChange should detect this and handle it.
  }
  setLoading(false);
};


  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-violet-600/10 rounded-xl mb-4">
            <ShieldCheck className="w-8 h-8 text-violet-500" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {step === 'email' ? 'Welcome to IVS' : 'Enter Verification Code'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {step === 'email' ? 'Enter your email to receive a code' : `We sent a code to ${email}`}
          </p>
        </div>

        {/* Error Display */}
        {error && <div className="mb-4 p-3 bg-red-900/20 text-red-400 text-sm rounded-lg border border-red-900/50">{error}</div>}

        {/* Form */}
        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input 
                type="email" required onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-violet-500 transition"
                placeholder="name@ivs-corp.com"
              />
            </div>
            <button disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 rounded-lg transition">
              {loading ? "Sending..." : "Send Verification Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">OTP Code</label>
            <div className="relative">
              <input 
                type="text" required onChange={(e) => setOtp(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-violet-500 transition text-center tracking-widest text-lg"
                placeholder="000000"
              />
            </div>
            <button disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 rounded-lg transition">
              {loading ? "Verifying..." : "Verify & Sign In"}
            </button>
            <button type="button" onClick={() => setStep('email')} className="w-full text-slate-500 text-xs hover:text-white flex items-center justify-center gap-2">
              <ArrowLeft size={12} /> Change email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}