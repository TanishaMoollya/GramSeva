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
  Building,
  Search,
  X,
  Mic,
  MicOff,
  Crosshair,
  ExternalLink,
  Info
} from 'lucide-react';
import ComplaintMap from '@/components/ComplaintMap';
import ImageUpload from '@/components/ImageUpload';
import { submitComplaint, testAIClassify } from '@/lib/api';
import { KARNATAKA_DISTRICTS } from '@/data/karnatakaLocations';

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
    image_url: '',
  });

  // Karnataka iPGRS Structured Location State
  const [selectedDistrict, setSelectedDistrict] = useState<string>('UDUPI');
  const [selectedTaluk, setSelectedTaluk] = useState<string>('ಕಾಪು / KAPU');
  const [villageGP, setVillageGP] = useState<string>('ಕಳತ್ತೂರು-ಕುತ್ಯಾರು / 108 Kalthur-KUTHYARU');
  const [wardNumber, setWardNumber] = useState<string>('Ward 1');
  const [pincode, setPincode] = useState<string>('574106');
  const [specificAddress, setSpecificAddress] = useState<string>('ಕಳತ್ತೂರು-ಕುತ್ಯಾರು, ಕಾಪು, ಉಡುಪಿ - 574106');

  // Search & Map coordinates (Default: Kaup, Udupi as in reference portal)
  const [searchLocationQuery, setSearchLocationQuery] = useState<string>('Kaup, Kapu taluku, Udupi');
  const [isSearchingLocation, setIsSearchingLocation] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);

  const [locationSelected, setLocationSelected] = useState<{ lat: number; lng: number }>({
    lat: 13.23868,
    lng: 74.74840,
  });

  const [pinDetected, setPinDetected] = useState({
    district: 'Udupi',
    taluk: 'Kapu taluku',
    village: 'Kaup',
    pincode: '574106',
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

  // Reverse Geocoding with OpenStreetMap Nominatim
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const detectedDist = addr.state_district || addr.county || addr.city || '';
        const detectedTaluk = addr.suburb || addr.town || addr.county || addr.municipality || '';
        const detectedVillage =
          addr.village || addr.suburb || addr.neighbourhood || addr.residential || addr.hamlet || addr.town || '';
        const detectedPin = addr.postcode || '';

        setPinDetected({
          district: detectedDist || 'Udupi',
          taluk: detectedTaluk || 'Kapu taluku',
          village: detectedVillage || 'Kaup',
          pincode: detectedPin || '574106',
        });

        if (detectedPin && !pincode) {
          setPincode(detectedPin);
        }

        // Intelligently sync Karnataka District Dropdown
        const distMatch = KARNATAKA_DISTRICTS.find(
          (d) =>
            d.nameEn.toLowerCase() === detectedDist.toLowerCase() ||
            detectedDist.toLowerCase().includes(d.nameEn.toLowerCase()) ||
            d.id.toLowerCase().includes(detectedDist.toLowerCase())
        );
        if (distMatch) {
          setSelectedDistrict(distMatch.id);
          const talukMatch = distMatch.taluks.find((t) =>
            t.toLowerCase().includes(detectedTaluk.toLowerCase())
          );
          if (talukMatch) {
            setSelectedTaluk(talukMatch);
          } else if (distMatch.taluks.length > 0) {
            setSelectedTaluk(distMatch.taluks[0]);
          }
        }

        if (data.display_name) {
          const parts = data.display_name.split(',');
          setSearchLocationQuery(parts.slice(0, 3).join(', ').trim());
        }
      }
    } catch (e) {
      console.warn('Reverse geocoding error:', e);
    }
  };

  // Handle Location click or drag on Map
  const handleMapLocationSelect = (coords: { lat: number; lng: number }) => {
    setLocationSelected(coords);
    reverseGeocode(coords.lat, coords.lng);
  };

  // Search Location via Forward Geocoding
  const handleSearchLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchLocationQuery.trim()) return;

    setIsSearchingLocation(true);
    try {
      const q = `${searchLocationQuery}, Karnataka, India`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          const coords = { lat, lng };
          setLocationSelected(coords);
          reverseGeocode(lat, lng);
        } else {
          alert('Location not found. Please try entering a known town, taluk, or landmark.');
        }
      }
    } catch (err: any) {
      alert('Error searching location: ' + err.message);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  // Browser GPS Geolocation Button
  const handleUseCurrentLocation = () => {
    if ('geolocation' in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocationSelected(coords);
          reverseGeocode(coords.lat, coords.lng);
          setIsLocating(false);
        },
        (err) => {
          setIsLocating(false);
          alert('Could not retrieve browser geolocation: ' + err.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  // District dropdown change handler
  const handleDistrictChange = (distId: string) => {
    setSelectedDistrict(distId);
    const d = KARNATAKA_DISTRICTS.find((item) => item.id === distId);
    if (d && d.taluks.length > 0) {
      setSelectedTaluk(d.taluks[0]);
    }
  };

  // Speech to Text input for Address
  const handleToggleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice dictation is not supported in this browser. Please type the address.');
      return;
    }

    if (isListeningVoice) {
      setIsListeningVoice(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'kn-IN'; // Kannada primary with automatic English detection
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListeningVoice(true);
      recognition.onend = () => setIsListeningVoice(false);
      recognition.onerror = () => setIsListeningVoice(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSpecificAddress((prev) => (prev ? `${prev}, ${transcript}` : transcript));
      };

      recognition.start();
    } catch (e: any) {
      console.warn('Voice recognition error:', e);
      setIsListeningVoice(false);
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

  // Submit Grievance
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const distObj = KARNATAKA_DISTRICTS.find((d) => d.id === selectedDistrict);
      const districtName = distObj ? distObj.nameEn : selectedDistrict;

      const result = await submitComplaint({
        citizen_name: formData.citizen_name,
        citizen_phone: formData.citizen_phone,
        category: formData.category,
        description: formData.description,
        village_name: villageGP || 'Gram Panchayat',
        ward_number: wardNumber || 'Ward 1',
        address: specificAddress || `${villageGP}, ${selectedTaluk}, ${districtName}`,
        district: districtName,
        taluk: selectedTaluk,
        pincode: pincode,
        landmark: specificAddress,
        latitude: locationSelected.lat,
        longitude: locationSelected.lng,
        image_url: formData.image_url || null,
      });
      setSubmissionSuccess(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit grievance. Please verify fields and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeDistrictObj = KARNATAKA_DISTRICTS.find((d) => d.id === selectedDistrict);
  const currentTaluks = activeDistrictObj ? activeDistrictObj.taluks : [];

  return (
    <div className="py-12 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-8">
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
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-left text-xs space-y-2 max-w-lg mx-auto">
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
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">District & Taluk:</span>
                <span className="font-semibold text-slate-800">
                  {submissionSuccess.district || selectedDistrict} / {submissionSuccess.taluk || selectedTaluk}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Gram Panchayat & Pincode:</span>
                <span className="font-semibold text-slate-800">
                  {submissionSuccess.village_name} {submissionSuccess.pincode ? `(${submissionSuccess.pincode})` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Specific Landmark:</span>
                <span className="font-semibold text-slate-800">{submissionSuccess.address}</span>
              </div>

              {submissionSuccess.image_url && (
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-slate-500">Attached Photo Evidence:</span>
                  <a
                    href={submissionSuccess.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gov-primary hover:underline font-bold inline-flex items-center gap-1"
                  >
                    <span>View Image</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
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

            {/* Section 3: Karnataka Praja Seve iPGRS Location Section */}
            <div className="space-y-4 pt-2">
              <div className="border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gov-primary text-white text-xs font-bold flex items-center justify-center">
                    03
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Where is the problem?
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1 pl-8">
                  These fields are what get saved with your grievance and assigned to the departmental officer.
                </p>
              </div>

              {/* 2-Column Responsive Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN: Map & Pin (5 Cols) */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                      PIN IT ON THE MAP
                    </span>
                  </div>

                  {/* Full-width Government Green Geolocation Button */}
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isLocating}
                    className="w-full bg-[#0D6E4E] hover:bg-[#09523a] text-white font-bold py-3 px-4 rounded-xl shadow transition flex items-center justify-center gap-2 text-sm disabled:opacity-75"
                  >
                    {isLocating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Detecting GPS Location...</span>
                      </>
                    ) : (
                      <>
                        <Crosshair className="w-4 h-4" />
                        <span>+ Use my current location</span>
                      </>
                    )}
                  </button>

                  {/* Search Bar with live autocomplete/search */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search location / landmark e.g. Kaup, Kapu taluku, Udupi"
                      value={searchLocationQuery}
                      onChange={(e) => setSearchLocationQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchLocation();
                        }
                      }}
                      className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-gov-primary focus:border-gov-primary outline-none"
                    />
                    {searchLocationQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchLocationQuery('')}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Helper Text */}
                  <p className="text-[11px] text-slate-500">
                    Drag the pin, or tap anywhere on the map, to set your exact location.
                  </p>

                  {/* Leaflet Map */}
                  <div className="relative">
                    <ComplaintMap
                      interactiveSelect={true}
                      selectedLocation={locationSelected}
                      onSelectLocation={handleMapLocationSelect}
                      height="290px"
                    />
                    <div className="absolute bottom-2 left-2 z-[400] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded text-[10px] font-mono font-semibold text-slate-700 shadow border border-slate-200">
                      {locationSelected.lat.toFixed(5)}, {locationSelected.lng.toFixed(5)}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Hierarchical Dropdowns & Form (7 Cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* District & Taluk */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        District <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedDistrict}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-gov-primary outline-none"
                      >
                        {KARNATAKA_DISTRICTS.map((dist) => (
                          <option key={dist.id} value={dist.id}>
                            {dist.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Taluk <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedTaluk}
                        onChange={(e) => setSelectedTaluk(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-gov-primary outline-none"
                      >
                        {currentTaluks.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Village / Gram Panchayath & Ward & Pincode */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-7">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Village -&gt; Gram Panchayath <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ಕಳತ್ತೂರು-ಕುತ್ಯಾರು / 108 Kalthur-KUTHYARU"
                        value={villageGP}
                        onChange={(e) => setVillageGP(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-gov-primary outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Ward <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ward 1"
                        value={wardNumber}
                        onChange={(e) => setWardNumber(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-gov-primary outline-none"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Pincode
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="574106"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-gov-primary outline-none"
                      />
                    </div>
                  </div>

                  {/* Address / Landmark with Speech-to-Text and Clear */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Address / Landmark <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <textarea
                        required
                        rows={3}
                        placeholder="e.g. Near Kalikamba Temple, Cross 2, Harohalli"
                        value={specificAddress}
                        onChange={(e) => setSpecificAddress(e.target.value)}
                        className="w-full px-3.5 py-2.5 pr-20 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-gov-primary outline-none"
                      />
                      <div className="absolute right-2.5 bottom-3 flex items-center gap-1.5">
                        {specificAddress && (
                          <button
                            type="button"
                            onClick={() => setSpecificAddress('')}
                            title="Clear address"
                            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleToggleVoiceInput}
                          title={isListeningVoice ? 'Stop listening' : 'Voice dictation'}
                          className={`p-1.5 rounded-full transition ${
                            isListeningVoice
                              ? 'bg-red-500 text-white animate-pulse'
                              : 'text-slate-500 hover:text-gov-primary hover:bg-slate-100'
                          }`}
                        >
                          {isListeningVoice ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* DETECTED FROM THE PIN Card */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block">
                      DETECTED FROM THE PIN
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                      <div>
                        <span className="text-slate-400 block text-[10px]">District</span>
                        <span className="font-semibold text-slate-800">{pinDetected.district}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Taluk</span>
                        <span className="font-semibold text-slate-800">{pinDetected.taluk}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Village</span>
                        <span className="font-semibold text-slate-800">{pinDetected.village}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Pincode</span>
                        <span className="font-semibold text-slate-800">{pinDetected.pincode}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 text-[11px] text-amber-800 flex items-start gap-1.5 font-medium">
                      <span className="shrink-0 text-sm">⚠️</span>
                      <span>The map is only a helper. Check the fields above before moving on — those are what get saved.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Photo Evidence Upload (Cloudinary + Local Storage Fallback) */}
            <div className="space-y-4 pt-2">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-gov-primary" />
                  <span>4. Photo Evidence (Optional)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upload photos of the problem area. Stored directly to Cloudinary / Secure Cloud CDN.
                </p>
              </div>

              <ImageUpload
                value={formData.image_url}
                onChange={(url) => setFormData((prev) => ({ ...prev, image_url: url || '' }))}
                folder="gramseva_complaints"
                label="Complaint Photo"
                helperText="Click or drag to upload photo from your device or camera. PNG, JPG, WEBP up to 10MB."
              />
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
