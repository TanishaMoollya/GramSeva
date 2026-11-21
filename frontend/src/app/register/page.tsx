'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  FileText, 
  MapPin, 
  Upload, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  ArrowRight,
  Phone,
  User,
  Navigation,
  Check,
  Building
} from 'lucide-react';
import ComplaintMap from '@/components/ComplaintMap';
import { submitComplaint, testAIClassify } from '@/lib/api';

const CATEGORIES = [
  'Streetlight issues',
  'Garbage collection',
  'Potholes and road damage',
  'Water supply',
  'Drainage and sanitation',
  'Other public issues',
];

function RegisterForm() {
  const searchParams = useSearchParams();
  const prefillCategory = searchParams.get('category');

  const [formData, setFormData] = useState({
    citizen_name: '',
    citizen_phone: '',
    category: prefillCategory || 'Streetlight issues',
    description: '',
    village_name: 'Harohalli',
    ward_number: 'Ward 1',
    address: '',
    latitude: 12.6582,
    longitude: 77.4521,
    image_url: '',
  });

  const [locationSelected, setLocationSelected] = useState<{ lat: number; lng: number }>({
    lat: 12.6582,
    lng: 77.4521,
  });

  const [aiPreview, setAiPreview] = useState<any>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (prefillCategory && CATEGORIES.includes(prefillCategory)) {
      setFormData((prev) => ({ ...prev, category: prefillCategory }));
    }
  }, [prefillCategory]);

  // Handle Location click on Map
  const handleMapLocationSelect = (coords: { lat: number; lng: number }) => {
    setLocationSelected(coords);
    setFormData((prev) => ({
      ...prev,
      latitude: coords.lat,
      longitude: coords.lng,
    }));
  };

  // Browser Geolocation
  const handleUseCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocationSelected(coords);
          setFormData((prev) => ({
            ...prev,
            latitude: coords.lat,
            longitude: coords.lng,
          }));
        },
        (err) => {
          alert('Could not retrieve browser geolocation: ' + err.message);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  // Optional AI Classification Preview
  const handleRunAiAnalysis = async () => {
    if (formData.description.trim().length < 10) {
      alert('Please enter at least 10 characters in the description first.');
      return;
    }
    setIsClassifying(true);
    try {
      const res = await testAIClassify(formData.description, formData.category);
      setAiPreview(res);
    } catch (e: any) {
      console.warn('AI preview note:', e.message);
    } finally {
      setIsClassifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const result = await submitComplaint({
        ...formData,
        latitude: locationSelected.lat,
        longitude: locationSelected.lng,
      });
      setSubmissionSuccess(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit grievance. Please verify fields and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-12 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-8">
        {/* Header Breadcrumbs */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <Link href="/" className="hover:text-gov-primary">Home</Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Register Grievance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Register a Public Grievance
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            File your civic issue directly with the Gram Panchayat. Our automated AI engine routes it to the designated department.
          </p>
        </div>

        {/* Confirmation State */}
        {submissionSuccess ? (
          <div className="bg-white rounded-2xl p-8 border border-emerald-200 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
                Grievance Successfully Registered
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-3">
                Tracking ID: <span className="text-gov-primary font-mono">{submissionSuccess.tracking_id}</span>
              </h2>
              <p className="text-sm text-slate-600 max-w-lg mx-auto mt-2">
                Your complaint has been logged in the Gram Panchayat registry with initial status{' '}
                <span className="font-semibold text-slate-800">"Submitted"</span>.
              </p>
            </div>

            {/* Summary Box */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-left text-xs space-y-2 max-w-md mx-auto">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Citizen Name:</span>
                <span className="font-semibold text-slate-800">{submissionSuccess.citizen_name}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Mobile Number:</span>
                <span className="font-semibold text-slate-800">{submissionSuccess.citizen_phone}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Category:</span>
                <span className="font-semibold text-slate-800">{submissionSuccess.category}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">AI Priority Tag:</span>
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  {submissionSuccess.priority}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gram Panchayat:</span>
                <span className="font-semibold text-slate-800">
                  {submissionSuccess.village_name} ({submissionSuccess.ward_number})
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href={`/track?id=${submissionSuccess.tracking_id}`}
                className="w-full sm:w-auto bg-gov-primary hover:bg-blue-900 text-white font-bold px-6 py-3 rounded-xl shadow transition flex items-center justify-center gap-2 text-sm"
              >
                <span>Track Grievance Timeline</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={() => {
                  setSubmissionSuccess(null);
                  setFormData({
                    citizen_name: '',
                    citizen_phone: '',
                    category: 'Streetlight issues',
                    description: '',
                    village_name: 'Harohalli',
                    ward_number: 'Ward 1',
                    address: '',
                    latitude: 12.6582,
                    longitude: 77.4521,
                    image_url: '',
                  });
                }}
                className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-6 py-3 rounded-xl transition text-sm"
              >
                Register Another Complaint
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8">
            {errorMsg && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Submission Error</p>
                  <p className="text-xs mt-0.5">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Section 1: Citizen Details */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-gov-primary" />
                  <span>1. Citizen Contact Information</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Gowda"
                    value={formData.citizen_name}
                    onChange={(e) => setFormData({ ...formData, citizen_name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-gov-primary focus:border-gov-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mobile Number (Indian +91) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-xs font-semibold text-slate-500">+91</span>
                    <input
                      type="tel"
                      required
                      placeholder="98451 23456"
                      value={formData.citizen_phone.replace('+91', '')}
                      onChange={(e) => setFormData({ ...formData, citizen_phone: `+91${e.target.value.trim()}` })}
                      className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-gov-primary focus:border-gov-primary outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Status updates and resolution notices will be sent via SMS / WhatsApp.</p>
                </div>
              </div>
            </div>

            {/* Section 2: Grievance Details */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gov-primary" />
                  <span>2. Grievance Description & Category</span>
                </h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Complaint Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-gov-primary focus:border-gov-primary outline-none bg-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Detailed Problem Description <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRunAiAnalysis}
                    disabled={isClassifying}
                    className="text-xs text-gov-primary hover:text-blue-800 font-semibold flex items-center gap-1 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{isClassifying ? 'Analyzing...' : 'Preview AI Classification'}</span>
                  </button>
                </div>
                <textarea
                  required
                  rows={4}
                  minLength={10}
                  placeholder="Describe the grievance in detail: What is broken or disrupted? How long has this issue persisted? Are there safety hazards or public risks?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-gov-primary focus:border-gov-primary outline-none"
                />
              </div>

              {/* AI Classification Preview Card */}
              {aiPreview && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-gov-primary font-bold">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Google Gemini AI Grievance Insights</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-700">
                    <div>
                      <span className="text-slate-500 block">Category:</span>
                      <span className="font-semibold">{aiPreview.category}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Suggested Priority:</span>
                      <span className="font-bold text-amber-700">{aiPreview.priority}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Department:</span>
                      <span className="font-semibold">{aiPreview.department}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Confidence:</span>
                      <span className="font-semibold">{(aiPreview.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <p className="text-slate-600 italic pt-1 border-t border-blue-200/50">
                    Summary: "{aiPreview.summary}"
                  </p>
                </div>
              )}
            </div>

            {/* Section 3: Village Location & GPS Map */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gov-primary" />
                  <span>3. Location & Village Ward</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Gram Panchayat / Village Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Harohalli"
                    value={formData.village_name}
                    onChange={(e) => setFormData({ ...formData, village_name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-gov-primary focus:border-gov-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Ward Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ward 3"
                    value={formData.ward_number}
                    onChange={(e) => setFormData({ ...formData, ward_number: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-gov-primary focus:border-gov-primary outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Street Address / Landmark <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Opposite Government Primary School, 2nd Cross"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-gov-primary focus:border-gov-primary outline-none"
                />
              </div>

              {/* Interactive Map Picker */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Pin Location on Map (Click on map to adjust coordinates)
                  </label>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="inline-flex items-center gap-1.5 text-xs text-gov-primary hover:text-blue-800 font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition"
                  >
                    <Navigation className="w-3.5 h-3.5 text-gov-secondary" />
                    <span>Use My Current Location</span>
                  </button>
                </div>

                <ComplaintMap
                  interactiveSelect={true}
                  selectedLocation={locationSelected}
                  onSelectLocation={handleMapLocationSelect}
                  height="260px"
                />

                <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-2">
                  <span>Latitude: <b>{locationSelected.lat.toFixed(5)}</b></span>
                  <span>Longitude: <b>{locationSelected.lng.toFixed(5)}</b></span>
                </div>
              </div>
            </div>

            {/* Section 4: Optional Photo Upload */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-gov-primary" />
                  <span>4. Photo Evidence (Optional)</span>
                </h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Photo URL or Image Link
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg or paste image link"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-gov-primary focus:border-gov-primary outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  You can also submit photos directly through our WhatsApp Bot by chatting with <b>+91 98451 23456</b>.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-4">
              <Link
                href="/"
                className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-gov-primary hover:bg-blue-900 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg transition flex items-center gap-2 text-sm disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting to Gram Panchayat...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Grievance</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function RegisterComplaintPage() {
  return (
    <Suspense fallback={
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-4 border-gov-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-semibold">Loading Grievance Portal...</p>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
