'use client';

import { useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import ResultsDisplay from '@/components/ResultsDisplay';
import type { AnalysisResult, AnalysisError } from '@/types';

export default function Home() {
  const { data: session, status } = useSession();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG or PNG)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setError(null);
    setResult(null);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as AnalysisError;
        setError(errorData.details || errorData.error);
        return;
      }

      setResult(data as AnalysisResult);
    } catch (err) {
      setError('Failed to analyze image. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      {/* Top Bar */}
      <div className="border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'white' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-xl font-bold" style={{ color: 'var(--primary)' }}>
            DermaIQ
          </div>
          <div className="flex items-center gap-3">
            {status === 'loading' ? (
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</span>
            ) : session ? (
              <>
                <span className="text-sm hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>
                  {session.user?.name || session.user?.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-sm px-4 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="text-sm px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-1 sm:mb-2" style={{ color: 'var(--primary)' }}>
            DermaIQ
          </h1>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
            European Standard Cosmetic Safety Analysis
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Skincare &bull; Haircare &bull; Body Care &bull; Sunscreen
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-6 mb-4 sm:mb-6" style={{ borderColor: 'var(--border)' }}>
          {selectedImage ? (
            <div className="mb-4 sm:mb-6">
              <div className="border-2 border-dashed rounded-lg p-4 text-center" style={{ borderColor: 'var(--border)' }}>
                <div className="relative w-full mx-auto" style={{ maxWidth: '400px', aspectRatio: '4/3' }}>
                  <Image
                    src={selectedImage}
                    alt="Product"
                    fill
                    className="object-contain rounded"
                    quality={95}
                    unoptimized
                  />
                </div>
                <p className="text-xs truncate px-4 mt-2" style={{ color: 'var(--text-secondary)' }}>
                  {selectedFile?.name}
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-4 sm:mb-6">
              <div className="grid grid-cols-2 gap-3">
                <label htmlFor="image-upload" className="cursor-pointer">
                  <div
                    className="border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors hover:border-gray-400 active:border-gray-400"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Upload Photo</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>From gallery</p>
                  </div>
                </label>
                <input ref={fileInputRef} id="image-upload" type="file" accept="image/jpeg,image/png,image/jpg" onChange={handleImageSelect} className="hidden" />

                <label htmlFor="camera-capture" className="cursor-pointer">
                  <div
                    className="border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors hover:border-gray-400 active:border-gray-400"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Take Photo</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Use camera</p>
                  </div>
                </label>
                <input ref={cameraInputRef} id="camera-capture" type="file" accept="image/*" capture="environment" onChange={handleImageSelect} className="hidden" />
              </div>
              <p className="text-xs text-center mt-3 px-4" style={{ color: 'var(--text-secondary)' }}>
                JPEG or PNG &bull; Max 5MB &bull; Cosmetic products only
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl text-xs sm:text-sm leading-relaxed" style={{ backgroundColor: '#FEF2F2', color: '#B85C50', border: '1px solid #FECACA' }}>
              {error}
            </div>
          )}

          {selectedImage && !result && (
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="flex-1 py-3 sm:py-3.5 px-4 rounded-xl font-semibold text-sm sm:text-base text-white transition-all disabled:opacity-50 active:scale-95 shadow-sm"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                {isAnalyzing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  'Analyze Product'
                )}
              </button>
              <button
                onClick={handleReset}
                disabled={isAnalyzing}
                className="px-6 py-3 sm:py-3.5 rounded-xl font-medium text-sm sm:text-base transition-all active:scale-95"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {result && (
          <div>
            <ResultsDisplay result={result} />
            <div className="text-center mt-4 sm:mt-6">
              <button
                onClick={handleReset}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm sm:text-base text-white active:scale-95 transition-all shadow-sm"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                Analyze Another Product
              </button>
            </div>
          </div>
        )}

        {isAnalyzing && (
          <div className="text-center py-8 sm:py-12">
            <div className="inline-block w-10 h-10 sm:w-12 sm:h-12 border-4 rounded-full animate-spin mb-3 sm:mb-4" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }}></div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Researching ingredients...
            </p>
            <p className="text-xs px-4" style={{ color: 'var(--text-secondary)' }}>
              Identifying product &bull; Fetching ingredient data &bull; Applying EU safety standards
            </p>
          </div>
        )}

        <div className="text-center mt-6 sm:mt-8 text-xs px-4" style={{ color: 'var(--text-secondary)' }}>
          <p>Risk-based ingredient scoring &bull; Cosmetics only</p>
        </div>
      </div>
    </div>
  );
}
