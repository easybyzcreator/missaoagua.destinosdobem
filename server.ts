import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

function getCleanGoogleSheetsUrl(rawUrl?: string): string {
  const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbzvGmVaJ06wQ6M3LdkUFi3NV7NCpUpc-h8-Oi46KFVNlcYR5LFsGMYamIAnv-yMl9Sd/exec';
  if (!rawUrl) return DEFAULT_URL;
  const match = rawUrl.match(/https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_\-]+\/exec/);
  return match ? match[0] : DEFAULT_URL;
}

const COUNTER_FILE = path.join(process.cwd(), 'registration-counter.json');

function getNextSequentialNumber(requestedNumber?: number): number {
  let count = 0;
  try {
    if (fs.existsSync(COUNTER_FILE)) {
      const data = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf-8'));
      if (typeof data.count === 'number') {
        count = data.count;
      }
    }
  } catch (e) {
    console.error('Erro ao ler contador:', e);
  }

  if (typeof requestedNumber === 'number' && requestedNumber > 0) {
    if (requestedNumber > count) {
      count = requestedNumber;
      try {
        fs.writeFileSync(COUNTER_FILE, JSON.stringify({ count, lastUpdated: new Date().toISOString() }));
      } catch (e) {
        console.error('Erro ao salvar contador:', e);
      }
    }
    return requestedNumber;
  }

  count += 1;
  try {
    fs.writeFileSync(COUNTER_FILE, JSON.stringify({ count, lastUpdated: new Date().toISOString() }));
  } catch (e) {
    console.error('Erro ao salvar contador:', e);
  }
  return count;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Rota para consultar o próximo número ou contador atual
  app.get('/api/counter', (_req, res) => {
    let count = 0;
    try {
      if (fs.existsSync(COUNTER_FILE)) {
        const data = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf-8'));
        count = data.count || 0;
      }
    } catch {
      count = 0;
    }
    res.json({ currentCount: count });
  });

  // Rota para receber os dados do formulário
  app.post('/api/submit', async (req, res) => {
    const formData = req.body;
    console.log('Dados recebidos no servidor:', formData);

    let clientNum: number | undefined;
    if (typeof formData.numeroInscricao === 'number') {
      clientNum = formData.numeroInscricao;
    } else if (typeof formData.numeroInscricao === 'string') {
      const parsed = parseInt(formData.numeroInscricao.replace('#', ''), 10);
      if (!isNaN(parsed) && parsed > 0) clientNum = parsed;
    }

    const finalSequentialNum = getNextSequentialNumber(clientNum);
    const formattedNum = `#${String(finalSequentialNum).padStart(4, '0')}`;

    const GOOGLE_SHEETS_URL = getCleanGoogleSheetsUrl(process.env.GOOGLE_SHEETS_URL);
    
    let sheetsSaved = false;
    try {
      const payloadToSend = {
        ...formData,
        numeroInscricao: formattedNum,
        dataInscricao: formData.dataInscricao || new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      };

      console.log('Enviando dados para Google Sheets (uma única vez):', GOOGLE_SHEETS_URL);
      const response = await fetch(GOOGLE_SHEETS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payloadToSend),
        redirect: 'manual',
        signal: AbortSignal.timeout(10000)
      });

      // Google Apps Script retorna HTTP 302 com redirecionamento ao gravar com sucesso
      if (response.status === 200 || response.status === 302 || response.type === 'opaqueredirect' || response.ok) {
        sheetsSaved = true;
        console.log(`[Google Sheets] Sucesso! Registro salvo na planilha com número ${formattedNum}`);
      } else {
        console.error(`[Google Sheets] Resposta inesperada: status ${response.status}`);
      }
    } catch (error: any) {
      console.error('[Google Sheets] Erro na requisição:', error?.message || error);
    }

    res.json({ success: true, sheetsSaved, numeroInscricao: finalSequentialNum });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
