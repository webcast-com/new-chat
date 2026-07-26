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

  const matchSlug = typeof req.query?.matchSlug === 'string' ? req.query.matchSlug : '';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(matchSlug)) {
    res.status(400).json({ error: 'A valid match slug is required' });
    return;
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  const apiHost = process.env.RAPIDAPI_HOST ?? 'sport-streaming-api.p.rapidapi.com';
  if (!apiKey) {
    res.status(503).json({ error: 'Sports streaming is not configured' });
    return;
  }

  try {
    const response = await fetch(`https://${apiHost}/streams/${encodeURIComponent(matchSlug)}`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': apiHost,
      },
    });
    const body = await response.json();
    res.status(response.status).json(response.ok ? body : { error: 'Stream lookup failed' });
  } catch {
    res.status(502).json({ error: 'Unable to reach the sports streaming service' });
  }
}
