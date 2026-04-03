import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Scissors, 
  Calendar, 
  Phone, 
  MapPin, 
  Instagram, 
  Clock, 
  Menu, 
  X, 
  ChevronRight,
  Star,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Send,
  Mail,
  ExternalLink
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { db, auth } from './firebase';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import { Service, Booking } from './types';

// Constants
const BARBER_NAME = "Jacob";
const BUSINESS_NAME = "J 2Blurry";
const PHONE_NUMBER = "2105088599";
const SERVICES: Service[] = [
  { id: '1', name: 'The Signature Fade', description: 'Precision fade with a crisp lineup and neck shave.', price: 35, duration: 45 },
  { id: '2', name: 'Beard Sculpting', description: 'Beard trim, shaping, and hot towel finish.', price: 20, duration: 30 },
  { id: '3', name: 'The Full Service', description: 'Signature fade + beard sculpting + hot towel shave.', price: 50, duration: 75 },
  { id: '4', name: 'Kids Cut', description: 'Gentle and stylish cut for the young ones (12 & under).', price: 25, duration: 30 },
  { id: '5', name: 'Edge Up', description: 'Quick cleanup around the edges and neck.', price: 15, duration: 15 },
];

const TIME_SLOTS_WEEKDAY = ['18:00', '19:00'];
const TIME_SLOTS_WEEKEND = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  // Chatbox State
  const [isChatOpen, setIsChatOpen] = useState(false);

  const getTimeSlots = (date: Date) => {
    const day = date.getDay();
    if (day === 0) return []; // Sunday
    if (day >= 1 && day <= 4) return TIME_SLOTS_WEEKDAY; // Mon-Thu
    return TIME_SLOTS_WEEKEND; // Fri-Sat
  };

  const availableTimeSlots = getTimeSlots(selectedDate);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        setCustomerName(user.displayName || '');
        // Fetch user bookings
        const q = query(
          collection(db, 'bookings'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const unsubBookings = onSnapshot(q, (snapshot) => {
          const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
          setUserBookings(bookings);
        });
        return () => unsubBookings();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedService || !selectedTime) return;

    setIsBooking(true);
    setBookingError(null);

    const bookingData: Booking = {
      userId: user.uid,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      date: format(selectedDate, 'yyyy-MM-dd'),
      time: selectedTime,
      status: 'pending',
      createdAt: new Date().toISOString(),
      customerName,
      customerPhone,
    };

    try {
      await addDoc(collection(db, 'bookings'), bookingData);
      setBookingSuccess(true);
      setSelectedService(null);
      setSelectedTime(null);
      setTimeout(() => setBookingSuccess(false), 5000);
    } catch (error) {
      console.error("Booking failed", error);
      setBookingError("Failed to book appointment. Please try again.");
    } finally {
      setIsBooking(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setContactError(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          message: contactMessage,
        }),
      });

      if (response.ok) {
        setContactSuccess(true);
        setContactName('');
        setContactEmail('');
        setContactMessage('');
        setTimeout(() => setContactSuccess(false), 5000);
      } else {
        setContactError("Failed to send message. Please try again later.");
      }
    } catch (error) {
      console.error("Contact error", error);
      setContactError("An error occurred. Please try again.");
    } finally {
      setIsSending(false);
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
              {['home', 'services', 'about', 'booking', 'contact'].map((item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item)}
                  className="text-sm font-bold uppercase tracking-widest hover:text-red-600 transition-colors"
                >
                  {item}
                </button>
              ))}
              {user ? (
                <div className="flex items-center gap-4">
                  <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-red-600" />
                  <button onClick={() => auth.signOut()} className="text-xs font-bold text-gray-400 hover:text-white">LOGOUT</button>
                </div>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-full font-bold text-sm transition-all transform hover:scale-105"
                >
                  SIGN IN
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
              {['home', 'services', 'about', 'booking', 'contact'].map((item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item)}
                  className="text-xl font-black uppercase italic hover:text-red-600"
                >
                  {item}
                </button>
              ))}
              {!user && (
                <button 
                  onClick={handleLogin}
                  className="bg-red-600 w-full py-4 rounded-xl font-bold"
                >
                  SIGN IN
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Video Background Placeholder - Using a dark overlay and animated gradient for now as real video needs a source */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black z-10" />
          <img 
            src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=2070" 
            className="w-full h-full object-cover scale-110 animate-pulse-slow"
            alt="Barber Shop"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="relative z-20 text-center px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-red-600 font-black tracking-[0.3em] uppercase mb-4">Master Barber {BARBER_NAME}</h2>
            <h1 className="text-6xl md:text-9xl font-black italic tracking-tighter leading-none mb-4">
              SHARP CUTS.<br />
              <span className="text-transparent stroke-text">NO BLUR.</span>
            </h1>
            <div className="inline-block bg-red-600 text-white px-4 py-1 rounded font-black text-xs tracking-widest uppercase mb-8">
              By Appointment Only
            </div>
            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto font-medium">
              San Antonio's premier destination for elite grooming. 
              Elevate your style with the master of the craft.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => scrollToSection('booking')}
                className="bg-red-600 hover:bg-red-700 text-white px-10 py-5 rounded-full font-black text-lg flex items-center justify-center gap-2 transition-all transform hover:scale-105 shadow-[0_0_30px_rgba(220,38,38,0.4)]"
              >
                BOOK YOUR CUT <ChevronRight className="w-5 h-5" />
              </button>
              <button 
                onClick={() => scrollToSection('services')}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-10 py-5 rounded-full font-black text-lg transition-all"
              >
                VIEW SERVICES
              </button>
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
      <section className="py-20 bg-black border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {[
            { label: 'Happy Clients', value: '100+' },
            { label: 'Years Experience', value: '5' },
            { label: 'Rating', value: '5.0' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="text-4xl md:text-5xl font-black text-red-600 mb-2 italic">{stat.value}</div>
              <div className="text-xs font-bold uppercase tracking-widest text-gray-500">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-32 bg-zinc-950 relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <div>
              <h2 className="text-red-600 font-black tracking-widest uppercase mb-4">The Menu</h2>
              <h3 className="text-5xl md:text-7xl font-black italic tracking-tighter">PREMIUM SERVICES</h3>
            </div>
            <p className="max-w-md text-gray-400 font-medium">
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
                className="group bg-black border border-white/5 p-8 rounded-3xl hover:border-red-600/50 transition-all cursor-pointer relative overflow-hidden"
                onClick={() => {
                  setSelectedService(service);
                  scrollToSection('booking');
                }}
              >
                <div className="absolute top-0 right-0 p-6 text-red-600 opacity-20 group-hover:opacity-100 transition-opacity">
                  <Scissors className="w-12 h-12 rotate-45" />
                </div>
                <div className="text-3xl font-black italic mb-2 group-hover:text-red-600 transition-colors">${service.price}</div>
                <h4 className="text-2xl font-black uppercase mb-4">{service.name}</h4>
                <p className="text-gray-400 mb-8 font-medium">{service.description}</p>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                  <Clock className="w-4 h-4" /> {service.duration} MINS
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-20 items-center">
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
              <div className="absolute -bottom-10 -right-10 bg-red-600 p-8 rounded-2xl z-20 shadow-xl hidden md:block">
                <div className="text-4xl font-black italic">5 YEARS</div>
                <div className="text-xs font-bold uppercase tracking-widest">OF CRAFTSMANSHIP</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
            >
              <h2 className="text-red-600 font-black tracking-widest uppercase mb-4">The Barber</h2>
              <h3 className="text-5xl md:text-7xl font-black italic tracking-tighter mb-8">MEET JACOB</h3>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed font-medium">
                Founder of J 2Blurry, Jacob has dedicated his life to the art of barbering. 
                Known for his surgical precision and eye for detail, he doesn't just cut hair—he 
                builds confidence.
              </p>
              <p className="text-gray-400 mb-12 font-medium">
                "My goal is to make sure every client walks out feeling like a new person. 
                The name J 2Blurry comes from the smoothness of the blend. If it's not blurry, 
                it's not a Jacob cut."
              </p>
              <div className="flex gap-6">
                <a href={`tel:${PHONE_NUMBER}`} className="flex items-center gap-3 text-white hover:text-red-600 transition-colors">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Call Now</div>
                    <div className="font-bold">{PHONE_NUMBER}</div>
                  </div>
                </a>
                <div className="flex items-center gap-3 text-white">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Location</div>
                    <div className="font-bold">San Antonio, TX</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Booking Section */}
      <section id="booking" className="py-32 bg-zinc-950">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-red-600 font-black tracking-widest uppercase mb-4">Secure Your Spot</h2>
            <h3 className="text-5xl md:text-7xl font-black italic tracking-tighter mb-8">BOOK APPOINTMENT</h3>
            {!user && (
              <div className="bg-red-600/10 border border-red-600/20 p-8 rounded-3xl">
                <p className="text-lg mb-6 font-medium">Please sign in to book your appointment and manage your cuts.</p>
                <button 
                  onClick={handleLogin}
                  className="bg-red-600 hover:bg-red-700 px-12 py-4 rounded-full font-black text-lg transition-all"
                >
                  SIGN IN WITH GOOGLE
                </button>
              </div>
            )}
          </div>

          {user && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-black border border-white/10 p-8 md:p-12 rounded-[2rem] shadow-2xl"
            >
              {bookingSuccess ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </div>
                  <h4 className="text-3xl font-black mb-4">BOOKING CONFIRMED!</h4>
                  <p className="text-gray-400 mb-8">Jacob will see you soon. Check your email for details.</p>
                  <button 
                    onClick={() => setBookingSuccess(false)}
                    className="text-red-600 font-bold uppercase tracking-widest hover:underline"
                  >
                    Book Another Cut
                  </button>
                </div>
              ) : (
                <form onSubmit={handleBooking} className="space-y-8">
                  {/* Service Selection */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Select Service</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {SERVICES.map((service) => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => setSelectedService(service)}
                          className={`p-4 rounded-2xl border text-left transition-all ${
                            selectedService?.id === service.id 
                            ? 'border-red-600 bg-red-600/10' 
                            : 'border-white/10 hover:border-white/30'
                          }`}
                        >
                          <div className="font-black uppercase">{service.name}</div>
                          <div className="text-sm text-gray-400">${service.price} • {service.duration}m</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date Selection */}
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Select Date</label>
                      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                        {[0, 1, 2, 3, 4, 5, 6].map((days) => {
                          const date = addDays(new Date(), days);
                          const isSelected = isSameDay(date, selectedDate);
                          return (
                            <button
                              key={days}
                              type="button"
                              onClick={() => setSelectedDate(date)}
                              className={`flex-shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center transition-all ${
                                isSelected ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-400'
                              }`}
                            >
                              <span className="text-[10px] font-bold uppercase">{format(date, 'EEE')}</span>
                              <span className="text-xl font-black">{format(date, 'd')}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Time Selection */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Select Time</label>
                      <div className="grid grid-cols-3 gap-2">
                        {availableTimeSlots.length > 0 ? (
                          availableTimeSlots.map((time) => (
                            <button
                              key={time}
                              type="button"
                              onClick={() => setSelectedTime(time)}
                              className={`py-3 rounded-xl text-sm font-bold transition-all ${
                                selectedTime === time ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                              }`}
                            >
                              {time}
                            </button>
                          ))
                        ) : (
                          <div className="col-span-3 py-4 text-center text-gray-500 font-bold uppercase text-xs tracking-widest">
                            Closed on Sundays
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Full Name</label>
                      <input 
                        type="text" 
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:border-red-600 outline-none transition-all"
                        placeholder="Your Name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Phone Number</label>
                      <input 
                        type="tel" 
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:border-red-600 outline-none transition-all"
                        placeholder="(210) 000-0000"
                      />
                    </div>
                  </div>

                  {bookingError && (
                    <div className="flex items-center gap-2 text-red-500 text-sm font-bold bg-red-500/10 p-4 rounded-xl">
                      <AlertCircle className="w-4 h-4" /> {bookingError}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={isBooking || !selectedService || !selectedTime}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-6 rounded-2xl font-black text-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl"
                  >
                    {isBooking ? 'BOOKING...' : 'CONFIRM APPOINTMENT'}
                  </button>
                </form>
              )}
            </motion.div>
          )}

          {/* User Bookings List */}
          {user && userBookings.length > 0 && (
            <div className="mt-20">
              <h4 className="text-2xl font-black italic mb-8 uppercase tracking-tighter">Your Appointments</h4>
              <div className="space-y-4">
                {userBookings.map((booking) => (
                  <div key={booking.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl flex justify-between items-center">
                    <div>
                      <div className="font-black uppercase text-lg">{booking.serviceName}</div>
                      <div className="text-gray-400 text-sm">
                        {format(parseISO(booking.date), 'MMMM d, yyyy')} at {booking.time}
                      </div>
                    </div>
                    <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      booking.status === 'confirmed' ? 'bg-green-500/20 text-green-500' : 
                      booking.status === 'cancelled' ? 'bg-red-500/20 text-red-500' : 
                      'bg-yellow-500/20 text-yellow-500'
                    }`}>
                      {booking.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Instagram Section */}
      <section id="instagram" className="py-32 bg-black overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-red-600 font-black tracking-widest uppercase mb-4">Follow the Blend</h2>
              <h3 className="text-5xl md:text-7xl font-black italic tracking-tighter mb-8">INSTAGRAM FEED</h3>
              <a 
                href="https://www.instagram.com/jay.2blurry/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-gray-400 hover:text-red-600 font-bold transition-colors"
              >
                @jay.2blurry <ExternalLink className="w-4 h-4" />
              </a>
            </motion.div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&q=80&w=600",
              "https://images.unsplash.com/photo-1621605815841-aa88c82b0280?auto=format&fit=crop&q=80&w=600",
              "https://images.unsplash.com/photo-1593702295094-272a9f44503f?auto=format&fit=crop&q=80&w=600",
              "https://images.unsplash.com/photo-1512690196252-741d2fd35ad0?auto=format&fit=crop&q=80&w=600",
              "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=600",
              "https://images.unsplash.com/photo-1622286332618-f2803b1950d4?auto=format&fit=crop&q=80&w=600",
              "https://images.unsplash.com/photo-1592647425447-11e1f3fdc405?auto=format&fit=crop&q=80&w=600",
              "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=600"
            ].map((img, i) => (
              <motion.a
                key={i}
                href="https://www.instagram.com/jay.2blurry/"
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="aspect-square relative group overflow-hidden rounded-2xl"
              >
                <img 
                  src={img} 
                  alt="Instagram Post" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-red-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Instagram className="text-white w-8 h-8" />
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-32 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-20">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-red-600 font-black tracking-widest uppercase mb-4">Get In Touch</h2>
              <h3 className="text-5xl md:text-7xl font-black italic tracking-tighter mb-8">QUESTIONS?</h3>
              <p className="text-xl text-gray-400 mb-12 font-medium">
                Have a special request or want to book a mobile service? 
                Drop me a message and I'll get back to you as soon as possible.
              </p>
              
              <div className="space-y-8">
                <div className="flex items-center gap-6 group">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-red-600 transition-colors">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Call or Text</div>
                    <div className="text-2xl font-black italic">{PHONE_NUMBER}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6 group">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-red-600 transition-colors">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Email</div>
                    <div className="text-2xl font-black italic">J2BLURRY@GMAIL.COM</div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-black border border-white/10 p-8 md:p-12 rounded-[2rem]"
            >
              {contactSuccess ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </div>
                  <h4 className="text-3xl font-black mb-4">MESSAGE SENT!</h4>
                  <p className="text-gray-400">I'll get back to you shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Name</label>
                    <input 
                      type="text" 
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:border-red-600 outline-none transition-all"
                      placeholder="Your Name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Email</label>
                    <input 
                      type="email" 
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:border-red-600 outline-none transition-all"
                      placeholder="your@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Message</label>
                    <textarea 
                      required
                      rows={4}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:border-red-600 outline-none transition-all resize-none"
                      placeholder="How can I help you?"
                    />
                  </div>
                  {contactError && (
                    <div className="text-red-500 text-sm font-bold bg-red-500/10 p-4 rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> {contactError}
                    </div>
                  )}
                  <button 
                    type="submit"
                    disabled={isSending}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-5 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-2"
                  >
                    {isSending ? 'SENDING...' : <><Send className="w-5 h-5" /> SEND MESSAGE</>}
                  </button>
                </form>
              )}
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
                The sharpest cuts in San Antonio. Jacob brings years of expertise 
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
                <li><button onClick={() => scrollToSection('booking')} className="hover:text-red-600 transition-colors">Book Now</button></li>
              </ul>
            </div>

            <div>
              <h5 className="text-sm font-black uppercase tracking-widest mb-8 text-red-600">Contact</h5>
              <ul className="space-y-4 font-bold text-gray-400">
                <li className="flex items-center gap-3"><Phone className="w-4 h-4 text-red-600" /> {PHONE_NUMBER}</li>
                <li className="flex items-center gap-3"><MapPin className="w-4 h-4 text-red-600" /> San Antonio, TX</li>
                <li className="flex flex-col gap-1">
                  <div className="flex items-center gap-3"><Clock className="w-4 h-4 text-red-600" /> Mon - Thu: 6pm - 8pm</div>
                  <div className="ml-7">Fri - Sat: 10am - 5pm</div>
                  <div className="ml-7 text-red-600">Sun: Closed</div>
                  <div className="ml-7 text-[10px] uppercase tracking-widest">By Appointment Only</div>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-xs font-bold text-gray-600 uppercase tracking-widest">
            <div>© 2024 J 2BLURRY BARBER SHOP. ALL RIGHTS RESERVED.</div>
            <div className="flex gap-8">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

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
