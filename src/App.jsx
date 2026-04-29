import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  Trophy, 
  Timer, 
  ChevronRight, 
  Save, 
  Lock, 
  BarChart3,
  LogOut,
  Users,
  Loader2,
  ChevronLeft,
  CheckCircle2,
  Edit3,
  QrCode,
  Copy,
  Info,
  X,
  Settings
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "demo",
  authDomain: "demo.firebaseapp.com",
  projectId: "demo-project"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'north-champions-2026';

// --- CONFIGURACIÓN GOOGLE SHEETS ---
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbz9gIOK2Qu5Jp5pwoEvrCAryFXtFdELR_ubpHxYw9DAGttXAIz3rutlkylP0H9LBLgH/exec"; 

const CRITERIA = [
  { id: 'creatividad', label: '1. Creatividad', max: 2, section: 'Desempeño' },
  { id: 'escenario', label: '2. Escenario, Espacio y Transiciones', max: 2, section: 'Desempeño' },
  { id: 'intensidad', label: '3. Intensidad, Proyección y Presencia', max: 2, section: 'Desempeño' },
  { id: 'imagen', label: '4. Imagen Urbana', max: 2, section: 'Desempeño' },
  { id: 'entretenimiento', label: '5. Entretenimiento / Atracción', max: 2, section: 'Desempeño' },
  { id: 'musicalidad', label: 'I. Musicalidad', max: 2, section: 'Habilidades' },
  { id: 'sincronizacion', label: 'II. Sincronización', max: 2, section: 'Habilidades' },
  { id: 'ejecucion', label: 'III. Ejecución', max: 2, section: 'Habilidades' },
  { id: 'dificultad', label: 'IV. Dificultad Estilos Urbanos', max: 2, section: 'Habilidades' },
  { id: 'variedad', label: 'V. Variety of Style', max: 2, section: 'Habilidades' },
];

const JURADOS = [
  { id: 'juez1', name: 'Jurado 1', pass: 'dance101' },
  { id: 'juez2', name: 'Jurado 2', pass: 'dance202' },
  { id: 'juez3', name: 'Jurado 3', pass: 'dance303' },
  { id: 'admin', name: 'Administrador', pass: 'master99' },
];

const CATEGORIAS = ['Pro', 'Amateur', 'Juvenil', 'Infantil'];

