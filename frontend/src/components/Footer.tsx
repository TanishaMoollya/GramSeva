import React from 'react';
import Link from 'next/link';
import { Building2, ShieldCheck, HelpCircle, Phone, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 text-sm mt-auto border-t-4 border-gov-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gov-secondary flex items-center justify-center text-white font-bold">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-xl text-white">Gram<span className="text-amber-400">Seva</span></span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              GramSeva is an AI-powered public grievance management and automated CRM platform connecting citizens of Gram Panchayats directly with local civic authorities via Web & WhatsApp.
            </p>
            <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5 pt-1">
              <ShieldCheck className="w-4 h-4" /> 100% Encrypted & Authenticated
            </div>
          </div>

          {/* Col 2: Services */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Public Services</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/register" className="hover:text-amber-400 transition">Register Civic Grievance</Link></li>
              <li><Link href="/track" className="hover:text-amber-400 transition">Track Complaint Timeline</Link></li>
              <li><Link href="/whatsapp" className="hover:text-amber-400 transition">WhatsApp Grievance Bot</Link></li>
              <li><Link href="/admin" className="hover:text-amber-400 transition">Panchayat Staff CRM</Link></li>
              <li><span className="text-slate-500">Citizen Feedback & Rating (Coming Soon)</span></li>
            </ul>
          </div>

          {/* Col 3: Grievance Categories */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Key Departments</h4>
            <ul className="space-y-2 text-xs">
              <li><span className="text-slate-400">Electricity & Streetlights</span></li>
              <li><span className="text-slate-400">Rural Water Supply & Sanitation</span></li>
              <li><span className="text-slate-400">Public Works & Road Repair</span></li>
              <li><span className="text-slate-400">Drainage & Solid Waste Management</span></li>
              <li><span className="text-slate-400">Panchayat Administration</span></li>
            </ul>
          </div>

          {/* Col 4: Support */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Panchayat Helpdesk</h4>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Toll-Free: 1800-425-4726</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <span>support@gramseva.gov.in</span>
              </div>
              
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© {new Date().getFullYear()} GramSeva Portal. Built for Academic Demonstration & Public Governance.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-400">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-slate-400">Terms of Service</span>
            <span>•</span>
            <span className="hover:text-slate-400">Hyperlinking Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
