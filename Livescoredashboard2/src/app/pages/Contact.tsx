import React, { useState } from 'react';
import { Mail, MapPin, Phone, Send } from 'lucide-react';
import Header from '@/app/components/sports/Header';
import Breadcrumb from '@/app/components/sports/Breadcrumb';
import Footer from '@/app/components/sports/Footer';
import type { Sport } from '@/app/data/sportsData';

const Contact: React.FC = () => {
  const [activeSport, setActiveSport] = useState<Sport>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFormData({ name: '', email: '', subject: '', message: '' });
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <Header activeSport={activeSport} onSportChange={setActiveSport} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <Breadcrumb activeTab="dashboard" activeSport={activeSport} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-4xl font-black text-white mb-4">Contact Us</h1>
        <p className="text-gray-400 mb-12">Get in touch with the ScoreHub team. We'd love to hear from you.</p>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-8">Get In Touch</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <Mail className="w-6 h-6 text-[#00d4ff] flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Email</h3>
                  <p className="text-gray-400 text-sm">support@scorehub.com</p>
                  <p className="text-gray-400 text-sm">partnerships@scorehub.com</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Phone className="w-6 h-6 text-[#00d4ff] flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Phone</h3>
                  <p className="text-gray-400 text-sm">+1 (555) 123-4567</p>
                  <p className="text-gray-400 text-sm">Monday - Friday, 9 AM - 6 PM EST</p>
                </div>
              </div>
              <div className="flex gap-4">
                <MapPin className="w-6 h-6 text-[#00d4ff] flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Address</h3>
                  <p className="text-gray-400 text-sm">ScoreHub Inc.</p>
                  <p className="text-gray-400 text-sm">123 Sports Avenue</p>
                  <p className="text-gray-400 text-sm">New York, NY 10001</p>
                </div>
              </div>
            </div>

            <div className="mt-12 bg-white/5 border border-white/10 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-3">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/help" className="text-gray-400 hover:text-[#00d4ff] transition-colors text-sm">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="/careers" className="text-gray-400 hover:text-[#00d4ff] transition-colors text-sm">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="/press" className="text-gray-400 hover:text-[#00d4ff] transition-colors text-sm">
                    Press Center
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4ff]/50 transition-colors"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4ff]/50 transition-colors"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">Subject</label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#00d4ff]/50 transition-colors"
                >
                  <option value="">Select a subject</option>
                  <option value="general">General Inquiry</option>
                  <option value="support">Support</option>
                  <option value="partnership">Partnership</option>
                  <option value="feedback">Feedback</option>
                  <option value="bug">Report a Bug</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">Message</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4ff]/50 transition-colors resize-none"
                  placeholder="Your message..."
                />
              </div>

              <button
                type="submit"
                className="w-full px-6 py-3 bg-gradient-to-r from-[#00d4ff] to-[#0066ff] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#00d4ff]/25 transition-all flex items-center justify-center gap-2"
              >
                {submitted ? 'Message Sent!' : 'Send Message'}
                {!submitted && <Send className="w-4 h-4" />}
              </button>

              {submitted && (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-green-400 text-sm">
                    Thank you for your message! We'll get back to you as soon as possible.
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Contact;
