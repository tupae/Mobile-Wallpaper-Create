
import React, { useState, useEffect, useCallback } from 'react';
import { AppState, GeneratedImage, WallpaperStyle } from './types';
import { WALLPAPER_STYLES } from './constants';
import { generateWallpaper } from './services/geminiService';
import StyleCard from './components/StyleCard';

// Extend window for AI Studio helpers
declare global {
  // Define AIStudio interface to resolve subsequent property declaration errors
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // Use readonly and AIStudio interface to match environmental definitions
    readonly aistudio: AIStudio;
  }
}

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppState>(AppState.SPLASH);
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<WallpaperStyle>(WALLPAPER_STYLES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('wallpaper_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const saveToHistory = (img: GeneratedImage) => {
    const newHistory = [img, ...history].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem('wallpaper_history', JSON.stringify(newHistory));
  };

  const checkAuthAndStart = async () => {
    try {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
      }
      // Proceed to the app assuming key selection was successful to avoid race conditions
      setCurrentScreen(AppState.GENERATOR);
    } catch (err) {
      console.error("Auth check failed", err);
      // Proceed anyway as per guidelines
      setCurrentScreen(AppState.GENERATOR);
    }
  };

  const handleGenerate = async () => {
    if (!userPrompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const imageUrl = await generateWallpaper(userPrompt, selectedStyle.prompt);
      const newImg: GeneratedImage = {
        id: Date.now().toString(),
        url: imageUrl,
        prompt: userPrompt,
        timestamp: Date.now()
      };
      setCurrentImage(newImg);
      saveToHistory(newImg);
      setCurrentScreen(AppState.PREVIEW);
    } catch (err: any) {
      // Reset key selection if entity not found
      if (err.message === "AUTH_ERROR") {
        await window.aistudio.openSelectKey();
      } else {
        setError("이미지 생성에 실패했습니다. 다시 시도해 주세요.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `wallpaper-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareImage = async (url: string) => {
    try {
      const blob = await fetch(url).then(r => r.blob());
      const file = new File([blob], 'wallpaper.png', { type: 'image/png' });
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: '내 멋진 AI 배경화면!',
          text: 'WallCraft AI로 만든 배경화면이에요.'
        });
      }
    } catch (err) {
      console.error("Sharing failed", err);
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case AppState.SPLASH:
        return (
          <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-gradient-to-b from-slate-900 to-blue-950">
            <div className="mb-8 w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/20 rotate-12">
              <i className="fas fa-magic text-4xl text-white -rotate-12"></i>
            </div>
            <h1 className="text-4xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              WallCraft AI
            </h1>
            <p className="text-slate-400 mb-12 text-lg leading-relaxed">
              상상을 배경화면으로.<br/>당신만의 특별한 화면을 만드세요.
            </p>
            <button 
              onClick={checkAuthAndStart}
              className="w-full max-w-xs py-4 px-8 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95"
            >
              시작하기
            </button>
            <p className="mt-6 text-xs text-slate-500">
              High-Quality 이미지 생성을 위해 API 키가 필요합니다.<br/>
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline">유료 프로젝트 API 키</a>를 선택해주세요.
            </p>
          </div>
        );

      case AppState.GENERATOR:
        return (
          <div className="flex flex-col h-full bg-slate-950">
            {/* Header */}
            <header className="p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold">배경화면 생성</h2>
              <button 
                onClick={() => setCurrentScreen(AppState.HISTORY)}
                className="p-3 bg-slate-800 rounded-full text-blue-400"
              >
                <i className="fas fa-history text-lg"></i>
              </button>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto px-6 space-y-8 pb-32">
              {/* Prompt Input */}
              <section>
                <label className="block text-sm font-semibold text-slate-400 mb-3 ml-1">생성하고 싶은 이미지 설명</label>
                <div className="relative">
                  <textarea
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    placeholder="예: 푸른 하늘 아래 벚꽃이 흩날리는 서울의 밤거리"
                    className="w-full h-32 bg-slate-900 border-2 border-slate-800 rounded-2xl p-4 text-white focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-600"
                  />
                  {userPrompt && (
                    <button 
                      onClick={() => setUserPrompt('')}
                      className="absolute bottom-4 right-4 text-slate-500 p-1"
                    >
                      <i className="fas fa-times-circle"></i>
                    </button>
                  )}
                </div>
              </section>

              {/* Style Selection */}
              <section>
                <div className="flex justify-between items-end mb-4 ml-1">
                  <label className="text-sm font-semibold text-slate-400">스타일 선택</label>
                  <span className="text-xs text-blue-500 font-bold">{selectedStyle.name}</span>
                </div>
                <div className="flex overflow-x-auto gap-3 pb-2 -mx-1 px-1 no-scrollbar">
                  {WALLPAPER_STYLES.map((style) => (
                    <StyleCard
                      key={style.id}
                      style={style}
                      isSelected={selectedStyle.id === style.id}
                      onClick={() => setSelectedStyle(style)}
                    />
                  ))}
                </div>
              </section>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
                  <i className="fas fa-exclamation-circle text-red-500 mt-1"></i>
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              )}
            </div>

            {/* Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
              <button
                disabled={!userPrompt.trim() || isGenerating}
                onClick={handleGenerate}
                className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-bold text-lg transition-all shadow-2xl ${
                  isGenerating 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-[0.98]'
                }`}
              >
                {isGenerating ? (
                  <>
                    <i className="fas fa-circle-notch fa-spin"></i>
                    <span>AI가 그림 그리는 중...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-wand-sparkles"></i>
                    <span>배경화면 만들기</span>
                  </>
                )}
              </button>
            </div>
          </div>
        );

      case AppState.HISTORY:
        return (
          <div className="flex flex-col h-full bg-slate-950">
            <header className="p-6 flex items-center gap-4">
              <button onClick={() => setCurrentScreen(AppState.GENERATOR)} className="p-2 -ml-2">
                <i className="fas fa-arrow-left text-xl"></i>
              </button>
              <h2 className="text-xl font-bold">최근 생성 기록</h2>
            </header>
            
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <i className="fas fa-image text-5xl mb-4 opacity-20"></i>
                  <p>생성된 배경화면이 없습니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {history.map((img) => (
                    <div 
                      key={img.id} 
                      onClick={() => {
                        setCurrentImage(img);
                        setCurrentScreen(AppState.PREVIEW);
                      }}
                      className="relative aspect-[9/16] rounded-xl overflow-hidden bg-slate-900 border border-slate-800 active:scale-95 transition-transform"
                    >
                      <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case AppState.PREVIEW:
        if (!currentImage) return null;
        return (
          <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="relative flex-1 bg-slate-900 overflow-hidden">
              <img 
                src={currentImage.url} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
              
              {/* UI Overlay Simulation */}
              <div className="absolute inset-0 p-12 pointer-events-none flex flex-col items-center">
                 <div className="text-white text-6xl font-thin mt-12 mb-2 drop-shadow-lg">
                   {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                 </div>
                 <div className="text-white text-lg drop-shadow-md">
                   {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
                 </div>
                 <div className="mt-auto flex gap-12 mb-8">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <i className="fas fa-phone text-white"></i>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <i className="fas fa-camera text-white"></i>
                    </div>
                 </div>
                 <div className="w-32 h-1.5 bg-white/50 rounded-full"></div>
              </div>

              {/* Action Buttons */}
              <div className="absolute top-6 left-6 right-6 flex justify-between">
                <button 
                  onClick={() => setCurrentScreen(AppState.GENERATOR)}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            <div className="p-6 pb-12 bg-slate-900 flex gap-4 safe-bottom">
              <button 
                onClick={() => downloadImage(currentImage.url)}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
              >
                <i className="fas fa-download"></i>
                저장하기
              </button>
              <button 
                onClick={() => shareImage(currentImage.url)}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
              >
                <i className="fas fa-share-alt"></i>
                공유하기
              </button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <main className="max-w-md mx-auto h-screen relative shadow-2xl overflow-hidden">
      {renderScreen()}
    </main>
  );
};

export default App;
