import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Scissors, 
  Phone, 
  MapPin, 
  Instagram, 
  Menu, 
  X, 
  MessageSquare,
  Send,
  ExternalLink,
  Clock,
  Mail,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Camera,
  Upload,
  Plus,
  Trash2,
  LogIn,
  LogOut,
  Star,
  HelpCircle,
  Map as MapIcon
} from 'lucide-react';
import { db, auth, storage } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  doc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { Service, Booking, GalleryItem } from './types';

// Constants
const BARBER_NAME = "Jacob";
const BUSINESS_NAME = "J 2Blurry";
const PHONE_NUMBER = "2105088599";
const ADDRESS = "520 Nottingham Dr. Poteet, TX 78065";
const ADMIN_EMAIL = "garzatricia89@gmail.com";
const SERVICES: Service[] = [
  { id: '1', name: 'The Signature Fade', description: 'Precision fade with a crisp lineup and neck shave.', price: 35, duration: 45 },
  { id: '2', name: 'Beard Sculpting', description: 'Beard trim, shaping, and hot towel finish.', price: 20, duration: 30 },
  { id: '3', name: 'The Full Service', description: 'Signature fade + beard sculpting + hot towel shave.', price: 50, duration: 75 },
  { id: '4', name: 'Kids Cut', description: 'Gentle and stylish cut for the young ones (12 & under).', price: 25, duration: 30 },
  { id: '5', name: 'Edge Up', description: 'Quick cleanup around the edges and neck.', price: 15, duration: 15 },
];

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=2070",
  "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=2074",
  "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=2070"
];

