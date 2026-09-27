import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const formData = req.body;
  const rawUrl = process.env.GOOGLE_SHEETS_URL || 'https://script.google.com/macros/s/AKfycbzvGmVaJ06wQ6M3LdkUFi3NV7NCpUpc-h8-Oi46KFVNlcYR5LFsGMYamIAnv-yMl9Sd/exec';
  const match = rawUrl.match(/https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_\-]+\/exec/);
  const GOOGLE_SHEETS_URL = match ? match[0] : rawUrl;

  try {
    const response = await fetch(GOOGLE_SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(formData),
      redirect: 'manual',
    });

    if (response.status === 200 || response.status === 302 || response.type === 'opaqueredirect' || response.ok) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(500).json({ success: false, error: 'Erro ao salvar na planilha' });
    }
  } catch (error) {
    console.error('Erro ao enviar para Sheets:', error);
    return res.status(500).json({ success: false, error: 'Erro de conexão com a planilha' });
  }
}
