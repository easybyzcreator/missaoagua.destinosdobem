/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Sparkles, 
  Heart, 
  User, 
  Phone, 
  ArrowRight, 
  AlertCircle,
  Accessibility,
  Users,
  ExternalLink,
  Calendar,
  Clock,
  MapPin,
  Camera,
  RotateCcw,
  Check,
  ShieldCheck,
  Ship,
  Sparkle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AdminQRView } from './components/AdminQRView';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LOGO_URL = 'https://i.ibb.co/MDLp9grD/Whats-App-Image-2026-09-25-at-1-11-48-PM.jpg';

export type SimNao = 'Sim' | 'Não' | '';

export type AutorizacaoImagem = 'Sim, autorizo.' | 'Não autorizo.' | '';

export type FormData = {
  nomeResponsavel: string;
  whatsappResponsavel: string;
  nomeCrianca: string;
  dataNascimentoCrianca: string;
  faixaEtariaCrianca?: string;
  pcd: SimNao;
  cadeiraDeRodas: SimNao;
  necessitaAcessibilidade: SimNao;
  acessibilidadeQual: string;
  confirmaPresenca: boolean;
  autorizacaoImagem: AutorizacaoImagem;
};

const initialFormData: FormData = {
  nomeResponsavel: '',
  whatsappResponsavel: '',
  nomeCrianca: '',
  dataNascimentoCrianca: '',
  faixaEtariaCrianca: '',
  pcd: '',
  cadeiraDeRodas: '',
  necessitaAcessibilidade: '',
  acessibilidadeQual: '',
  confirmaPresenca: false,
  autorizacaoImagem: '',
};

