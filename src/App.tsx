import React, { useState, useEffect, FormEvent, useMemo, useRef } from 'react';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';
import { 
  Heart, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Quote, 
  History,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ScrollText,
  BookHeart,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { intervalToDuration } from 'date-fns';
import { UserProfile, Room, Rule, Vow, Memory, OperationType } from './types';
import { handleDatabaseError } from './lib/utils';

const FIXED_ROOM_ID = 'ko-and-thet-htar-shared-room';

const FloatingHearts = () => {
  const hearts = useMemo(() => Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    duration: 10 + Math.random() * 20,
    delay: Math.random() * 10,
    size: 10 + Math.random() * 30,
    color: ['text-rose-300', 'text-pink-300', 'text-fuchsia-300', 'text-rose-200'][Math.floor(Math.random() * 4)],
    opacity: 0.1 + Math.random() * 0.3
  })), []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {hearts.map((h) => (
        <motion.div
          key={h.id}
          initial={{ y: '110vh', x: 0, rotate: 0 }}
          animate={{ 
            y: '-10vh',
            x: [0, 20, -20, 0],
            rotate: [0, 45, -45, 0]
          }}
          transition={{ 
            y: { duration: h.duration, repeat: Infinity, ease: "linear", delay: h.delay },
            x: { duration: 4, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 6, repeat: Infinity, ease: "easeInOut" }
          }}
          style={{ left: h.left, fontSize: h.size, opacity: h.opacity }}
          className={`absolute ${h.color} fill-current`}
        >
          <Heart />
        </motion.div>
      ))}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [vows, setVows] = useState<Vow[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'vows' | 'journey'>('rules');

  useEffect(() => {
    const initAuth = async () => {
      const timeout = setTimeout(() => {
        setLoading(false);
      }, 8000);

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session?.user) {
          setUser(session.user);
          setAuthError(null);
          const { data: userDoc } = await supabase
            .from('users')
            .select('*')
            .eq('uid', session.user.id)
            .single();
          if (userDoc) {
            setProfile(userDoc as UserProfile);
          }
        } else {
          try {
            const { data, error } = await supabase.auth.signInAnonymously();
            if (error) throw error;
            if (data.user) setUser(data.user);
          } catch (error: any) {
            if (error.message?.includes('Anonymous sign-ins are disabled')) {
              setAuthError("Anonymous authentication is disabled. Please enable it in your Supabase Dashboard: Authentication > Providers > Anonymous (Enable Anonymous Sign-ins).");
            } else if (error.message?.includes('API key')) {
              setAuthError("Invalid Supabase API key. Please check your project settings.");
            } else {
              setAuthError(`Connection Error: ${error.message}. Please ensure your Supabase project is active and configured correctly.`);
            }
          }
        }
      } catch (error: any) {
        setAuthError(`Failed to connect to Supabase: ${error.message}`);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        setAuthError(null);
        const { data: userDoc } = await supabase
          .from('users')
          .select('*')
          .eq('uid', session.user.id)
          .single();
        if (userDoc) {
          setProfile(userDoc as UserProfile);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleIdentitySelect = async (name: 'Ko' | 'Thet Htar') => {
    if (!user) {
      setIdentityError('Not authenticated yet. Please wait a moment and try again.');
      return;
    }
    setIdentityLoading(true);
    setIdentityError(null);
    const devProfile = {
      uid: user.id,
      display_name: name,
      room_id: FIXED_ROOM_ID
    };

    try {
      const { data: roomSnap, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', FIXED_ROOM_ID)
        .single();
      
      if (roomError && roomError.code !== 'PGRST116') throw roomError;

      if (!roomSnap) {
        await supabase.from('rooms').insert({
          id: FIXED_ROOM_ID,
          code: 'LOVE',
          partner1_name: 'Ko',
          partner2_name: 'Thet Htar',
          start_date: '2025-02-02'
        });
      }

      const { error: upsertError } = await supabase.from('users').upsert(devProfile);
      if (upsertError) throw upsertError;
      setProfile(devProfile);
    } catch (error: any) {
      console.error('Selection failed:', error);
      setIdentityError(`Failed: ${error.message}. Make sure your Supabase database tables are created.`);
    } finally {
      setIdentityLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.room_id) {
      const fetchInitialData = async () => {
        const { data: roomData } = await supabase.from('rooms').select('*').eq('id', profile.room_id).single();
        if (roomData) setRoom(roomData as Room);

        const { data: rulesData } = await supabase.from('rules').select('*').eq('room_id', profile.room_id).order('created_at', { ascending: false });
        if (rulesData) setRules(rulesData as Rule[]);

        const { data: vowsData } = await supabase.from('vows').select('*').eq('room_id', profile.room_id).order('created_at', { ascending: false });
        if (vowsData) setVows(vowsData as Vow[]);

        const { data: memoriesData } = await supabase.from('memories').select('*').eq('room_id', profile.room_id).order('date', { ascending: false });
        if (memoriesData) setMemories(memoriesData as Memory[]);
      };

      fetchInitialData();

      const channel = supabase
        .channel(`room:${profile.room_id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${profile.room_id}` }, (payload) => {
          if (payload.new) setRoom(prev => ({ ...prev, ...payload.new } as Room));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rules', filter: `room_id=eq.${profile.room_id}` }, () => {
          supabase.from('rules').select('*').eq('room_id', profile.room_id).order('created_at', { ascending: false }).then(({ data }) => { if (data) setRules(data as Rule[]); });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vows', filter: `room_id=eq.${profile.room_id}` }, () => {
          supabase.from('vows').select('*').eq('room_id', profile.room_id).order('created_at', { ascending: false }).then(({ data }) => { if (data) setVows(data as Vow[]); });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'memories', filter: `room_id=eq.${profile.room_id}` }, () => {
          supabase.from('memories').select('*').eq('room_id', profile.room_id).order('date', { ascending: false }).then(({ data }) => { if (data) setMemories(data as Memory[]); });
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.room_id]);

  if (authError) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center p-6 bg-[#FFF9F9] relative overflow-hidden">
        <FloatingHearts />
        <div className="max-w-md w-full bg-white p-10 rounded-[3rem] border-2 border-rose-100 shadow-xl text-center space-y-6 relative z-10">
          <div className="bg-rose-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-rose-500 fill-rose-500" />
          </div>
          <h2 className="text-3xl font-serif font-black italic text-slate-900 tracking-tight">Setup Required</h2>
          <p className="text-slate-600 font-serif italic text-lg leading-relaxed">
            {authError}
          </p>
          <div className="pt-4">
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-rose-500 text-white rounded-full font-serif font-bold italic shadow-md hover:bg-rose-600 transition-colors"
            >
              Check Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center">
        <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          <Heart className="w-16 h-16 text-rose-500 fill-rose-500" />
        </motion.div>
      </div>
    );
  }

  if (user && !profile) {
    return (
      <div className="min-h-screen bg-[#FFF9F9] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <FloatingHearts />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12 max-w-sm w-full relative z-10">
          <div className="space-y-4">
            <div className="relative inline-block">
              <Heart className="w-20 h-20 text-rose-500 fill-rose-500 mx-auto" />
              <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -top-2 -right-2"
              >
                <Sparkles className="w-6 h-6 text-amber-400 fill-amber-300" />
              </motion.div>
            </div>
            <h1 className="text-5xl font-serif font-black italic text-slate-900 tracking-tight">Our Space</h1>
            <p className="text-slate-500 font-serif italic text-lg">Who is accessing our heart today?</p>
          </div>
          {identityError && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 text-sm font-serif italic text-center">
              {identityError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-6">
            <button
              onClick={() => handleIdentitySelect('Ko')}
              disabled={identityLoading}
              className="group relative bg-white text-rose-600 border-2 border-rose-100 p-8 rounded-[2.5rem] font-serif font-bold italic text-3xl shadow-xl shadow-rose-100/50 hover:border-rose-400 hover:bg-rose-50 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-wait"
            >
              {identityLoading ? '...' : 'Ko'}
              <span className="absolute -bottom-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Heart className="w-6 h-6 fill-rose-400 text-rose-400" />
              </span>
            </button>
            <button
              onClick={() => handleIdentitySelect('Thet Htar')}
              disabled={identityLoading}
              className="group relative bg-white text-rose-600 border-2 border-rose-100 p-8 rounded-[2.5rem] font-serif font-bold italic text-3xl shadow-xl shadow-rose-100/50 hover:border-rose-400 hover:bg-rose-50 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-wait"
            >
              {identityLoading ? '...' : 'Thet Htar'}
              <span className="absolute -bottom-2 -left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Heart className="w-6 h-6 fill-rose-400 text-rose-400" />
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!room) return null;

  return (
    <div className="min-h-screen bg-[#FFF9F9] text-slate-800 pb-32 relative overflow-x-hidden">
      <FloatingHearts />
      
      <header className="bg-white/60 backdrop-blur-xl sticky top-0 z-50 border-b border-rose-100/50 flex items-center justify-between px-6 py-4 sm:py-6">
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 10 }}
            className="bg-rose-500 p-2 rounded-full shadow-lg shadow-rose-200"
          >
            <Heart className="w-5 h-5 text-white fill-white" />
          </motion.div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold italic tracking-tight text-rose-950">Love Rules</h1>
        </div>
        <button 
          onClick={() => {
            if(confirm("Start fresh on this device?")) {
          supabase.auth.signOut();
              setProfile(null);
              window.location.reload();
            }
          }}
          className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hover:text-rose-500 transition-all px-4 py-2 rounded-full hover:bg-rose-50 border border-transparent hover:border-rose-100"
        >
          Reset
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12 relative z-10">
        <section className="text-center space-y-8 mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-6 sm:gap-10 text-3xl sm:text-4xl font-serif italic font-bold text-slate-900"
          >
            <div className="flex flex-col items-center gap-2">
              <span className={`${profile?.display_name === 'Ko' ? 'text-rose-600 scale-110 drop-shadow-sm' : 'opacity-40'} transition-all duration-500`}>Ko</span>
              {profile?.display_name === 'Ko' && <motion.div layoutId="activeInd" className="w-2 h-2 bg-rose-500 rounded-full" />}
            </div>
            <div className="relative">
              <Heart className="text-rose-500 fill-rose-500 w-10 h-10 animate-pulse" />
              <div className="absolute inset-0 animate-ping opacity-20">
                <Heart className="text-rose-500 fill-rose-500 w-10 h-10" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className={`${profile?.display_name === 'Thet Htar' ? 'text-rose-600 scale-110 drop-shadow-sm' : 'opacity-40'} transition-all duration-500`}>Thet Htar</span>
              {profile?.display_name === 'Thet Htar' && <motion.div layoutId="activeInd" className="w-2 h-2 bg-rose-500 rounded-full" />}
            </div>
          </motion.div>
          
          {room.start_date && (
            <div className="flex flex-col items-center gap-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="inline-flex items-center justify-center gap-3 group bg-white/60 backdrop-blur-md px-8 py-3 rounded-full border border-rose-100 shadow-xl shadow-rose-100/20"
              >
                <Calendar className="w-5 h-5 text-rose-400" />
                <div className="text-left">
                  <p className="text-rose-950 text-base sm:text-lg font-serif italic font-bold">
                    Together Since
                  </p>
                  <p className="text-rose-400 text-xs font-bold uppercase tracking-widest">
                    {new Date(room.start_date).toLocaleDateString(undefined, { 
                      year: 'numeric', month: 'long', day: 'numeric' 
                    })}
                  </p>
                </div>
                <div className="relative w-8 h-8 ml-2 flex items-center justify-center bg-rose-50 rounded-full">
                  <input 
                    type="date"
                    value={room.start_date}
                    onChange={async (e) => {
                      try {
                        await supabase.from('rooms').update({ start_date: e.target.value }).eq('id', room.id);
                      } catch (err) {
                        handleDatabaseError(err, OperationType.UPDATE, `rooms/${room.id}`);
                      }
                    }}
                    className="opacity-0 w-full h-full absolute inset-0 z-10 cursor-pointer"
                  />
                  <Plus className="w-4 h-4 text-rose-300 pointer-events-none group-hover:text-rose-500 transition-colors" />
                </div>
              </motion.div>

              <AnniversaryCountdown start_date={room.start_date} />
              <MonthlyReminder day={2} />
            </div>
          )}
        </section>

        <AnimatePresence mode="wait">
          {activeTab === 'rules' && (
            <motion.div
              key="rules"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <RulesSection roomId={room.id} rules={rules} profile={profile!} />
            </motion.div>
          )}
          {activeTab === 'vows' && (
            <motion.div
              key="vows"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <VowsSection roomId={room.id} vows={vows} profile={profile!} />
            </motion.div>
          )}
          {activeTab === 'journey' && (
            <motion.div
              key="journey"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <MemoriesSection roomId={room.id} memories={memories} profile={profile!} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="text-center py-20 text-slate-400 text-sm flex flex-col items-center gap-4 px-6 mb-20">
        <div className="w-12 h-1 bg-rose-100 rounded-full mb-2"></div>
        <div className="flex flex-col items-center gap-2 font-serif italic text-xl text-rose-900/50">
          <div className="flex items-center gap-3">
            <span>Made with</span>
            <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
            <span>by Ko</span>
          </div>
          <span className="text-sm uppercase tracking-[0.3em] font-sans font-bold text-rose-300">Specially for Thet Htar</span>
        </div>
      </footer>

      {/* Mobile-First Bottom Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/80 backdrop-blur-2xl border border-rose-100/50 p-2 rounded-full shadow-2xl z-[100] flex items-center justify-between overflow-hidden">
        <TabButton 
          active={activeTab === 'rules'} 
          onClick={() => setActiveTab('rules')}
          icon={<ScrollText className="w-6 h-6" />}
          label="Rules"
        />
        <TabButton 
          active={activeTab === 'vows'} 
          onClick={() => setActiveTab('vows')}
          icon={<BookHeart className="w-6 h-6" />}
          label="Vows"
        />
        <TabButton 
          active={activeTab === 'journey'} 
          onClick={() => setActiveTab('journey')}
          icon={<History className="w-6 h-6" />}
          label="Journey"
        />
      </nav>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-full transition-all duration-500 ${active ? 'text-rose-600' : 'text-slate-400 hover:text-rose-300'}`}
    >
      {active && (
        <motion.div 
          layoutId="tabBg"
          className="absolute inset-0 bg-rose-50 rounded-full -z-10"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}
      <motion.div
        animate={active ? { scale: 1.2, y: -2 } : { scale: 1, y: 0 }}
      >
        {icon}
      </motion.div>
      <span className={`text-[10px] font-bold uppercase tracking-widest transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0'}`}>
        {label}
      </span>
    </button>
  );
}

function AnniversaryCountdown({ start_date }: { start_date: string }) {
  const [duration, setDuration] = useState<any>(null);

  useEffect(() => {
    const calculate = () => {
      const now = new Date();
      const start = new Date(start_date);
      
      if (now < start) {
        setDuration(null);
        return;
      }

      const dur = intervalToDuration({
        start: start,
        end: now
      });

      setDuration(dur);
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [start_date]);

  if (!duration) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 font-serif italic py-4">
      <TimeUnit value={duration.years || 0} label="years" />
      <div className="text-rose-200 text-3xl font-bold px-1 sm:px-2">:</div>
      <TimeUnit value={duration.months || 0} label="months" />
      <div className="text-rose-200 text-3xl font-bold px-1 sm:px-2">:</div>
      <TimeUnit value={duration.days || 0} label="days" />
      <div className="text-rose-200 text-3xl font-bold px-1 sm:px-2 space-y-0 hidden sm:block">:</div>
      <TimeUnit value={duration.hours || 0} label="hours" />
      <div className="text-rose-200 text-3xl font-bold px-1 sm:px-2">:</div>
      <TimeUnit value={duration.minutes || 0} label="min" />
      <div className="text-rose-200 text-3xl font-bold px-1 sm:px-2">:</div>
      <TimeUnit value={duration.seconds || 0} label="se" />
    </div>
  );
}

function TimeUnit({ value, label }: { value: number, label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl sm:text-4xl font-serif font-bold italic text-rose-600 drop-shadow-sm">{value}</span>
      <span className="text-[10px] sm:text-xs font-bold lowercase tracking-tighter text-rose-400/70 -mt-1">{label}</span>
    </div>
  );
}

function MonthlyReminder({ day }: { day: number }) {
  const today = new Date();
  const isAnniversaryDay = today.getDate() === day;

  if (!isAnniversaryDay) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="max-w-md mx-auto bg-gradient-to-br from-rose-500 to-rose-400 p-6 rounded-[2rem] text-white shadow-xl shadow-rose-200 relative overflow-hidden group"
    >
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl"
        />
      </div>
      <div className="flex items-center gap-4 relative z-10">
        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
          <Sparkles className="w-8 h-8 text-white fill-white" />
        </div>
        <div className="text-left">
          <h4 className="font-serif text-xl font-bold italic">Happy Monthly Anniversary!</h4>
          <p className="text-rose-50 text-sm font-medium opacity-90 leading-tight">
            Today is the {day}nd. Another month of beautiful memories together. I love you! ❤️
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function RulesSection({ roomId, rules, profile }: { roomId: string, rules: Rule[], profile: UserProfile }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    try {
      await supabase.from('rules').insert({
        room_id: roomId,
        title: title.trim(),
        description: description.trim(),
        author_id: profile.uid,
        author_name: profile.display_name,
        is_done: false
      });
      setTitle('');
      setDescription('');
      setShowAdd(false);
    } catch (err) {
      handleDatabaseError(err, OperationType.WRITE, `rooms/${roomId}/rules`);
    }
  };

  const toggleDone = async (id: string, is_done: boolean) => {
    try {
      await supabase.from('rules').update({ is_done: !is_done }).eq('id', id);
    } catch (err) {
      handleDatabaseError(err, OperationType.UPDATE, `rooms/${roomId}/rules/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('rules').delete().eq('id', id);
    } catch (err) {
      handleDatabaseError(err, OperationType.DELETE, `rooms/${roomId}/rules/${id}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-2">
        <h3 className="font-serif text-3xl font-bold italic flex items-center gap-3 text-rose-950">
          <span className="text-rose-400 text-xl font-normal not-italic">✦</span>
          Love Rules
          <span className="text-rose-400 text-xl font-normal not-italic">✦</span>
        </h3>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="w-10 h-10 flex items-center justify-center bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-all shadow-lg shadow-rose-200"
        >
          <Plus className={`w-6 h-6 transition-transform duration-300 ${showAdd ? 'rotate-45' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.form
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onSubmit={handleAdd}
            className="space-y-4 px-2"
          >
            <div className="space-y-3">
              <input
                autoFocus
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Rule title..."
                className="w-full bg-white border-2 border-rose-100 p-4 rounded-2xl focus:outline-none focus:border-rose-300 shadow-sm font-serif italic text-lg"
                maxLength={100}
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the rule..."
                className="w-full bg-white border-2 border-rose-100 p-4 rounded-2xl focus:outline-none focus:border-rose-300 shadow-sm font-serif italic text-lg min-h-[100px] resize-none"
                maxLength={1000}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowAdd(false)}
                className="px-6 py-2 text-slate-400 font-serif font-bold italic"
              >
                Nevermind
              </button>
              <button 
                type="submit"
                className="px-8 py-2 bg-rose-500 text-white rounded-full font-serif font-bold italic shadow-md hover:bg-rose-600 transition-colors"
                disabled={!title.trim() || !description.trim()}
              >
                Add Rule
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {rules.map((rule, idx) => (
          <motion.div
            layout
            key={rule.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`group flex items-center gap-3 sm:gap-5 p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] transition-all border ${rule.is_done ? 'bg-rose-50/30 border-transparent opacity-60' : 'bg-white border-rose-100 shadow-sm hover:shadow-md hover:border-rose-200'}`}
          >
            <button 
              onClick={() => toggleDone(rule.id, rule.is_done)}
              className={`flex-shrink-0 transition-all transform hover:scale-110 ${rule.is_done ? 'text-rose-500' : 'text-rose-200'}`}
            >
              {rule.is_done ? <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7" /> : <Circle className="w-6 h-6 sm:w-7 sm:h-7" />}
            </button>
            <div className="flex-1 min-w-0 py-1">
              <h4 className={`text-lg sm:text-xl font-serif italic font-bold leading-snug break-words ${rule.is_done ? 'line-through text-slate-400 decoration-rose-300' : 'text-rose-950'}`}>
                {rule.title}
              </h4>
              <p className={`mt-1 text-sm sm:text-base font-serif italic leading-relaxed break-words ${rule.is_done ? 'line-through text-slate-300' : 'text-slate-600'}`}>
                {rule.description}
              </p>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-rose-100/30">
                <div className={`w-1.5 h-1.5 rounded-full ${rule.author_name === 'Ko' ? 'bg-blue-400' : 'bg-rose-400'}`} />
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Proposed by {rule.author_name}</span>
              </div>
            </div>
            {rule.author_id === profile.uid && (
              <button 
                onClick={() => handleDelete(rule.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        ))}
        {rules.length === 0 && !showAdd && (
          <div className="text-center py-20 bg-white/30 rounded-[3rem] border-2 border-dashed border-rose-100 divide-rose-100">
             <Heart className="w-8 h-8 text-rose-200 mx-auto mb-3" />
             <p className="text-slate-400 font-serif italic text-lg">Our love is perfect, but maybe we need a rule or two? 🌹</p>
          </div>
        )}
      </div>
    </div>
  );
}

function VowsSection({ roomId, vows, profile }: { roomId: string, vows: Vow[], profile: UserProfile }) {
  const [text, setText] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await supabase.from('vows').insert({
        room_id: roomId,
        text: text.trim(),
        author_id: profile.uid,
        author_name: profile.display_name
      });
      setText('');
      setShowAdd(false);
    } catch (err) {
      handleDatabaseError(err, OperationType.WRITE, `rooms/${roomId}/vows`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('vows').delete().eq('id', id);
      if (currentIndex >= vows.length - 1) setCurrentIndex(Math.max(0, vows.length - 2));
    } catch (err) {
      handleDatabaseError(err, OperationType.DELETE, `rooms/${roomId}/vows/${id}`);
    }
  };

  const nextVow = () => setCurrentIndex((prev) => (prev + 1) % vows.length);
  const prevVow = () => setCurrentIndex((prev) => (prev - 1 + vows.length) % vows.length);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-2">
        <h3 className="font-serif text-3xl font-bold italic flex items-center gap-3 text-rose-950">
          <span className="text-rose-400 text-xl font-normal not-italic">✦</span>
          Our Vows
          <span className="text-rose-400 text-xl font-normal not-italic">✦</span>
        </h3>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="w-10 h-10 flex items-center justify-center bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-all shadow-lg shadow-rose-200"
        >
          <Plus className={`w-6 h-6 transition-transform duration-300 ${showAdd ? 'rotate-45' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.form
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onSubmit={handleAdd}
            className="p-8 bg-white rounded-[3rem] border-2 border-rose-100 shadow-xl space-y-6 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 to-amber-200"></div>
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="I promise to always..."
              className="w-full bg-transparent p-0 border-none focus:ring-0 text-2xl font-serif italic text-slate-800 min-h-[160px] resize-none leading-relaxed"
              maxLength={2000}
            />
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowAdd(false)}
                className="px-6 py-2 text-slate-400 font-serif font-bold italic"
              >
                Not yet
              </button>
              <button 
                type="submit"
                className="px-8 py-2 bg-rose-500 text-white rounded-full font-serif font-bold italic shadow-md hover:bg-rose-600 transition-colors"
              >
                I Vow
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="relative">
        {vows.length > 0 ? (
          <div className="relative h-[320px] bg-white rounded-[3.5rem] shadow-xl shadow-rose-100/30 border border-rose-50 flex flex-col items-center justify-center p-10 text-center group">
            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-12 h-1 bg-rose-100 rounded-full"></div>
            <Quote className="absolute top-12 left-10 text-rose-50 w-24 h-24 -rotate-6" />
            
            <AnimatePresence mode="wait">
              <motion.div
                key={vows[currentIndex]?.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 relative z-10"
              >
                <p className="text-2xl italic font-serif leading-relaxed text-slate-800 px-8">
                  {vows[currentIndex]?.text}
                </p>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-px bg-rose-300"></div>
                  <p className="text-sm font-serif font-bold text-rose-500 uppercase tracking-[0.2em]">{vows[currentIndex]?.author_name}</p>
                </div>
              </motion.div>
            </AnimatePresence>
            
            {vows.length > 1 && (
              <>
                <button 
                  onClick={prevVow}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-rose-50/50 text-rose-400 hover:bg-rose-100 transition-all"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button 
                  onClick={nextVow}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-rose-50/50 text-rose-400 hover:bg-rose-100 transition-all"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}
            
            {vows[currentIndex]?.author_id === profile.uid && (
              <button 
                onClick={() => handleDelete(vows[currentIndex].id)}
                className="absolute bottom-8 right-10 p-2 text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}

            <div className="absolute bottom-10 flex gap-2">
              {vows.map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setCurrentIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-rose-500 scale-150' : 'bg-rose-100'}`} 
                />
              ))}
            </div>
          </div>
        ) : !showAdd && (
          <div className="text-center py-20 bg-rose-50/30 rounded-[3rem] border-2 border-dashed border-rose-100 divide-rose-100">
             <Quote className="w-8 h-8 text-rose-200 mx-auto mb-3" />
             <p className="text-slate-400 font-serif italic text-lg">Every promise counts. Share your heart here. 🤍</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MemoriesSection({ roomId, memories, profile }: { roomId: string, memories: Memory[], profile: UserProfile }) {
  const [text, setText] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image is too large (max 5MB)");
        return;
      }
      setUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800; // Reduced for reliability over storage/size
          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
          setImageUrl(dataUrl);
          setUploading(false);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      await supabase.from('memories').insert({
        room_id: roomId,
        text: text.trim(),
        date,
        image_url: imageUrl,
        author_id: profile.uid
      });
      setText('');
      setImageUrl(null);
      setShowAdd(false);
    } catch (err) {
      handleDatabaseError(err, OperationType.WRITE, `rooms/${roomId}/memories`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Forget this memory?')) return;
    try {
      await supabase.from('memories').delete().eq('id', id);
    } catch (err) {
      handleDatabaseError(err, OperationType.DELETE, `rooms/${roomId}/memories/${id}`);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between px-2">
        <h3 className="font-serif text-3xl font-bold italic flex items-center gap-3 text-rose-950">
          <span className="text-rose-400 text-xl font-normal not-italic">✦</span>
          Our Journey
          <span className="text-rose-400 text-xl font-normal not-italic">✦</span>
        </h3>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="w-10 h-10 flex items-center justify-center bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-all shadow-lg shadow-rose-200"
        >
          <Plus className={`w-6 h-6 transition-transform duration-300 ${showAdd ? 'rotate-45' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.form
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onSubmit={handleAdd}
            className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border-2 border-rose-100 shadow-xl space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-rose-400 uppercase tracking-[0.3em] pl-1">When?</label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  className="w-full bg-rose-50/50 border-none rounded-2xl p-4 font-serif text-lg focus:ring-rose-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-rose-400 uppercase tracking-[0.3em] pl-1">Add Photo</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <label className="w-full sm:flex-1 cursor-pointer bg-rose-50/50 hover:bg-rose-100/50 border-2 border-dashed border-rose-200 rounded-2xl p-4 transition-all flex flex-col items-center gap-2 group min-h-[80px] justify-center">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange} 
                      className="hidden" 
                    />
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] sm:text-xs text-rose-400 font-medium">{imageUrl ? 'Change Photo' : 'Select Photo'}</span>
                      </>
                    )}
                  </label>
                  {imageUrl && (
                    <div className="relative w-20 h-20 group mx-auto sm:mx-0">
                      <img src={imageUrl} className="w-full h-full object-cover rounded-xl shadow-md border-2 border-rose-100" />
                      <button 
                        type="button"
                        onClick={() => setImageUrl(null)}
                        className="absolute -top-2 -right-2 bg-white text-rose-500 rounded-full p-1 shadow-md hover:text-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-rose-400 uppercase tracking-[0.3em] pl-1">What happened?</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Remember that time when..."
                className="w-full bg-rose-50/50 border-none rounded-2xl p-5 font-serif text-lg sm:text-xl italic focus:ring-rose-500 min-h-[120px]"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowAdd(false)}
                className="px-6 py-2 text-slate-400 font-serif font-bold italic"
              >
                Wait
              </button>
              <button 
                type="submit"
                className="px-8 py-2 bg-rose-500 text-white rounded-full font-serif font-bold italic shadow-md hover:bg-rose-600 transition-colors disabled:opacity-50"
                disabled={uploading}
              >
                Save Forever
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="relative space-y-12 pl-8 sm:pl-12 border-l-2 border-rose-100/50 ml-2 sm:ml-4">
        {memories.map((memory, idx) => (
          <motion.div 
            key={memory.id} 
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="relative"
          >
            <div className="absolute -left-[41px] sm:-left-[61px] top-0 w-8 h-8 sm:w-12 h-12 rounded-full bg-white border-4 border-[#FFF9F9] flex items-center justify-center shadow-md">
              <Sparkles className="w-3 h-3 sm:w-5 sm:h-5 text-rose-400" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] sm:text-xs font-serif font-bold italic text-rose-600 bg-rose-100 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-sm">
                  {new Date(memory.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
                {memory.author_id === profile.uid && (
                  <button 
                    onClick={() => handleDelete(memory.id)}
                    className="p-1.5 text-slate-300 hover:text-rose-500 transition-all rounded-full hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] border border-rose-50 shadow-sm relative overflow-hidden space-y-4">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-rose-50 rounded-full blur-2xl opacity-50"></div>
                {memory.image_url && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative rounded-2xl overflow-hidden shadow-lg border border-rose-50"
                  >
                    <img src={memory.image_url} alt="Memory" className="w-full h-auto max-h-[400px] object-cover" />
                  </motion.div>
                )}
                <p className="text-base sm:text-xl text-slate-800 font-serif italic leading-relaxed relative z-10 font-medium">
                  {memory.text}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
        {memories.length === 0 && !showAdd && (
          <div className="relative py-10">
            <div className="absolute -left-[41px] sm:-left-[61px] top-10 w-8 h-8 sm:w-12 h-12 rounded-full bg-slate-100 border-4 border-[#FFF9F9]"></div>
            <p className="text-slate-400 font-serif italic text-lg sm:text-xl px-4 translate-y-3">The first memory is yet to be written... ✍️</p>
          </div>
        )}
      </div>
    </div>
  );
}