const PARTICIPANTES = [
  { id: 'g1', name: 'Urban Kings', category: 'Pro' },
  { id: 'g2', name: 'Dolls Crew', category: 'Amateur' },
  { id: 'g3', name: 'Flow Master', category: 'Pro' },
  { id: 'g4', name: 'Little Steppers', category: 'Infantil' },
  { id: 'g5', name: 'Next Gen', category: 'Juvenil' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [password, setPassword] = useState('');
  const [view, setView] = useState('login'); 
  const [scores, setScores] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [formScores, setFormScores] = useState({});
  const [message, setMessage] = useState(null);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [showQr, setShowQr] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');
  const [tempUrl, setTempUrl] = useState('');

  // 1. Auth Init - Regla 3: Autenticar antes de cualquier operación
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { 
        console.error("Error de autenticación:", err); 
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Listeners (Scores & Config) - Regla 1: Rutas estrictas
  useEffect(() => {
    if (!user) return;
    
    // Escuchar Puntajes - Colección (5 segmentos)
    const scoresRef = collection(db, 'artifacts', appId, 'public', 'data', 'scores');
    const unsubScores = onSnapshot(scoresRef, (snap) => {
      setScores(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Error scores:", err));

    // Escuchar Configuración (URL Pública) - Documento (6 segmentos)
    const configDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
    const unsubConfig = onSnapshot(configDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPublicUrl(data.publicUrl || '');
        setTempUrl(data.publicUrl || '');
      }
    }, (err) => console.error("Error settings:", err));

    return () => { unsubScores(); unsubConfig(); };
  }, [user]);

  // 3. Timer Logic
  useEffect(() => {
    let interval;
    if (timerRemaining > 0) {
      interval = setInterval(() => setTimerRemaining(prev => prev - 1), 1000);
    } else if (timerRemaining === 0 && view === 'success') {
      setView('categories');
      setSelectedGroup(null);
      setSelectedCategory(null);
    }
    return () => clearInterval(interval);
  }, [timerRemaining, view]);

  const handleLogin = () => {
    const found = JURADOS.find(j => j.pass === password);
    if (found) {
      setCurrentUserData(found);
      if (found.id === 'admin') setView('admin');
      else setView('categories');
      setPassword('');
    } else { 
      showMessage('Contraseña incorrecta', 'error'); 
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text: String(text), type });
    setTimeout(() => setMessage(null), 3000);
  };

  const savePublicUrl = async () => {
    if (!user) return;
    try {
      // Ruta de documento par (6 segmentos)
      const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
      await setDoc(configRef, { publicUrl: tempUrl }, { merge: true });
      showMessage("URL Configurada Correctamente");
    } catch (err) { 
      console.error(err);
      showMessage("Error al guardar URL", "error"); 
    }
  };

  const copyUrl = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showMessage("¡Copiado!");
    } catch (err) { showMessage("Error al copiar", "error"); }
    document.body.removeChild(textArea);
  };

  const saveScore = async (isEdit = false) => {
    if (!selectedGroup || !user || !currentUserData) return;
    const totalScore = Object.values(formScores).reduce((a, b) => a + (parseFloat(b) || 0), 0);
    const scoreId = `${selectedGroup.id}_${currentUserData.id}`;
    
    const payload = {
      participantId: selectedGroup.id,
      participantName: selectedGroup.name,
      category: selectedGroup.category,
      jurorId: currentUserData.id,
      jurorName: currentUserData.name,
      values: formScores,
      total: parseFloat(totalScore.toFixed(2)),
      timestamp: Date.now(),
      hasEdited: isEdit 
    };

    try {
      // Ruta de documento par (6 segmentos)
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'scores', scoreId), {
        ...payload,
        firestoreTimestamp: serverTimestamp()
      });
      
      if (GOOGLE_SHEETS_URL) {
        fetch(GOOGLE_SHEETS_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(err => console.error(err));
      }
      
      if (isEdit) {
        showMessage('¡Puntaje final guardado!');
        setView('categories');
        setSelectedGroup(null);
        setSelectedCategory(null);
      } else {
        setView('success');
        setTimerRemaining(20); 
      }
    } catch (error) { 
      console.error(error);
      showMessage('Error al guardar', 'error'); 
    }
  };

  const getAverageScore = (groupId) => {
    const groupScores = scores.filter(s => s.participantId === groupId);
    if (groupScores.length === 0) return "0.00";
    const sum = groupScores.reduce((acc, curr) => acc + (curr.total || 0), 0);
    return (sum / groupScores.length).toFixed(2);
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
      <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">North Champions 2026</p>
    </div>
  );

  if (view === 'login') return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white text-center">
      <div className="w-full max-w-md bg-slate-900 rounded-[3rem] p-12 shadow-2xl border border-slate-800">
        <div className="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-500/20">
          <Trophy size={40} />
        </div>
        <h1 className="text-3xl font-black tracking-tighter mb-2">NORTH CHAMPIONS</h1>
        <p className="text-indigo-400 font-bold text-[10px] uppercase tracking-[0.4em] mb-12">Official Scoring App</p>
        <input 
          type="password" 
          placeholder="Clave de Jurado"
          className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl p-6 mb-6 text-center text-2xl font-black tracking-widest outline-none focus:border-indigo-500 transition-all"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
        />
        <button onClick={handleLogin} className="w-full bg-indigo-600 hover:bg-indigo-500 py-6 rounded-2xl font-black text-lg active:scale-95 transition-all shadow-xl shadow-indigo-600/20">ENTRAR</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <header className="bg-slate-950 text-white p-5 sticky top-0 z-50 flex justify-between items-center shadow-2xl border-b border-indigo-900/30">
        <div className="flex flex-col">
          <span className="font-black text-xl tracking-tighter leading-none">NORTH CHAMPIONS</span>
          <span className="text-[10px] font-black text-indigo-500 tracking-widest uppercase">Series 2026</span>
        </div>
        <div className="flex items-center gap-4">
          {currentUserData && (
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentUserData.name}</span>
              <span className="text-[9px] text-green-500 font-bold flex items-center gap-1"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"/> Online</span>
            </div>
          )}
          <button onClick={() => setView('login')} className="bg-slate-800 p-2.5 rounded-xl hover:text-red-400 transition-all"><LogOut size={20} /></button>
        </div>
      </header>

      {message && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[200] px-10 py-4 rounded-full shadow-2xl font-black text-xs animate-in fade-in zoom-in duration-300 ${message.type === 'error' ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white'}`}>
          {String(message.text).toUpperCase()}
        </div>
      )}

      {/* MODAL QR MEJORADO */}
      {showQr && (
        <div className="fixed inset-0 bg-slate-950/95 z-[300] flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-sm text-center relative animate-in zoom-in duration-500 shadow-2xl">
            <button onClick={() => setShowQr(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-colors"><X size={28}/></button>
            <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600"><QrCode size={32}/></div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Escanea para Entrar</h3>
            <p className="text-slate-400 text-xs mb-10 font-bold uppercase tracking-widest leading-relaxed">Usa la cámara de tu celular para abrir la aplicación</p>
            
            <div className="bg-white p-6 rounded-[2.5rem] inline-block border-8 border-slate-50 mb-10 shadow-inner">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(publicUrl || window.location.href)}`} 
                alt="QR Code" 
                className="w-56 h-56 mx-auto"
              />
            </div>
            
            <div className="space-y-3">
               <button onClick={() => copyUrl(publicUrl || window.location.href)} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
                <Copy size={18}/> COPIAR ENLACE
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto p-6">
        
        {view === 'categories' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
              <div className="w-2 h-10 bg-indigo-600 rounded-full" />
              Selecciona Categoría
            </h2>
            <div className="grid grid-cols-1 gap-5">
              {CATEGORIAS.map(cat => (
                <button key={cat} onClick={() => { setSelectedCategory(cat); setView('groups'); }} className="bg-white p-10 rounded-[2.5rem] border-2 border-slate-100 shadow-sm hover:border-indigo-400 hover:shadow-2xl hover:-translate-y-1 transition-all group flex justify-between items-center text-left">
                  <div>
                    <span className="text-3xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors tracking-tight">{cat}</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ver Participantes</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                    <ChevronRight className="text-slate-300 group-hover:text-indigo-600" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {view === 'groups' && (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <button onClick={() => setView('categories')} className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest mb-6 hover:gap-3 transition-all">
              <ChevronLeft size={18}/> Volver a Categorías
            </button>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Grupos: <span className="text-indigo-600">{selectedCategory}</span></h2>
            <div className="space-y-4">
              {PARTICIPANTES.filter(p => p.category === selectedCategory).map(p => {
                const voted = scores.find(s => s.participantId === p.id && s.jurorId === (currentUserData ? currentUserData.id : ''));
                return (
                  <button key={p.id} onClick={() => { setSelectedGroup(p); setFormScores(voted?.values || {}); setView('form'); }} className={`w-full p-8 rounded-[2rem] flex justify-between items-center border-2 transition-all active:scale-[0.98] ${voted ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="text-left font-black text-2xl tracking-tight text-slate-800">
                      {p.name} 
                      {voted && <span className="block text-[9px] text-indigo-600 font-black uppercase mt-1 tracking-widest bg-white w-fit px-2 py-0.5 rounded-full border border-indigo-100">Votación Lista ✓</span>}
                    </div>
                    <ChevronRight className={voted ? 'text-indigo-400' : 'text-slate-200'} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {view === 'form' && selectedGroup && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-700">
            <button onClick={() => setView('groups')} className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest mb-4"><ChevronLeft size={18}/> Cancelar Calificación</button>
            <div className="bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border border-slate-200">
              <div className="bg-slate-950 p-10 text-white relative">
                <div className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] mb-2">{String(selectedGroup.category)} Series</div>
                <h2 className="text-4xl font-black tracking-tighter leading-none">{String(selectedGroup.name)}</h2>
                <div className="absolute top-10 right-10 opacity-10"><Trophy size={80}/></div>
              </div>
              <div className="p-10 space-y-12">
                {CRITERIA.map(c => (
                  <div key={c.id} className="space-y-3">
                    <div className="flex justify-between items-end px-1">
                      <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">{c.label}</label>
                      <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">MAX {c.max} PTS</span>
                    </div>
                    <input 
                      type="number" inputMode="decimal" min="0" max={c.max} step="0.1" placeholder="0.0" 
                      className="w-full bg-slate-50 border-4 border-slate-50 rounded-[1.5rem] p-6 text-4xl font-black text-indigo-600 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-200" 
                      value={formScores[c.id] || ''} 
                      onChange={(e) => { 
                        const val = parseFloat(e.target.value);
                        if(val > c.max) return; 
                        setFormScores({...formScores, [c.id]: e.target.value}); 
                      }} 
                    />
                  </div>
                ))}
                
                <div className="pt-10 border-t border-slate-100 sticky bottom-0 bg-white pb-6">
                  <div className="flex justify-between items-center mb-8 px-2">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-300 uppercase text-[10px] tracking-widest">Puntaje Total</span>
                      <span className="text-xs font-bold text-indigo-400">Promedio Automático</span>
                    </div>
                    <span className="text-7xl font-black text-indigo-600 tabular-nums tracking-tighter leading-none">
                      {Object.values(formScores).reduce((a, b) => a + (parseFloat(b) || 0), 0).toFixed(1)}
                    </span>
                  </div>
                  <button onClick={() => saveScore(scores.some(s => s.participantId === selectedGroup.id && s.jurorId === (currentUserData ? currentUserData.id : '')))} className="w-full bg-indigo-600 text-white py-7 rounded-[2rem] font-black text-2xl shadow-2xl shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-3">
                    ENVIAR VOTO <Save size={24}/>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'success' && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in duration-700">
            <div className="bg-green-100 text-green-600 w-28 h-28 rounded-full flex items-center justify-center mb-10 shadow-inner">
              <CheckCircle2 size={64} />
            </div>
            <h2 className="text-5xl font-black tracking-tighter text-slate-900 mb-4 leading-none">¡Voto Registrado!</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-12">Sincronizado con Google Sheets</p>
            
            <div className="bg-white p-12 rounded-[4rem] shadow-2xl border-4 border-amber-50 w-full max-w-sm">
              <div className="text-7xl font-black text-amber-500 mb-2 tabular-nums leading-none tracking-tighter">{timerRemaining}s</div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-10">Ventana de Corrección</p>
              <button onClick={() => setView('form')} className="w-full bg-amber-500 text-white py-6 rounded-3xl font-black text-lg flex items-center justify-center gap-3 mb-6 hover:bg-amber-400 active:scale-95 transition-all shadow-xl shadow-amber-500/20">
                <Edit3 size={24}/> EDITAR PUNTAJE
              </button>
              <button onClick={() => { setView('categories'); setSelectedGroup(null); }} className="text-slate-300 hover:text-slate-900 transition-colors font-black text-xs uppercase tracking-[0.2em]">Cerrar Votación Ahora</button>
            </div>
          </div>
        )}

        {view === 'admin' && (
          <div className="space-y-12 animate-in fade-in duration-700 pb-20">
            {/* PANEL DE CONEXIÓN CRÍTICO */}
            <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white shadow-2xl border-t-4 border-indigo-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-indigo-600 p-3 rounded-2xl"><Settings size={24}/></div>
                <h3 className="text-2xl font-black tracking-tight leading-none">Centro de Conexión</h3>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">URL Pública del Evento</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="text" 
                      placeholder="Pega aquí el link público..." 
                      className="flex-1 bg-slate-800 border-2 border-slate-700 rounded-2xl px-5 py-4 text-sm font-medium focus:border-indigo-500 outline-none transition-all"
                      value={tempUrl}
                      onChange={(e) => setTempUrl(e.target.value)}
                    />
                    <button onClick={savePublicUrl} className="bg-indigo-600 hover:bg-indigo-500 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Configurar</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button onClick={() => setShowQr(true)} className="bg-white text-slate-950 py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-100 transition-all">
                    <QrCode size={18}/> Ver Código QR
                  </button>
                  <button onClick={() => copyUrl(publicUrl || window.location.href)} className="bg-slate-800 text-slate-300 py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-700 transition-all">
                    <Copy size={18}/> Copiar Enlace
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-end border-b-2 border-slate-100 pb-8 px-2">
              <h2 className="text-4xl font-black tracking-tighter text-slate-800 flex items-center gap-4 leading-none">
                <BarChart3 className="text-indigo-600" size={40} /> Ranking
              </h2>
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100 animate-pulse">En Vivo</span>
            </div>

            {CATEGORIAS.map(cat => (
              <div key={cat} className="space-y-5">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] mt-12 px-2">{cat}</h4>
                <div className="space-y-4">
                  {PARTICIPANTES.filter(p => p.category === cat).sort((a,b) => parseFloat(getAverageScore(b.id)) - parseFloat(getAverageScore(a.id))).map((p, idx) => (
                    <div key={p.id} className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex items-center gap-6 hover:border-indigo-100 transition-all">
                      <div className={`w-14 h-14 rounded-3xl flex items-center justify-center font-black text-2xl shadow-lg ${idx === 0 ? 'bg-yellow-400 text-white shadow-yellow-200' : idx === 1 ? 'bg-slate-200 text-slate-500 shadow-slate-100' : 'bg-slate-50 text-slate-300 shadow-none'}`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-black text-2xl text-slate-800 tracking-tight leading-none mb-2">{String(p.name)}</div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Users size={12}/> {scores.filter(s => s.participantId === p.id).length} JURADOS CALIFICARON
                        </div>
                      </div>
                      <div className="text-right bg-indigo-50 px-6 py-3 rounded-3xl border border-indigo-100">
                        <div className="text-4xl font-black text-indigo-600 tabular-nums leading-none mb-1">{getAverageScore(p.id)}</div>
                        <div className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Promedio</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