export default function App() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [regNumber, setRegNumber] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);

  // Controle de rota para #/admin
  const [currentRoute, setCurrentRoute] = useState<'form' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const pathname = window.location.pathname.toLowerCase();
      if (hash === '#/admin' || hash === '#admin' || pathname === '/admin') {
        return 'admin';
      }
    }
    return 'form';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      const pathname = window.location.pathname.toLowerCase();
      if (hash === '#/admin' || hash === '#admin' || pathname === '/admin') {
        setCurrentRoute('admin');
      } else {
        setCurrentRoute('form');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  const navigateToForm = () => {
    window.location.hash = '';
    if (window.location.pathname === '/admin') {
      window.history.pushState(null, '', '/');
    }
    setCurrentRoute('form');
  };

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const formatBirthDate = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const isValidBirthDate = (val: string): boolean => {
    if (!val || val.length !== 10) return false;
    const parts = val.split('/');
    if (parts.length !== 3) return false;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    const currentYear = new Date().getFullYear();
    if (year < 1990 || year > currentYear) return false;
    return true;
  };

  const triggerFieldError = (fieldName: string, message: string) => {
    setErrorMessage(message);
    setErrorField(fieldName);
    setTimeout(() => {
      const el = document.getElementById(`campo-${fieldName}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = el.querySelector('input, button, textarea') as HTMLElement | null;
        if (input) {
          input.focus();
        }
      }
    }, 60);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'whatsappResponsavel') {
      finalValue = maskPhone(value);
    }
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    if (errorField === name) setErrorField(null);
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrorField(null);

    // Validações com direcionamento automático da tela para onde falta preencher
    if (!formData.nomeResponsavel.trim()) {
      triggerFieldError('nomeResponsavel', 'Por favor, informe o nome completo do responsável.');
      return;
    }

    const cleanPhone = formData.whatsappResponsavel.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      triggerFieldError('whatsappResponsavel', 'Por favor, informe um WhatsApp válido com DDD do responsável.');
      return;
    }

    if (!formData.nomeCrianca.trim()) {
      triggerFieldError('nomeCrianca', 'Por favor, informe o nome completo da criança.');
      return;
    }

    if (!formData.dataNascimentoCrianca || !isValidBirthDate(formData.dataNascimentoCrianca)) {
      triggerFieldError('dataNascimentoCrianca', 'Por favor, preencha a data de nascimento da criança no formato DD/MM/AAAA.');
      return;
    }

    if (!formData.pcd) {
      triggerFieldError('pcd', 'Por favor, responda se a criança é pessoa com deficiência (PCD).');
      return;
    }

    if (!formData.cadeiraDeRodas) {
      triggerFieldError('cadeiraDeRodas', 'Por favor, responda se a criança utiliza cadeira de rodas.');
      return;
    }

    if (!formData.necessitaAcessibilidade) {
      triggerFieldError('necessitaAcessibilidade', 'Por favor, responda se a criança necessita de algum recurso de acessibilidade.');
      return;
    }

    if (formData.necessitaAcessibilidade === 'Sim' && !formData.acessibilidadeQual.trim()) {
      triggerFieldError('acessibilidadeQual', 'Por favor, descreva qual recurso de acessibilidade, apoio ou atenção é necessário.');
      return;
    }

    if (!formData.confirmaPresenca) {
      triggerFieldError('confirmaPresenca', 'Por favor, confirme que estará presente como responsável pela criança durante todo o passeio.');
      return;
    }

    if (!formData.autorizacaoImagem) {
      triggerFieldError('autorizacaoImagem', 'Por favor, responda sobre a autorização de uso de imagem.');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalSequentialNum: number | null = null;

      // 1. Tenta obter número sequencial via transação do Firestore
      try {
        const result = await runTransaction(db, async (transaction) => {
          const counterDocRef = doc(db, 'config', 'registrationCounter');
          const counterDoc = await transaction.get(counterDocRef);

          let currentCount = 0;
          if (counterDoc.exists()) {
            currentCount = counterDoc.data()?.count || 0;
          }

          const newCount = currentCount + 1;
          transaction.set(counterDocRef, { count: newCount }, { merge: true });

          const leadRef = doc(collection(db, 'inscricoes'));
          transaction.set(leadRef, {
            ...formData,
            numeroInscricao: newCount,
            evento: 'Missão Água | Barco Escola da Natureza',
            dataEvento: '14/11/2026',
            createdAt: serverTimestamp(),
          });

          return newCount;
        });
        finalSequentialNum = result;
      } catch (firestoreErr) {
        console.warn('Transação Firestore falhou ou offline, usando sincronização via servidor:', firestoreErr);
      }

      // 2. Prepara o payload para envio com número formatado
      const formattedNumStr = finalSequentialNum ? `#${String(finalSequentialNum).padStart(4, '0')}` : '#0001';
      const registrationPayload = {
        ...formData,
        numeroInscricao: formattedNumStr,
        evento: 'Missão Água | Barco Escola da Natureza',
        dataInscricao: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      };

      let backendHandled = false;

      // 3. Envia para o backend (que atualiza o contador e grava UMA ÚNICA VEZ na planilha do Google Sheets)
      try {
        const response = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registrationPayload),
        });

        if (response.ok) {
          backendHandled = true;
          const data = await response.json();
          if (data.numeroInscricao) {
            finalSequentialNum = data.numeroInscricao;
          }
        }
      } catch (backendErr) {
        console.warn('Backend /api/submit indisponível ou offline:', backendErr);
      }

      // 4. Somente caso o backend /api/submit esteja inacessível (ex: frontend estático sem Node),
      // envia diretamente do navegador como contingência
      if (!backendHandled) {
        try {
          const GOOGLE_SHEETS_DIRECT_URL = 'https://script.google.com/macros/s/AKfycbzvGmVaJ06wQ6M3LdkUFi3NV7NCpUpc-h8-Oi46KFVNlcYR5LFsGMYamIAnv-yMl9Sd/exec';
          await fetch(GOOGLE_SHEETS_DIRECT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              ...registrationPayload,
              numeroInscricao: `#${String(finalSequentialNum || 1).padStart(4, '0')}`,
            }),
          });
          console.log('Dados enviados diretamente para a planilha via Webhook (contingência)');
        } catch (directErr) {
          console.error('Falha no envio direto de contingência:', directErr);
        }
      }

      // Fallback de contingência caso o número sequencial não tenha sido retornado
      if (!finalSequentialNum) {
        const localSaved = parseInt(localStorage.getItem('destinos_local_counter') || '0', 10);
        finalSequentialNum = localSaved + 1;
        localStorage.setItem('destinos_local_counter', String(finalSequentialNum));
      }

      setRegNumber(finalSequentialNum);
      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      console.error('Erro ao processar cadastro:', err);
      setErrorMessage('Ocorreu um erro ao processar seu cadastro. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNewChild = () => {
    setFormData((prev) => ({
      ...initialFormData,
      // Mantém os dados do responsável preenchidos para facilitar a inscrição de um segundo filho
      nomeResponsavel: prev.nomeResponsavel,
      whatsappResponsavel: prev.whatsappResponsavel,
    }));
    setIsSubmitted(false);
    setRegNumber(null);
    setErrorField(null);
    setErrorMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Rota administrativa para gerar o QR Code (/#/admin ou /admin)
  if (currentRoute === 'admin') {
    return <AdminQRView onBackToForm={navigateToForm} />;
  }

  // 💚 TELA DE CONCLUSÃO COM O NÚMERO DE INSCRIÇÃO
  if (isSubmitted && regNumber !== null) {
    return (
      <div className="min-h-screen bg-slate-900/10 flex items-center justify-center p-4 font-sans selection:bg-emerald-200">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="max-w-xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-100 text-slate-800 my-6"
        >
          {/* Top Banner de Sucesso */}
          <div className="bg-gradient-to-br from-emerald-800 via-teal-800 to-emerald-950 p-8 text-center text-white relative">
            <div className="flex justify-center mb-3">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="bg-white/20 p-4 rounded-full backdrop-blur-md shadow-inner border border-white/30"
              >
                <CheckCircle2 className="w-14 h-14 text-emerald-300" />
              </motion.div>
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold text-emerald-100 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>PRÉ-INSCRIÇÃO REGISTRADA COM SUCESSO</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Inscrição Concluída!
            </h1>
            <p className="text-emerald-100/90 text-sm mt-1">
              Missão Água • Barco Escola da Natureza
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            
            {/* CARTÃO DE DESTAQUE DO NÚMERO SEQUENCIAL DE INSCRIÇÃO */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 p-6 rounded-3xl border-2 border-emerald-400 text-center relative shadow-md overflow-hidden"
            >
              <div className="absolute top-0 right-0 translate-x-4 -translate-y-4 w-24 h-24 bg-emerald-200/50 rounded-full blur-xl pointer-events-none" />
              
              <span className="text-xs font-black tracking-widest uppercase text-emerald-800 block mb-1">
                SEU NÚMERO DE INSCRIÇÃO
              </span>
              
              <div className="text-5xl sm:text-6xl font-black text-emerald-800 tracking-tight my-2">
                #{String(regNumber).padStart(4, '0')}
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-semibold mt-1">
                <Check className="w-3.5 h-3.5" />
                <span>Inscrito sequencial #{regNumber}</span>
              </div>

              {/* Resumo do Inscrito */}
              <div className="mt-5 pt-4 border-t border-emerald-200/70 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left text-xs sm:text-sm text-slate-700">
                <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                  <span className="font-bold text-slate-500 block text-[11px] uppercase">Criança:</span>
                  <span className="font-extrabold text-slate-900">{formData.nomeCrianca}</span>
                  <span className="text-slate-500 block text-xs">
                    {formData.dataNascimentoCrianca ? `Nasc.: ${formData.dataNascimentoCrianca}` : formData.faixaEtariaCrianca}
                  </span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                  <span className="font-bold text-slate-500 block text-[11px] uppercase">Responsável:</span>
                  <span className="font-extrabold text-slate-900">{formData.nomeResponsavel}</span>
                  <span className="text-slate-500 block text-xs">{formData.whatsappResponsavel}</span>
                </div>
              </div>
            </motion.div>

            {/* 📲 FINALIZAÇÃO E ORIENTAÇÕES (IMAGEM 6) */}
            <div className="space-y-4 text-slate-700 text-sm sm:text-base leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-base">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>📲 Informações Importantes:</span>
              </div>
              
              <p className="text-slate-600 text-xs sm:text-sm">
                Ao enviar este cadastro, você manifesta interesse em participar da <strong>Missão Água | Barco Escola da Natureza</strong>.
              </p>

              <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-xl text-xs sm:text-sm text-amber-950 font-medium">
                ⚠️ <strong>A pré-inscrição não representa confirmação automática da vaga.</strong>
              </div>

              <p className="text-xs sm:text-sm text-slate-600">
                Após a organização das turmas, o <strong>Destinos do Bem entrará em contato diretamente pelo WhatsApp informado</strong> para confirmar a participação e enviar as orientações sobre o passeio, incluindo a saída e o horário.
              </p>

              <p className="text-[11px] sm:text-xs text-slate-500 italic">
                Ao enviar o formulário, você também autorizou o <strong>Destinos do Bem a entrar em contato diretamente pelo WhatsApp informado</strong> para assuntos relacionados a esta experiência, à comunidade e às próximas <strong>Experiências do Bem</strong>.
              </p>
            </div>

            {/* Mensagem carinhosa e Botão para inscrever outra criança */}
            <div className="pt-3 border-t border-slate-100 flex flex-col items-center justify-center gap-4 text-center">
              <p className="text-lg sm:text-xl font-extrabold text-emerald-800">
                Nos vemos na Missão Água! 💧🌿💚
              </p>

              <button
                onClick={handleResetForNewChild}
                type="button"
                className="inline-flex items-center justify-center gap-2.5 text-xs sm:text-sm font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50/80 hover:bg-emerald-100 px-5 py-3 rounded-2xl transition-all border border-emerald-200/80 shadow-xs cursor-pointer text-center group"
              >
                <RotateCcw className="w-4 h-4 text-emerald-600 group-hover:rotate-[-45deg] transition-transform shrink-0" />
                <span className="flex flex-col text-center leading-snug">
                  <span>Deseja cadastrar outra criança?</span>
                  <span className="font-extrabold text-emerald-700 underline underline-offset-2">Clique aqui</span>
                </span>
              </button>
            </div>

          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Top Header Navigation Bar */}
      <header className="sticky top-0 z-40 bg-emerald-900/95 backdrop-blur-md border-b border-emerald-800/60 text-white py-2.5 px-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-center sm:justify-start gap-2.5">
          <img 
            src={LOGO_URL}
            alt="Destinos do Bem" 
            className="w-8 h-8 rounded-full object-cover border border-white/40 shadow-xs" 
          />
          <span className="font-extrabold text-xs sm:text-sm md:text-base tracking-tight truncate">
            💧 MISSÃO ÁGUA | BARCO ESCOLA DA NATUREZA
          </span>
        </div>
      </header>

      {/* Hero Section Banner with Topo Background Image */}
      <div className="relative w-full overflow-hidden bg-[#07331d] min-h-[380px] sm:min-h-[420px] md:min-h-[450px] flex items-end justify-center border-b border-emerald-800/40">
        {/* Background Image: No mobile, exibida centralizada e inteira de ponta a ponta sem cortes. No desktop, preenchimento total */}
        <div className="absolute inset-0 w-full h-full overflow-hidden flex flex-col justify-start">
          <img 
            src="/topo.png" 
            alt="Experiências do Bem - Destinos do Bem" 
            className="w-full h-auto max-h-[220px] object-contain object-top sm:h-full sm:max-h-none sm:object-cover sm:object-top select-none pointer-events-none"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = 'https://i.ibb.co/WvNLbS2Q/topo-sistema.png';
            }}
          />
          {/* Gradiente sutil que preserva a nitidez dos logos superiores e escurece suavemente na base */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#062c19]/55 to-[#041d10]/95 pointer-events-none" />
        </div>

        {/* Content pushed down on both mobile and desktop so the top logos in the image are fully readable */}
        <div className="relative z-10 max-w-3xl w-full mx-auto space-y-4 text-center px-4 pt-36 sm:pt-44 md:pt-48 pb-10 sm:pb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-800/90 backdrop-blur-md border border-emerald-400/40 rounded-full text-xs font-bold text-emerald-100 shadow-md">
            <Sparkle className="w-3.5 h-3.5 text-amber-300" />
            <span>1º EXPERIÊNCIAS DO BEM</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow-md">
            💧 MISSÃO ÁGUA | BARCO ESCOLA DA NATUREZA
          </h1>

          {/* Badges de Data e Horário (mesma linha em box diferentes) */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-3 pt-1 max-w-full">
            <div className="inline-flex items-center gap-1 sm:gap-1.5 bg-black/60 backdrop-blur-md px-2.5 sm:px-3.5 py-1.5 rounded-full border border-white/20 text-emerald-100 shadow-sm text-[11px] sm:text-xs md:text-sm font-semibold whitespace-nowrap shrink-0">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300 shrink-0" />
              <span>14 de novembro de 2026</span>
            </div>
            <div className="inline-flex items-center gap-1 sm:gap-1.5 bg-black/60 backdrop-blur-md px-2.5 sm:px-3.5 py-1.5 rounded-full border border-white/20 text-emerald-100 shadow-sm text-[11px] sm:text-xs md:text-sm font-semibold whitespace-nowrap shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300 shrink-0" />
              <span>Evento das 9h às 12h</span>
            </div>
          </div>

          {/* Linha debaixo: Endereço completo conforme solicitado */}
          <div className="pt-0.5 max-w-md mx-auto">
            <div className="inline-flex items-start text-left gap-2.5 bg-black/55 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/25 text-emerald-100 shadow-md text-xs sm:text-sm">
              <MapPin className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
              <div className="space-y-0.5 leading-snug">
                <p className="font-bold text-white text-xs sm:text-sm">Av. José Ferreira Coelho, 815</p>
                <p className="text-emerald-200/90 text-[11px] sm:text-xs">
                  Parque Mangueira (Praia dos Namorados)
                </p>
                <p className="text-emerald-300 text-[11px] sm:text-xs font-medium">
                  Americana – SP
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - com respiro e espaçamento após o header */}
      <main className="max-w-3xl mx-auto px-4 pt-8 sm:pt-10 pb-12 relative z-10 space-y-8">
        
        {/* CARD 1: APRESENTAÇÃO E REGRAS (IMAGEM 1) */}
        <motion.section 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-3xl shadow-xl p-6 sm:p-9 pt-8 sm:pt-10 border border-emerald-100 space-y-6"
        >
          {/* Espaço de respiro antes do início do texto conforme Imagem 3 */}
          <div className="space-y-4 text-slate-700 text-sm sm:text-base leading-relaxed pt-2">
            <p>
              Você está se cadastrando para participar da <strong>Missão Água, uma experiência educativa no Barco Escola da Natureza, dentro do 1º Experiências do Bem</strong>.
            </p>

            {/* Box com texto e ícone perfeitamente centralizados */}
            <div className="flex items-center justify-center gap-2.5 text-center text-emerald-800 font-extrabold bg-emerald-50 px-4 py-3.5 rounded-2xl border border-emerald-200/80 text-sm sm:text-base">
              <Ship className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>🚤 As vagas para o passeio são limitadas.</span>
            </div>

            <p className="font-semibold text-slate-800">
              A inscrição é <strong>individual para cada criança</strong> e deverá ser realizada pelo responsável.
            </p>
          </div>

          {/* Card Importante */}
          <div className="bg-amber-50/90 border-2 border-amber-300/80 rounded-2xl p-5 space-y-2.5 text-amber-950">
            <div className="flex items-center gap-2 text-amber-900 font-black text-sm sm:text-base uppercase tracking-wide">
              <span>⚠️ IMPORTANTE</span>
            </div>
            
            <p className="text-xs sm:text-sm font-semibold">
              Cada criança deverá estar acompanhada <strong>obrigatoriamente por 1 adulto responsável</strong>, que também participará do passeio.
            </p>

            <p className="text-xs sm:text-sm font-bold text-red-700">
              Não será possível inscrever uma criança sem responsável ou mais de 1 responsável por criança.
            </p>

            <p className="text-xs sm:text-sm text-slate-600 pt-1">
              A pré-inscrição <strong>não garante automaticamente a vaga</strong>. Após o período de inscrições, a organização fará a composição das turmas e entrará em contato com os participantes confirmados, informando a saída e o horário do passeio.
            </p>
          </div>
        </motion.section>

        {/* CARD 2: FORMULÁRIO COMPLETO */}
        <motion.section 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100"
        >
          <div className="p-6 sm:p-7 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
                <Users className="w-6 h-6 text-emerald-200" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black">
                  FORMULÁRIO DE PRÉ-INSCRIÇÃO
                </h2>
                <p className="text-emerald-100 text-xs sm:text-sm mt-0.5">
                  Preencha os dados da criança e do responsável
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="p-6 sm:p-8 space-y-8">
            
            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-sm"
              >
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <span className="font-semibold">{errorMessage}</span>
              </motion.div>
            )}

            {/* SEÇÃO 1: 👤 DADOS DO RESPONSÁVEL (IMAGEM 2) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="text-xl">👤</span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  DADOS DO RESPONSÁVEL
                </h3>
              </div>

              {/* 1. Nome completo do responsável */}
              <div 
                id="campo-nomeResponsavel" 
                className={cn(
                  "rounded-2xl transition-all duration-300",
                  errorField === 'nomeResponsavel' && "p-3 bg-red-50/60 border-2 border-red-400 ring-4 ring-red-400/20 shadow-sm"
                )}
              >
                <label htmlFor="nomeResponsavel" className="block text-sm font-bold text-slate-800 mb-2">
                  1. Nome completo do responsável <span className="text-emerald-600 font-bold">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="nomeResponsavel"
                    type="text"
                    name="nomeResponsavel"
                    value={formData.nomeResponsavel}
                    onChange={handleInputChange}
                    placeholder="Nome completo do responsável"
                    className={cn(
                      "w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-2xl focus:ring-2 focus:bg-white transition-all text-slate-900 text-sm sm:text-base",
                      errorField === 'nomeResponsavel'
                        ? "border-red-400 focus:ring-red-500 focus:border-red-500"
                        : "border-slate-200 focus:ring-emerald-600 focus:border-emerald-600"
                    )}
                  />
                </div>
                {errorField === 'nomeResponsavel' && (
                  <p className="text-xs font-bold text-red-600 flex items-center gap-1.5 mt-2 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Por favor, informe o nome completo do responsável.</span>
                  </p>
                )}
              </div>

              {/* 2. WhatsApp do responsável */}
              <div 
                id="campo-whatsappResponsavel"
                className={cn(
                  "rounded-2xl transition-all duration-300",
                  errorField === 'whatsappResponsavel' && "p-3 bg-red-50/60 border-2 border-red-400 ring-4 ring-red-400/20 shadow-sm"
                )}
              >
                <label htmlFor="whatsappResponsavel" className="block text-sm font-bold text-slate-800 mb-2">
                  2. WhatsApp do responsável <span className="text-emerald-600 font-bold">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="whatsappResponsavel"
                    type="tel"
                    name="whatsappResponsavel"
                    value={formData.whatsappResponsavel}
                    onChange={handleInputChange}
                    placeholder="(00) 00000-0000"
                    className={cn(
                      "w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-2xl focus:ring-2 focus:bg-white transition-all text-slate-900 text-sm sm:text-base",
                      errorField === 'whatsappResponsavel'
                        ? "border-red-400 focus:ring-red-500 focus:border-red-500"
                        : "border-slate-200 focus:ring-emerald-600 focus:border-emerald-600"
                    )}
                  />
                </div>
                {errorField === 'whatsappResponsavel' && (
                  <p className="text-xs font-bold text-red-600 flex items-center gap-1.5 mt-2 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Por favor, informe um WhatsApp válido com DDD do responsável.</span>
                  </p>
                )}
              </div>
            </div>

            {/* SEÇÃO 2: 👧 DADOS DA CRIANÇA (IMAGEM 2 & 3) */}
            <div className="space-y-5 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="text-xl">👧</span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  DADOS DA CRIANÇA
                </h3>
              </div>

              {/* 3. Nome completo da criança */}
              <div 
                id="campo-nomeCrianca"
                className={cn(
                  "rounded-2xl transition-all duration-300",
                  errorField === 'nomeCrianca' && "p-3 bg-red-50/60 border-2 border-red-400 ring-4 ring-red-400/20 shadow-sm"
                )}
              >
                <label htmlFor="nomeCrianca" className="block text-sm font-bold text-slate-800 mb-2">
                  3. Nome completo da criança <span className="text-emerald-600 font-bold">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="nomeCrianca"
                    type="text"
                    name="nomeCrianca"
                    value={formData.nomeCrianca}
                    onChange={handleInputChange}
                    placeholder="Nome completo da criança"
                    className={cn(
                      "w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-2xl focus:ring-2 focus:bg-white transition-all text-slate-900 text-sm sm:text-base",
                      errorField === 'nomeCrianca'
                        ? "border-red-400 focus:ring-red-500 focus:border-red-500"
                        : "border-slate-200 focus:ring-emerald-600 focus:border-emerald-600"
                    )}
                  />
                </div>
                {errorField === 'nomeCrianca' && (
                  <p className="text-xs font-bold text-red-600 flex items-center gap-1.5 mt-2 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Por favor, informe o nome completo da criança.</span>
                  </p>
                )}
              </div>

              {/* 4. Data de nascimento */}
              <div 
                id="campo-dataNascimentoCrianca"
                className={cn(
                  "rounded-2xl transition-all duration-300",
                  errorField === 'dataNascimentoCrianca' && "p-3 bg-red-50/60 border-2 border-red-400 ring-4 ring-red-400/20 shadow-sm"
                )}
              >
                <label htmlFor="dataNascimentoCrianca" className="block text-sm font-bold text-slate-800 mb-2">
                  4. Data de nascimento <span className="text-emerald-600 font-bold">*</span>
                </label>
                <div className="relative max-w-xs">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="dataNascimentoCrianca"
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    name="dataNascimentoCrianca"
                    value={formData.dataNascimentoCrianca}
                    onChange={(e) => {
                      const formatted = formatBirthDate(e.target.value);
                      setFormData((prev) => ({ 
                        ...prev, 
                        dataNascimentoCrianca: formatted,
                        faixaEtariaCrianca: formatted
                      }));
                      if (errorField === 'dataNascimentoCrianca') setErrorField(null);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="DD/MM/AAAA"
                    className={cn(
                      "w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-2xl focus:ring-2 focus:bg-white transition-all text-slate-900 text-sm sm:text-base font-semibold tracking-wider",
                      errorField === 'dataNascimentoCrianca'
                        ? "border-red-400 focus:ring-red-500 focus:border-red-500"
                        : "border-slate-200 focus:ring-emerald-600 focus:border-emerald-600"
                    )}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1.5 pl-1">Formato: DD/MM/AAAA (ex: 15/08/2018)</p>
                {errorField === 'dataNascimentoCrianca' && (
                  <p className="text-xs font-bold text-red-600 flex items-center gap-1.5 mt-2 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Por favor, preencha a data de nascimento da criança no formato DD/MM/AAAA.</span>
                  </p>
                )}
              </div>

              {/* 5. A criança é pessoa com deficiência (PCD)? */}
              <div 
                id="campo-pcd"
                className={cn(
                  "rounded-2xl transition-all duration-300",
                  errorField === 'pcd' && "p-3 bg-red-50/60 border-2 border-red-400 ring-4 ring-red-400/20 shadow-sm"
                )}
              >
                <label className="block text-sm font-bold text-slate-800 mb-2.5">
                  5. A criança é pessoa com deficiência (PCD)? <span className="text-emerald-600 font-bold">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-xs">
                  {(['Não', 'Sim'] as const).map((val) => {
                    const isSelected = formData.pcd === val;
                    return (
                      <button
                        type="button"
                        key={val}
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, pcd: val }));
                          if (errorField === 'pcd') setErrorField(null);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        className={cn(
                          "flex items-center justify-center gap-3 py-2.5 px-4 rounded-2xl border transition-all text-sm font-medium cursor-pointer",
                          isSelected
                            ? "bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-600"
                            : "bg-slate-50/70 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0",
                          isSelected 
                            ? "bg-emerald-600 border-emerald-600 text-white" 
                            : "border-slate-300 bg-white"
                        )}>
                          {isSelected && <span className="text-xs">✓</span>}
                        </div>
                        <span>{val}</span>
                      </button>
                    );
                  })}
                </div>
                {errorField === 'pcd' && (
                  <p className="text-xs font-bold text-red-600 flex items-center gap-1.5 mt-2 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Por favor, responda se a criança é pessoa com deficiência (PCD).</span>
                  </p>
                )}
              </div>

              {/* 6. A criança utiliza cadeira de rodas? */}
              <div 
                id="campo-cadeiraDeRodas"
                className={cn(
                  "rounded-2xl transition-all duration-300",
                  errorField === 'cadeiraDeRodas' && "p-3 bg-red-50/60 border-2 border-red-400 ring-4 ring-red-400/20 shadow-sm"
                )}
              >
                <label className="block text-sm font-bold text-slate-800 mb-2.5">
                  6. A criança utiliza cadeira de rodas? <span className="text-emerald-600 font-bold">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-xs">
                  {(['Não', 'Sim'] as const).map((val) => {
                    const isSelected = formData.cadeiraDeRodas === val;
                    return (
                      <button
                        type="button"
                        key={val}
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, cadeiraDeRodas: val }));
                          if (errorField === 'cadeiraDeRodas') setErrorField(null);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        className={cn(
                          "flex items-center justify-center gap-3 py-2.5 px-4 rounded-2xl border transition-all text-sm font-medium cursor-pointer",
                          isSelected
                            ? "bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-600"
                            : "bg-slate-50/70 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0",
                          isSelected 
                            ? "bg-emerald-600 border-emerald-600 text-white" 
                            : "border-slate-300 bg-white"
                        )}>
                          {isSelected && <span className="text-xs">✓</span>}
                        </div>
                        <span>{val}</span>
                      </button>
                    );
                  })}
                </div>
                {errorField === 'cadeiraDeRodas' && (
                  <p className="text-xs font-bold text-red-600 flex items-center gap-1.5 mt-2 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Por favor, responda se a criança utiliza cadeira de rodas.</span>
                  </p>
                )}
              </div>

              {/* 7. A criança necessita de algum recurso de acessibilidade, apoio ou atenção específica? */}
              <div 
                id="campo-necessitaAcessibilidade"
                className={cn(
                  "rounded-2xl transition-all duration-300",
                  (errorField === 'necessitaAcessibilidade' || errorField === 'acessibilidadeQual') && "p-3 bg-red-50/60 border-2 border-red-400 ring-4 ring-red-400/20 shadow-sm"
                )}
              >
                <label className="block text-sm font-bold text-slate-800 mb-2.5 leading-snug">
                  7. A criança necessita de algum recurso de acessibilidade, apoio ou atenção específica para participar da atividade? <span className="text-emerald-600 font-bold">*</span>
                </label>
                
                <div className="grid grid-cols-2 gap-3 max-w-xs mb-3">
                  {(['Não', 'Sim'] as const).map((val) => {
                    const isSelected = formData.necessitaAcessibilidade === val;
                    return (
                      <button
                        type="button"
                        key={val}
                        onClick={() => {
                          setFormData((prev) => ({ 
                            ...prev, 
                            necessitaAcessibilidade: val,
                            acessibilidadeQual: val === 'Não' ? '' : prev.acessibilidadeQual
                          }));
                          if (errorField === 'necessitaAcessibilidade') setErrorField(null);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        className={cn(
                          "flex items-center justify-center gap-3 py-2.5 px-4 rounded-2xl border transition-all text-sm font-medium cursor-pointer",
                          isSelected
                            ? "bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-600"
                            : "bg-slate-50/70 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0",
                          isSelected 
                            ? "bg-emerald-600 border-emerald-600 text-white" 
                            : "border-slate-300 bg-white"
                        )}>
                          {isSelected && <span className="text-xs">✓</span>}
                        </div>
                        <span>{val}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Se Sim — qual? */}
                <AnimatePresence>
                  {formData.necessitaAcessibilidade === 'Sim' && (
                    <motion.div
                      id="campo-acessibilidadeQual"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden pt-1"
                    >
                      <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 space-y-2">
                        <label htmlFor="acessibilidadeQual" className="block text-xs font-bold text-emerald-900">
                          Sim — qual recurso de acessibilidade, apoio ou atenção? <span className="text-emerald-700 font-bold">*</span>
                        </label>
                        <div className="relative">
                          <Accessibility className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-700" />
                          <input
                            id="acessibilidadeQual"
                            type="text"
                            name="acessibilidadeQual"
                            value={formData.acessibilidadeQual}
                            onChange={(e) => {
                              handleInputChange(e);
                              if (errorField === 'acessibilidadeQual') setErrorField(null);
                            }}
                            placeholder="Descreva o apoio ou recurso necessário..."
                            className={cn(
                              "w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl focus:ring-2 text-sm text-slate-900",
                              errorField === 'acessibilidadeQual'
                                ? "border-red-400 focus:ring-red-500 focus:border-red-500"
                                : "border-emerald-300 focus:ring-emerald-600 focus:border-emerald-600"
                            )}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {errorField === 'necessitaAcessibilidade' && (
                  <p className="text-xs font-bold text-red-600 flex items-center gap-1.5 mt-2 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Por favor, responda se a criança necessita de algum recurso de acessibilidade.</span>
                  </p>
                )}
                {errorField === 'acessibilidadeQual' && (
                  <p className="text-xs font-bold text-red-600 flex items-center gap-1.5 mt-2 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Por favor, descreva qual recurso de acessibilidade, apoio ou atenção é necessário.</span>
                  </p>
                )}
              </div>

            </div>

            {/* SEÇÃO 3: 🧑‍🤝‍🧑 PARTICIPAÇÃO NO PASSEIO (IMAGEM 3) */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="text-xl">🧑‍🤝‍🧑</span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  PARTICIPAÇÃO NO PASSEIO
                </h3>
              </div>

              <div 
                id="campo-confirmaPresenca"
                className={cn(
                  "rounded-2xl transition-all duration-300",
                  errorField === 'confirmaPresenca' && "p-3 bg-red-50/60 border-2 border-red-400 ring-4 ring-red-400/20 shadow-sm"
                )}
              >
                <label className="block text-sm font-bold text-slate-800 mb-2.5">
                  8. Você confirma que estará presente como responsável pela criança durante todo o passeio no Barco Escola? <span className="text-emerald-600 font-bold">*</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, confirmaPresenca: !prev.confirmaPresenca }));
                    if (errorField === 'confirmaPresenca') setErrorField(null);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className={cn(
                    "flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all font-medium text-sm w-full cursor-pointer",
                    formData.confirmaPresenca
                      ? "bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-600"
                      : "bg-slate-50/70 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0",
                    formData.confirmaPresenca 
                      ? "bg-emerald-600 border-emerald-600 text-white" 
                      : "border-slate-300 bg-white"
                  )}>
                    {formData.confirmaPresenca && <span className="text-xs">✓</span>}
                  </div>
                  <span>Sim, confirmo.</span>
                </button>

                {errorField === 'confirmaPresenca' && (
                  <p className="text-xs font-bold text-red-600 flex items-center gap-1.5 mt-2 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Por favor, confirme que estará presente como responsável pela criança durante o passeio.</span>
                  </p>
                )}

                {/* Callout de observação */}
                <div className="mt-3 pl-3.5 border-l-3 border-emerald-600 text-slate-600 text-xs sm:text-sm">
                  A presença de <strong>1 responsável por criança é obrigatória</strong>. A inscrição corresponde a uma dupla: <strong>1 criança + 1 responsável</strong>.
                </div>
              </div>
            </div>

            {/* SEÇÃO 4: 📷 AUTORIZAÇÃO DE IMAGEM (IMAGEM 4) */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Camera className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  AUTORIZAÇÃO DE IMAGEM
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Durante o evento poderão ser realizadas fotografias e vídeos das atividades, incluindo registros das crianças, famílias, passeio no Barco Escola, Júlia, Folhinha e demais momentos do evento.
              </p>

              <div 
                id="campo-autorizacaoImagem"
                className={cn(
                  "rounded-2xl transition-all duration-300",
                  errorField === 'autorizacaoImagem' && "p-3 bg-red-50/60 border-2 border-red-400 ring-4 ring-red-400/20 shadow-sm"
                )}
              >
                <label className="block text-sm font-bold text-slate-800 mb-2.5 leading-snug">
                  9. Você autoriza o uso da imagem da criança e do responsável em registros fotográficos e audiovisuais do Destinos do Bem e do Experiências do Bem, para divulgação institucional e das atividades do projeto? <span className="text-emerald-600 font-bold">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(['Sim, autorizo.', 'Não autorizo.'] as const).map((opt) => {
                    const isSelected = formData.autorizacaoImagem === opt;
                    return (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, autorizacaoImagem: opt }));
                          if (errorField === 'autorizacaoImagem') setErrorField(null);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-2xl border text-left transition-all font-medium text-sm cursor-pointer",
                          isSelected
                            ? "bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-600"
                            : "bg-slate-50/70 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0",
                          isSelected 
                            ? "bg-emerald-600 border-emerald-600 text-white" 
                            : "border-slate-300 bg-white"
                        )}>
                          {isSelected && <span className="text-xs">✓</span>}
                        </div>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {errorField === 'autorizacaoImagem' && (
                  <p className="text-xs font-bold text-red-600 flex items-center gap-1.5 mt-2 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Por favor, responda sobre a autorização de uso de imagem.</span>
                  </p>
                )}
              </div>
            </div>

            {/* SEÇÃO 5: 💚 UMA EXPERIÊNCIA DO BEM PARA TODOS (IMAGEM 5) */}
            <div className="bg-emerald-50/70 p-5 sm:p-6 rounded-2xl border border-emerald-200/80 space-y-3.5 text-slate-700 text-xs sm:text-sm leading-relaxed">
              <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm sm:text-base">
                <Heart className="w-4 h-4 fill-emerald-600 text-emerald-600 shrink-0" />
                <span>💚 UMA EXPERIÊNCIA DO BEM PARA TODOS</span>
              </div>

              <p>
                O passeio no <strong>Barco Escola da Natureza</strong> terá vagas limitadas e, por isso, será necessário realizar este cadastro para participar da <strong>Missão Água</strong>.
              </p>

              <p className="font-bold text-emerald-800">
                Mas o Experiências do Bem é para todos! 🌿
              </p>

              <p>
                Mesmo que você não consiga uma vaga no passeio, sua família será muito bem-vinda ao evento e poderá aproveitar todas as atividades que estamos preparando com muito carinho em terra, além de conhecer a <strong>Júlia, a Folhinha e o espaço do Destinos do Bem</strong>.
              </p>

              <p className="font-semibold text-slate-800">
                E tem mais: <strong>todos poderão fazer parte da nossa ação do bem!</strong> 🐾💚
              </p>

              <p>
                Durante o evento, teremos uma ação especial de contribuição para os <strong>animais que vivem e são cuidados no Barco Escola da Natureza</strong>.
              </p>

              <p>
                Quem participar do passeio, quem estiver na lista de espera e também quem vier apenas para aproveitar o evento em terra poderá contribuir.
              </p>

              <p className="font-bold text-emerald-900 bg-white/70 p-3 rounded-xl border border-emerald-100">
                Porque, no Experiências do Bem, acreditamos que <strong>fazer o bem não depende de ter uma vaga no barco.</strong>
              </p>

              <p className="text-emerald-800 font-extrabold">
                Cada gesto conta. 💚
              </p>
            </div>

            {/* SEÇÃO 6: 📲 FINALIZAÇÃO (IMAGEM 6) */}
            <div className="space-y-3 pt-2 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
              <div className="flex items-center gap-2 font-black text-slate-900 text-sm sm:text-base">
                <span>📲 FINALIZAÇÃO</span>
              </div>

              <p>
                Ao enviar este cadastro, você manifesta interesse em participar da <strong>Missão Água | Barco Escola da Natureza</strong>.
              </p>

              <p className="font-bold text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                A pré-inscrição não representa confirmação automática da vaga.
              </p>

              <p>
                Após a organização das turmas, o <strong>Destinos do Bem entrará em contato diretamente pelo WhatsApp informado</strong> para confirmar a participação e enviar as orientações sobre o passeio, incluindo a saída e o horário.
              </p>

              <p>
                Ao enviar o formulário, você também autoriza o <strong>Destinos do Bem a entrar em contato diretamente pelo WhatsApp informado</strong> para assuntos relacionados a esta experiência, à comunidade e às próximas <strong>Experiências do Bem</strong>.
              </p>

              <p className="text-emerald-800 font-black text-sm sm:text-base pt-1">
                Nos vemos na Missão Água! 💧🌿💚
              </p>
            </div>

            {/* Botão de envio */}
            <div className="pt-4">
              <button
                disabled={isSubmitting}
                type="submit"
                id="btn-enviar-inscricao-evento"
                className={cn(
                  "w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-base sm:text-lg rounded-2xl transition-all shadow-xl hover:shadow-emerald-600/30 flex items-center justify-center gap-2.5 group cursor-pointer",
                  isSubmitting && "opacity-75 cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando cadastro e gerando número...
                  </span>
                ) : (
                  <>
                    <span>ENVIAR CADASTRO PARA O EVENTO</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>

          </form>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="bg-emerald-950 text-emerald-200 py-10 px-4 mt-12 border-t border-emerald-900">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 text-center sm:text-left">
            <img 
              src={LOGO_URL}
              alt="Logo Destinos do Bem" 
              className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/50 shadow-md shrink-0"
            />
            <div className="text-center sm:text-left">
              <p className="font-bold text-white text-base">💧 MISSÃO ÁGUA | BARCO ESCOLA DA NATUREZA</p>
              <p className="text-xs text-emerald-300">1º Experiências do Bem • Comunidade Destinos do Bem</p>
            </div>
          </div>
          
          <p className="text-xs sm:text-sm text-emerald-300/80 max-w-md mx-auto text-center">
            Conectando famílias através de vivências positivas, aprendizado, empatia e transformação social.
          </p>

          {/* Desenvolvido por - EBCB */}
          <div className="pt-6 border-t border-emerald-900/60 flex flex-col items-center justify-center space-y-3">
            <p className="text-[11px] sm:text-xs font-semibold tracking-wider text-emerald-400/90 uppercase">
              DESENVOLVIDO POR
            </p>
            <a 
              href="https://easybyzcreator.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block transition-transform hover:scale-105"
            >
              <img 
                src="https://i.ibb.co/bgc66ygJ/ebcb.png" 
                alt="Easy Byz Creator" 
                className="h-[108px] sm:h-[120px] w-auto object-contain mx-auto"
              />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
