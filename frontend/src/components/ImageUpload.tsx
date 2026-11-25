'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle2, Image as ImageIcon, Camera, Loader2 } from 'lucide-react';
import { uploadImage } from '@/lib/api';

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  label?: string;
  helperText?: string;
  required?: boolean;
}

export default function ImageUpload({
  value,
  onChange,
  folder = 'gramseva_complaints',
  label = 'Upload Photo Evidence',
  helperText = 'Attach PNG, JPG, or WEBP photo (Max 10MB). Stored securely on Cloudinary.',
  required = false,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadMetadata, setUploadMetadata] = useState<{
    provider?: string;
    format?: string;
    size?: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files (PNG, JPG, JPEG, WEBP) are supported.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size exceeds 10MB limit. Please select a smaller photo.');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const res = await uploadImage(file, folder);
      onChange(res.url);
      setUploadMetadata({
        provider: res.provider,
        format: res.format,
        size: res.size,
      });
    } catch (err: any) {
      setUploadError(err.message || 'Image upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setUploadMetadata(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-bold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={handleInputChange}
        className="hidden"
      />

      {value ? (
        /* Image Preview Box */
        <div className="relative rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 p-3.5 transition group">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-36 h-28 rounded-xl overflow-hidden bg-slate-900 shadow-sm border border-slate-200 shrink-0">
              <img
                src={value}
                alt="Uploaded Evidence"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold"
              >
                View Full Image
              </a>
            </div>

            <div className="flex-1 min-w-0 space-y-1.5 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-emerald-700 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Photo Successfully Uploaded</span>
              </div>

              <p className="text-[11px] font-mono text-slate-500 truncate max-w-sm">
                {value}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                  {uploadMetadata?.provider === 'cloudinary' ? 'Cloudinary Hosted' : 'Cloud CDN Stored'}
                </span>
                {uploadMetadata?.size && (
                  <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {(uploadMetadata.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                )}
              </div>
            </div>

            {/* Remove / Change Buttons */}
            <div className="flex sm:flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs bg-white hover:bg-slate-50 text-slate-700 font-semibold px-3 py-1.5 rounded-lg border border-slate-200 transition"
              >
                Change Photo
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-3 py-1.5 rounded-lg border border-red-200 transition flex items-center justify-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Upload Area Dropzone */
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 transition text-center ${
            isDragging
              ? 'border-gov-primary bg-blue-50/70 scale-[1.01]'
              : 'border-slate-300 hover:border-gov-primary bg-slate-50/60 hover:bg-slate-50'
          }`}
        >
          {isUploading ? (
            <div className="py-4 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 text-gov-primary animate-spin" />
              <p className="text-xs font-bold text-slate-700">Uploading image to cloud storage...</p>
              <p className="text-[11px] text-slate-400">Processing media file, please wait</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-gov-primary flex items-center justify-center shadow-sm">
                <Upload className="w-6 h-6" />
              </div>

              <div>
                <p className="text-xs font-bold text-slate-800">
                  <span className="text-gov-primary hover:underline">Click to browse</span> or drag and drop image here
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">{helperText}</p>
              </div>

              <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5" />
                  Mobile Camera Supported
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" />
                  PNG, JPG, WEBP up to 10MB
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
          <X className="w-3.5 h-3.5" />
          <span>{uploadError}</span>
        </p>
      )}
    </div>
  );
}
