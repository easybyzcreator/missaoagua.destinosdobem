import React, { useState } from 'react';
import { usePWAInstall } from '../usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {/* Chromium / Android / Desktop flow */}
      {isInstallable && (
        <button
          onClick={install}
          className="inline-flex items-center gap-2 rounded-full bg-white/90 hover:bg-white text-green-800 px-3.5 py-1.5 text-xs sm:text-sm font-semibold shadow-md transition-all border border-green-200 hover:scale-105"
        >
          <Download className="w-4 h-4 text-green-700" />
          <span>Instalar Aplicativo</span>
        </button>
      )}

      {/* iOS Safari flow */}
      {isIOS && !isInstallable && (
        <>
          <button
            onClick={() => setShowIOSGuide(true)}
            className="inline-flex items-center gap-2 rounded-full bg-white/90 hover:bg-white text-green-800 px-3.5 py-1.5 text-xs sm:text-sm font-semibold shadow-md transition-all border border-green-200 hover:scale-105"
          >
            <Smartphone className="w-4 h-4 text-green-700" />
            <span>Instalar no iPhone</span>
          </button>

          {showIOSGuide && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
              <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-green-100 text-slate-800">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-green-600" />
                    Instalar no iPhone / iPad
                  </h3>
                  <button
                    onClick={() => setShowIOSGuide(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-green-700 bg-green-100 rounded-full w-5 h-5 flex items-center justify-center shrink-0">1</span>
                    Toque no botão de <strong>Compartilhar</strong> no menu inferior do Safari.
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-green-700 bg-green-100 rounded-full w-5 h-5 flex items-center justify-center shrink-0">2</span>
                    Role as opções para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-green-700 bg-green-100 rounded-full w-5 h-5 flex items-center justify-center shrink-0">3</span>
                    Confirme tocando em <strong>Adicionar</strong> no canto superior direito.
                  </p>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="mt-5 w-full rounded-xl bg-green-600 hover:bg-green-700 py-2.5 text-sm font-semibold text-white transition-all shadow-md"
                >
                  Entendi
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};
