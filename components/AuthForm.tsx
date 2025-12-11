import React, { useState } from 'react';
import { User } from '../types';
import { Lock, User as UserIcon, Mail, UserX } from 'lucide-react';

interface AuthFormProps {
  onLogin: (user: User) => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate Auth
    const mockUser: User = {
      id: `user-${Math.random().toString(36).substr(2, 9)}`,
      email: email,
      username: username || email.split('@')[0],
      isGuest: false
    };
    
    localStorage.setItem('lexicon_user', JSON.stringify(mockUser));
    onLogin(mockUser);
  };

  const handleGuestLogin = () => {
    const guestUser: User = {
        id: 'guest',
        username: 'Guest',
        email: '',
        isGuest: true
    };
    onLogin(guestUser);
  };

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-700 p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blood to-transparent"></div>
      
      <h2 className="text-3xl font-horror text-center text-parchment mb-8 tracking-widest">
        {isRegistering ? 'INITIATE REGISTRATION' : 'SYSTEM ACCESS'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {isRegistering && (
           <div className="relative">
             <UserIcon className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
             <input
               type="text"
               placeholder="Agent ID"
               className="w-full bg-slate-950 border border-slate-700 p-3 pl-10 text-parchment focus:border-blood outline-none"
               value={username}
               onChange={(e) => setUsername(e.target.value)}
               required
             />
           </div>
        )}
        
        <div className="relative">
          <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
          <input
            type="email"
            placeholder="Secure Frequency (Email)"
            className="w-full bg-slate-950 border border-slate-700 p-3 pl-10 text-parchment focus:border-blood outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
          <input
            type="password"
            placeholder="Passphrase"
            className="w-full bg-slate-950 border border-slate-700 p-3 pl-10 text-parchment focus:border-blood outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button 
          type="submit"
          className="w-full py-3 bg-blood/20 border border-blood text-blood hover:bg-blood hover:text-white transition-colors uppercase tracking-widest font-bold"
        >
          {isRegistering ? 'Create Record' : 'Authenticate'}
        </button>
      </form>

      <div className="mt-4 flex flex-col gap-4 text-center">
        <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-slate-600 text-xs">OR</span>
            <div className="flex-grow border-t border-slate-800"></div>
        </div>

        <button 
            type="button"
            onClick={handleGuestLogin}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors uppercase tracking-widest text-sm flex items-center justify-center gap-2"
        >
            <UserX className="w-4 h-4" /> Initialize Guest Session
        </button>

        <button 
          onClick={() => setIsRegistering(!isRegistering)}
          className="text-xs text-slate-500 hover:text-spectral transition-colors uppercase tracking-widest mt-2"
        >
          {isRegistering ? 'Return to Login' : 'Register New Account'}
        </button>
      </div>
    </div>
  );
};