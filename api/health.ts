type Request = { method?: string };

type Response = {
  status: (code: number) => Response;
  json: (body: unknown) => void;
  setHeader?: (name: string, value: string | number) => void;
};

export default function handler(req: Request, res: Response) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  res.setHeader?.('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    service: 'hyperlink-api',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
}
