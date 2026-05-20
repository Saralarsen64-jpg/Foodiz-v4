import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Fingerprint, Eye, EyeOff, CheckCircle2, ChevronRight } from 'lucide-react';

const AdminAuth = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'pin' | 'biometric' | 'setup' | 'login'>('pin');
  const [pin, setPin] = useState(['', '', '', '', '', '', '', '']); // 8 chiffres pour 04052021
  const [password, setPassword] = useState('');
  const [confirmPassword, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);

  const MASTER_PIN = "04052021";

  useEffect(() => {
    const savedPwd = localStorage.getItem('foodiz_admin_pwd_v1');
    if (savedPwd) setIsFirstTime(false);
  }, []);

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value && index < 7) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      nextInput?.focus();
    }

    if (index === 7 && value) {
      const fullPin = newPin.join('');
      if (fullPin === MASTER_PIN) {
        setStep('biometric');
        setTimeout(() => {
          setStep(isFirstTime ? 'setup' : 'login');
        }, 2500);
      } else {
        setPin(['', '', '', '', '', '', '', '']);
        document.getElementById('pin-0')?.focus();
      }
    }
  };

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === confirmPassword && password.length > 5) {
      localStorage.setItem('foodiz_admin_pwd_v1', password);
      navigate('/admin');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const savedPwd = localStorage.getItem('foodiz_admin_pwd_v1');
    if (password === savedPwd) {
      navigate('/admin');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-foodiz-gold/5 rounded-full blur-[120px]" />
      
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-foodiz-card border border-foodiz-gold/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
            <Shield size={32} className="text-foodiz-gold" />
          </div>
          <h1 className="foodiz-title text-2xl text-foodiz-cream uppercase tracking-[0.2em]">Accès Sécurisé</h1>
          <p className="text-foodiz-gray text-[10px] uppercase tracking-widest mt-2">Direction Foodiz • Authentification</p>
        </div>

        {step === 'pin' && (
          <div className="space-y-8 animate-fade-in">
            <p className="text-center text-foodiz-gray text-sm italic">Saisissez votre clé de sécurité</p>
            <div className="flex justify-between gap-2">
              {pin.map((digit, i) => (
                <input
                  key={i}
                  id={`pin-${i}`}
                  type="password"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(i, e.target.value)}
                  className="w-10 h-14 bg-foodiz-card border border-foodiz-gold/20 rounded-xl text-center text-xl font-bold text-foodiz-gold focus:border-foodiz-gold focus:outline-none transition-all"
                />
              ))}
            </div>
          </div>
        )}

        {step === 'biometric' && (
          <div className="text-center space-y-6 animate-pulse">
            <div className="relative inline-block">
              <Fingerprint size={80} className="text-foodiz-gold mx-auto opacity-50" />
              <div className="absolute inset-0 border-2 border-foodiz-gold rounded-full animate-ping opacity-20" />
            </div>
            <p className="text-foodiz-gold text-xs font-bold uppercase tracking-[0.3em]">Scan Face ID en cours...</p>
          </div>
        )}

        {step === 'setup' && (
          <form onSubmit={handleSetup} className="space-y-4 animate-fade-in">
            <div className="foodiz-card p-6 bg-foodiz-gold/5 border-foodiz-gold/20 mb-6">
              <p className="text-xs text-foodiz-cream font-medium">Première connexion détectée.</p>
              <p className="text-[10px] text-foodiz-gray mt-1 leading-relaxed">
                Veuillez définir votre mot de passe personnel pour les futurs accès admin.
              </p>
            </div>
            <div className="foodiz-card p-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-foodiz-gray">Nouveau mot de passe</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-none text-foodiz-cream outline-none mt-2 text-sm"
                placeholder="••••••••"
              />
            </div>
            <div className="foodiz-card p-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-foodiz-gray">Confirmer</label>
              <input 
                type="password"
                value={confirmPassword}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="w-full bg-transparent border-none text-foodiz-cream outline-none mt-2 text-sm"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="w-full foodiz-btn !py-4 flex items-center justify-center gap-2">
              <CheckCircle2 size={18} /> Initialiser mon compte
            </button>
          </form>
        )}

        {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-6 animate-fade-in">
            <div className="foodiz-card p-4 relative overflow-hidden group">
              <div className="absolute inset-y-0 left-0 w-1 bg-foodiz-gold/30" />
              <label className="text-[10px] font-bold uppercase tracking-widest text-foodiz-gray flex items-center gap-2">
                <Lock size={12} className="text-foodiz-gold" /> Mot de passe Admin
              </label>
              <div className="relative flex items-center gap-2 mt-2">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent border-none text-foodiz-cream outline-none text-lg tracking-widest"
                  autoFocus
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-foodiz-gold/40">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="w-full foodiz-btn !py-4 flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(216,168,79,0.2)]">
              Entrer dans le Panel <ChevronRight size={18} />
            </button>
          </form>
        )}
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-10 left-0 right-0 text-center opacity-20">
        <p className="font-serif italic text-foodiz-cream text-lg">Foodiz Elite</p>
      </div>
    </div>
  );
};

export default AdminAuth;
