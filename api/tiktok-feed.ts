type Request = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

type Response = {
  status: (code: number) => Response;
  json: (body: unknown) => void;
};

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  const apiHost = process.env.RAPIDAPI_HOST ?? 'tiktok-scraper7.p.rapidapi.com';

  if (!apiKey) {
    res.status(503).json({ error: 'TikTok feed is not configured' });
    return;
  }

  const region = typeof req.query?.region === 'string' ? req.query.region : 'ke';
  const countValue = typeof req.query?.count === 'string' ? Number(req.query.count) : 10;
  const count = Number.isInteger(countValue) ? Math.min(Math.max(countValue, 1), 20) : 10;
  const url = new URL(`https://${apiHost}/feed/list`);
  url.searchParams.set('region', region);
  url.searchParams.set('count', String(count));

  try {
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': apiHost,
      },
    });

    const body = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ error: 'TikTok feed request failed' });
      return;
    }

    res.status(200).json(body);
  } catch {
    res.status(502).json({ error: 'Unable to reach TikTok feed' });
  }
}
