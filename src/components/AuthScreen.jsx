import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import FloatingHearts from './FloatingHearts';
import { useAuth } from '../context/AuthContext';

const AuthScreen = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await api.login(username, password);
      
      if (data.user) login(data.user, data.token);
      else setError(data.message || 'Login failed');
    } catch (err) {
      setError('Something went wrong. Is the backend running?');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      <FloatingHearts />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/30 rounded-full blur-[100px]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", bounce: 0.4 }}
        className="bg-white/80 backdrop-blur-xl p-8 rounded-[3rem] shadow-[0_30px_70px_rgba(0,0,0,0.1)] w-full max-w-sm border-2 border-white relative z-10"
      >
        <div className="flex flex-col items-center mb-8 relative z-20">
           <div className="p-3 bg-white rounded-[2rem] shadow-xl border-4 border-primary/20 mb-4">
             <img src="/logo.png" className="w-20 h-20" alt="NoteBuddy Logo" />
           </div>
           <h1 className="text-4xl font-black text-primary drop-shadow-sm">NoteBuddy</h1>
           <p className="text-gray-600 font-bold text-sm text-center mt-2 px-4">A private world of memories. </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 relative z-20">
           <div className="space-y-1">
             <label className="text-[10px] font-black text-primary uppercase px-4 tracking-widest">Username</label>
             <input 
              type="text" 
              placeholder="Your name..." 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-primary outline-none font-bold shadow-inner text-gray-800" 
             />
           </div>
           <div className="space-y-1">
             <label className="text-[10px] font-black text-primary uppercase px-4 tracking-widest">Password</label>
             <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-primary outline-none font-bold shadow-inner text-gray-800" 
             />
           </div>
           {error && <p className="text-red-500 text-xs font-black text-center animate-bounce">{error}</p>}
           
           <button type="submit" className="btn-cute bg-primary text-white justify-center py-4 shadow-2xl shadow-primary/40 border-b-4 border-primary/20 active:border-b-0 hover:scale-[1.02] mt-2">
             Unlock Our Memories 🔑
           </button>
        </form>
      </motion.div>
    </div>
  );
};

export default AuthScreen;
