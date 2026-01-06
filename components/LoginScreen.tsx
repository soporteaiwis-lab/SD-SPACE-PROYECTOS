import React, { useState } from 'react';
import { User } from '../types';

export const LoginScreen = ({ users, onLogin }: { users: User[], onLogin: (u: User) => void }) => {
  const [email, setEmail] = useState('soporte.aiwis@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    // Check dynamic password from user object
    // IF user password is '' (empty string), we accept empty input OR any input (for convenience)
    // IF user password is set, we match it.
    const storedPass = user?.password;
    const isPassCorrect = storedPass === '' || storedPass === password || (storedPass === '' && password === '1234');

    if (user && isPassCorrect) {
      onLogin(user);
    } else {
      setError('Credenciales inválidas. Contacte a soporte.aiwis@gmail.com si olvidó su clave.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-ada-900 rounded-2xl items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg">A</div>
          <h1 className="text-2xl font-bold text-ada-900">ADA Portal</h1>
          <p className="text-slate-500">Acceso Seguro Corporativo</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Corporativo</label>
              <input type="email" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-ada-500 outline-none" value={email} onChange={e => setEmail(e.target.value)} />
           </div>
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input type="password" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-ada-500 outline-none" value={password} onChange={e => setPassword(e.target.value)} placeholder="Su contraseña asignada" />
              <p className="text-[10px] text-slate-400 mt-1">* Deje en blanco si su usuario no requiere clave.</p>
           </div>
           {error && <p className="text-red-500 text-sm text-center">{error}</p>}
           <button type="submit" className="w-full bg-ada-600 hover:bg-ada-700 text-white font-bold py-3 rounded-lg transition-colors">Ingresar</button>
        </form>
        <div className="mt-6 text-center text-xs text-slate-400">Protected by ADA Auth v3.0</div>
      </div>
    </div>
  );
};