// Counter Component
const Counter = ({ value, suffix = "" }: { value: string, suffix?: string }) => {
  const [count, setCount] = useState(0);
  const target = parseFloat(value);
  const isFloat = value.includes('.');

  useEffect(() => {
    let start = 0;
    const duration = 2000; // 2 seconds
    const startTime = performance.now();

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out quad
      const easeProgress = progress * (2 - progress);
      
      const current = easeProgress * target;
      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  }, [target]);

  return (
    <span>
      {isFloat ? count.toFixed(1) : Math.floor(count)}
      {suffix}
    </span>
  );
};

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [currentHeroImage, setCurrentHeroImage] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isAdmin = user?.email === ADMIN_EMAIL;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chatbox State
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroImage((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const script = document.createElement('script');
    script.id = 'anywhere_book_now_script';
    script.src = 'https://assets.setmore.com/integration/book-now/live/v1/anywhere-book-now.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      const existingScript = document.getElementById('anywhere_book_now_script');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GalleryItem[];
      setGalleryItems(items);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;

    setIsUploading(true);
    const storageRef = ref(storage, `gallery/${Date.now()}_${file.name}`);
    const fileType = file.type.startsWith('video/') ? 'video' : 'image';

    try {
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      await addDoc(collection(db, 'gallery'), {
        url,
        type: fileType,
        createdAt: new Date().toISOString(),
        storagePath: storageRef.fullPath
      });
      
      setIsUploading(false);
    } catch (error) {
      console.error("Upload error", error);
      setIsUploading(false);
      alert("Failed to upload file. Please check your connection and try again.");
    }
  };

  const handleDeleteImage = async (item: GalleryItem & { storagePath?: string }) => {
    if (!isAdmin || !window.confirm("Are you sure you want to delete this image?")) return;

    try {
      if (item.storagePath) {
        const storageRef = ref(storage, item.storagePath);
        await deleteObject(storageRef);
      }
      await deleteDoc(doc(db, 'gallery', item.id));
    } catch (error) {
      console.error("Delete error", error);
      alert("Failed to delete image.");
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-600 selection:text-white">
      {/* Navigation */}
      <header>
        <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollToSection('home')}>
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <Scissors className="text-white w-6 h-6" />
              </div>
              <span className="text-2xl font-black tracking-tighter italic">
                J <span className="text-red-600">2BLURRY</span>
              </span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {['home', 'services', 'about', 'gallery', 'why-choose', 'faq', 'location', 'booking'].map((item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item)}
                  className="text-[10px] font-bold uppercase tracking-widest hover:text-red-600 transition-colors"
                >
                  {item.replace('-', ' ')}
                </button>
              ))}
              {user ? (
                <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              ) : (
                <button onClick={handleLogin} className="text-gray-400 hover:text-white transition-colors">
                  <LogIn className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="md:hidden bg-black border-b border-white/10 px-4 py-8 flex flex-col gap-6 items-center"
            >
              {['home', 'services', 'about', 'gallery', 'why-choose', 'faq', 'location', 'booking'].map((item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item)}
                  className="text-xl font-black uppercase italic hover:text-red-600"
                >
                  {item.replace('-', ' ')}
                </button>
              ))}
              {user ? (
                <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 font-bold uppercase">
                  <LogOut className="w-5 h-5" /> Logout
                </button>
              ) : (
                <button onClick={handleLogin} className="flex items-center gap-2 text-gray-400 font-bold uppercase">
                  <LogIn className="w-5 h-5" /> Admin Login
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>

      <main>
        {/* Hero Section */}
        <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
          {/* Slideshow Background */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black z-10" />
            <AnimatePresence mode="wait">
              <motion.img
                key={currentHeroImage}
                src={HERO_IMAGES[currentHeroImage]}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="w-full h-full object-cover"
                alt={`Barber Shop Slide ${currentHeroImage + 1}`}
                referrerPolicy="no-referrer"
              />
            </AnimatePresence>
          </div>

        <div className="relative z-20 text-center px-4 max-w-4xl mt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-red-600 font-black tracking-[0.3em] uppercase mb-4 text-[10px]">Master Barber {BARBER_NAME} in Poteet, Texas</h2>
            <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter leading-none mb-4 uppercase">
              Your Best Look<br />
              <span className="text-transparent stroke-text">Starts Here.</span>
            </h1>
            <div className="inline-block bg-red-600 text-white px-3 py-1 rounded font-black text-[10px] tracking-widest uppercase mb-6">
              By Appointment Only
            </div>
            <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto font-medium">
              Sharp fades, crisp lines, and the confidence you deserve.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="https://j2blurry.setmore.com"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-red-600 hover:bg-red-700 text-white px-10 py-5 rounded-full font-black text-lg flex items-center justify-center gap-2 transition-all transform hover:scale-105 shadow-[0_0_30px_rgba(220,38,38,0.4)]"
              >
                BOOK NOW <ChevronRight className="w-5 h-5" />
              </a>
              <a 
                href={`tel:${PHONE_NUMBER}`}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-10 py-5 rounded-full font-black text-lg flex items-center justify-center gap-2 transition-all transform hover:scale-105"
              >
                <Phone className="w-5 h-5" /> CALL NOW
              </a>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20"
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center p-1">
            <div className="w-1 h-2 bg-red-600 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-black border-y border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-red-600/5 blur-[120px] -z-10" />
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          {[
            { label: 'Happy Clients', value: '100', suffix: '+' },
            { label: 'Years Experience', value: '5', suffix: '' },
            { label: 'Rating', value: '5.0', suffix: '' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40, scale: 0.8 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              whileHover={{ y: -10, scale: 1.05 }}
              transition={{ 
                duration: 0.8, 
                delay: i * 0.2,
                type: "spring",
                stiffness: 100,
                damping: 15
              }}
              className="relative group p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-red-600/30 transition-colors"
            >
              <div className="text-3xl md:text-5xl font-black text-red-600 mb-3 italic tracking-tighter drop-shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                <Counter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-sm font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-white transition-colors">
                {stat.label}
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-zinc-950 relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div>
              <h2 className="text-red-600 font-black tracking-widest uppercase mb-3 text-xs">The Menu</h2>
              <h3 className="text-4xl md:text-6xl font-black italic tracking-tighter">PREMIUM SERVICES</h3>
            </div>
            <p className="max-w-md text-gray-400 font-medium text-sm">
              Every cut is a masterpiece. We take our time to ensure perfection, 
              using only the finest tools and products.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {SERVICES.map((service, i) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group bg-black border border-white/5 p-6 rounded-2xl hover:border-red-600/50 transition-all cursor-pointer relative overflow-hidden"
                onClick={() => {
                  scrollToSection('booking');
                }}
              >
                <div className="absolute top-0 right-0 p-4 text-red-600 opacity-20 group-hover:opacity-100 transition-opacity">
                  <Scissors className="w-10 h-10 rotate-45" />
                </div>
                <div className="text-2xl font-black italic mb-1 group-hover:text-red-600 transition-colors">${service.price}</div>
                <h4 className="text-xl font-black uppercase mb-3">{service.name}</h4>
                <p className="text-gray-400 mb-6 font-medium text-sm">{service.description}</p>
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  <Clock className="w-3 h-3" /> {service.duration} MINS
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="relative"
            >
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-red-600 rounded-full blur-[100px] opacity-20" />
              <img 
                src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=2074" 
                className="rounded-3xl shadow-2xl relative z-10 grayscale hover:grayscale-0 transition-all duration-700"
                alt="Jacob at work"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-10 -right-10 bg-red-600 p-6 rounded-2xl z-20 shadow-xl hidden md:block">
                <div className="text-3xl font-black italic">5 YEARS</div>
                <div className="text-[10px] font-bold uppercase tracking-widest">OF CRAFTSMANSHIP</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
            >
              <h2 className="text-red-600 font-black tracking-widest uppercase mb-3 text-xs">About Jacob</h2>
              <h3 className="text-4xl md:text-6xl font-black italic tracking-tighter mb-6 leading-none">MASTER BARBER</h3>
              <p className="text-lg text-gray-300 mb-6 leading-relaxed font-medium">
                With a keen eye for detail and a passion for the classic art of grooming, 
                Jacob has established himself as a premier barber dedicated to the craft of the perfect cut.
              </p>
              <p className="text-gray-400 mb-10 font-medium text-sm">
                His chair is more than just a place for a trim; it’s a destination for precision, 
                style, and authentic conversation.
              </p>
              <div className="flex gap-6">
                <a href={`tel:${PHONE_NUMBER}`} className="flex items-center gap-3 text-white hover:text-red-600 transition-colors">
                  <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Call Now</div>
                    <div className="font-bold text-sm">{PHONE_NUMBER}</div>
                  </div>
                </a>
                <div className="flex items-center gap-3 text-white">
                  <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Location</div>
                    <div className="font-bold text-sm">Poteet, Texas</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="py-20 bg-black relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-16 gap-8 text-center md:text-left">
            <div>
              <h2 className="text-red-600 font-black tracking-widest uppercase mb-3 text-xs">The Portfolio</h2>
              <h3 className="text-4xl md:text-6xl font-black italic tracking-tighter">LATEST WORK</h3>
            </div>
            
            {isAdmin && (
              <div className="relative">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <button 
                  onClick={handleUploadClick}
                  className={`bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full font-black text-sm flex items-center gap-2 transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {isUploading ? 'UPLOADING...' : 'UPLOAD NEW WORK'}
                </button>
              </div>
            )}

            {!user && (
              <button 
                onClick={handleLogin}
                className="text-gray-600 hover:text-red-600 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
              >
                <LogIn className="w-3 h-3" /> Admin
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleryItems.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group relative aspect-square overflow-hidden rounded-3xl bg-zinc-900"
              >
                {item.type === 'video' ? (
                  <video 
                    src={item.url} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    controls={false}
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img 
                    src={item.url} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    alt="Barber work"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {isAdmin && (
                  <button 
                    onClick={() => handleDeleteImage(item)}
                    className="absolute top-4 right-4 p-3 bg-black/50 hover:bg-red-600 text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </motion.div>
            ))}
            
            {galleryItems.length === 0 && !isUploading && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-white/10 rounded-3xl">
                <Camera className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 font-bold uppercase tracking-widest">No photos or videos in the gallery yet.</p>
                {isAdmin && <p className="text-sm text-gray-600 mt-2">Upload your first cut above!</p>}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Booking Section */}
      <section id="booking" className="py-20 bg-black overflow-hidden border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-red-600 font-black tracking-widest uppercase mb-3 text-xs">Secure Your Spot</h2>
            <h3 className="text-4xl md:text-6xl font-black italic tracking-tighter mb-10 uppercase">Book Appointment</h3>
            <div className="flex justify-center">
              <a 
                href="https://j2blurry.setmore.com"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-red-600 hover:bg-red-700 text-white font-black text-xl px-12 py-6 rounded-2xl transition-all transform hover:scale-105 shadow-[0_0_50px_rgba(220,38,38,0.3)] flex items-center justify-center" 
              > 
                BOOK NOW 
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section id="why-choose" className="py-20 bg-zinc-950 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-red-600 font-black tracking-widest uppercase mb-3 text-xs">The Difference</h2>
            <h3 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase">Why Choose J 2Blurry?</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Precision Craft",
                desc: "Every cut is executed with surgical precision. We don't just cut hair; we sculpt it to fit your unique features.",
                icon: <Scissors className="w-8 h-8" />
              },
              {
                title: "Premium Experience",
                desc: "Relax in a professional environment where your comfort is our priority. Authentic conversation and a sharp look.",
                icon: <Star className="w-8 h-8" />
              },
              {
                title: "The Blurry Blend",
                desc: "Specializing in the smoothest fades in Poteet. If the blend isn't blurry, it's not a J 2Blurry signature cut.",
                icon: <CheckCircle2 className="w-8 h-8" />
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.2 }}
                className="p-8 rounded-[2rem] bg-black border border-white/5 hover:border-red-600/30 transition-all group"
              >
                <div className="w-14 h-14 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-600 mb-6 group-hover:bg-red-600 group-hover:text-white transition-all">
                  {item.icon}
                </div>
                <h4 className="text-xl font-black uppercase mb-3 italic tracking-tight">{item.title}</h4>
                <p className="text-gray-400 font-medium leading-relaxed text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-black">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-red-600 font-black tracking-widest uppercase mb-3 text-xs">Common Questions</h2>
            <h3 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase">F.A.Q.</h3>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Do you take walk-ins?",
                a: "To ensure every client gets the time and precision they deserve, J 2Blurry operates by appointment only. You can easily book your spot through our online platform."
              },
              {
                q: "Where exactly are you located?",
                a: `I am located at ${ADDRESS}. The exact directions are provided in your booking confirmation to ensure a private and focused grooming experience.`
              },
              {
                q: "What is your cancellation policy?",
                a: "We value your time and ours. Please provide at least 24 hours notice for cancellations. This allows us to offer the spot to another client on the waiting list."
              },
              {
                q: "How long does a signature fade take?",
                a: "A standard signature fade typically takes 45 minutes. We take our time to ensure the blend is perfectly 'blurry' and the lineup is crisp."
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 hover:border-white/10 transition-all"
              >
                <div className="flex gap-4">
                  <HelpCircle className="w-6 h-6 text-red-600 shrink-0 mt-1" />
                  <div>
                    <h4 className="text-xl font-black uppercase italic mb-3 tracking-tight">{item.q}</h4>
                    <p className="text-gray-400 font-medium leading-relaxed">{item.a}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section id="location" className="py-20 bg-zinc-950 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
            >
              <h2 className="text-red-600 font-black tracking-widest uppercase mb-3 text-xs">Find The Shop</h2>
              <h3 className="text-4xl md:text-6xl font-black italic tracking-tighter mb-6 uppercase">Location</h3>
              <p className="text-lg text-gray-400 mb-10 font-medium leading-relaxed">
                Located at {ADDRESS}. We provide a premium, 
                private grooming experience in a professional setting.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center gap-6 group">
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-red-600 transition-colors">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Address</div>
                    <div className="text-lg font-black italic uppercase">{ADDRESS}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6 group">
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-red-600 transition-colors">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Call or Text</div>
                    <div className="text-xl font-black italic">{PHONE_NUMBER}</div>
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-black text-base hover:bg-red-600 hover:text-white transition-all transform hover:scale-105"
                >
                  <MapIcon className="w-4 h-4" /> GET DIRECTIONS
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              className="relative aspect-video md:aspect-square rounded-[2.5rem] overflow-hidden border border-white/10"
            >
              <iframe
                title="Google Maps Location"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(ADDRESS)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                className="grayscale contrast-125 invert-[0.85] hue-rotate-180 opacity-60 hover:opacity-100 transition-opacity duration-700"
              />
              {/* Overlay styling for a "map" look */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Chatbox */}
      <div className="fixed bottom-8 right-8 z-[60]">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="absolute bottom-20 right-0 w-72 bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-red-600 p-6">
                <div className="font-black italic text-xl">CHATTING WITH JACOB</div>
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">Usually replies in minutes</div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-300 font-medium">Hey! Ready for a fresh cut? How would you like to reach me?</p>
                <div className="space-y-2">
                  <a 
                    href={`sms:${PHONE_NUMBER}`}
                    className="flex items-center gap-3 bg-white/5 hover:bg-white/10 p-4 rounded-xl transition-all group"
                  >
                    <MessageSquare className="w-5 h-5 text-red-600" />
                    <span className="font-bold text-sm">Send SMS</span>
                  </a>
                  <a 
                    href={`tel:${PHONE_NUMBER}`}
                    className="flex items-center gap-3 bg-white/5 hover:bg-white/10 p-4 rounded-xl transition-all group"
                  >
                    <Phone className="w-5 h-5 text-red-600" />
                    <span className="font-bold text-sm">Call Jacob</span>
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:scale-110 transition-all active:scale-95"
        >
          {isChatOpen ? <X className="w-8 h-8" /> : <MessageSquare className="w-8 h-8" />}
        </button>
      </div>

      {/* Footer */}
      <footer className="bg-black border-t border-white/10 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-8">
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                  <Scissors className="text-white w-6 h-6" />
                </div>
                <span className="text-3xl font-black tracking-tighter italic">
                  J <span className="text-red-600">2BLURRY</span>
                </span>
              </div>
              <p className="text-gray-400 max-w-sm mb-8 font-medium">
                The sharpest cuts in Poteet, Texas. Jacob brings years of expertise 
                and a passion for perfection to every chair.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center hover:bg-red-600 transition-all">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href={`tel:${PHONE_NUMBER}`} className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center hover:bg-red-600 transition-all">
                  <Phone className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div>
              <h5 className="text-sm font-black uppercase tracking-widest mb-8 text-red-600">Quick Links</h5>
              <ul className="space-y-4 font-bold">
                <li><button onClick={() => scrollToSection('home')} className="hover:text-red-600 transition-colors">Home</button></li>
                <li><button onClick={() => scrollToSection('services')} className="hover:text-red-600 transition-colors">Services</button></li>
                <li><button onClick={() => scrollToSection('about')} className="hover:text-red-600 transition-colors">About Jacob</button></li>
                <li><button onClick={() => scrollToSection('why-choose')} className="hover:text-red-600 transition-colors">Why Choose Us</button></li>
                <li><button onClick={() => scrollToSection('faq')} className="hover:text-red-600 transition-colors">F.A.Q.</button></li>
                <li><button onClick={() => scrollToSection('location')} className="hover:text-red-600 transition-colors">Location</button></li>
                <li><button onClick={() => scrollToSection('booking')} className="hover:text-red-600 transition-colors">Book Now</button></li>
              </ul>
            </div>

            <div>
              <h5 className="text-[10px] font-black uppercase tracking-widest mb-6 text-red-600">Contact Info</h5>
              <ul className="space-y-3 font-bold text-gray-400 text-sm">
                <li className="flex items-center gap-3"><Phone className="w-4 h-4 text-red-600" /> {PHONE_NUMBER}</li>
                <li className="flex items-start gap-3"><MapPin className="w-4 h-4 text-red-600 mt-1" /> {ADDRESS}</li>
                <li className="flex flex-col gap-1">
                  <div className="flex items-center gap-3"><Clock className="w-4 h-4 text-red-600" /> Mon - Thu: 6pm - 8pm</div>
                  <div className="ml-7">Fri - Sat: 10am - 5pm</div>
                  <div className="ml-7 text-red-600">Sun: Closed</div>
                  <div className="ml-7 text-[9px] uppercase tracking-widest">By Appointment Only</div>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-xs font-bold text-gray-600 uppercase tracking-widest text-center md:text-left">
            <div className="space-y-2">
              <div>© 2026 J 2BLURRY BARBER SHOP. ALL RIGHTS RESERVED.</div>
              <div>
                WEBSITE CREATED BY{' '}
                <a 
                  href="https://www.facebook.com/profile.php?id=61567294089581" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-red-600 hover:text-white transition-colors underline decoration-red-600/30 underline-offset-4"
                >
                  TRISHMARIE DIGITAL
                </a>
              </div>
            </div>
            <div className="flex gap-8">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </main>

      {/* Custom Styles */}
      <style>{`
        .stroke-text {
          -webkit-text-stroke: 1px white;
          color: transparent;
        }
        .animate-pulse-slow {
          animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1.1); }
          50% { opacity: 0.8; transform: scale(1); }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
