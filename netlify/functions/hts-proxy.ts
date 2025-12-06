import type { Handler, HandlerResponse } from "@netlify/functions";

const BASE_HEADERS = {
  "Accept": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
};

export const handler: Handler = async (event) => {
  const query = event.queryStringParameters?.query || event.queryStringParameters?.keyword || '';

  const baseHeaders: HandlerResponse['headers'] = {
    "Content-Type": "application/json",
    "X-Adapter-Mode": "hts:api"
  };

  if (!query) {
    return {
      statusCode: 400,
      headers: baseHeaders,
      body: JSON.stringify({ results: [], error: 'Missing query parameter' })
    };
  }

  const url = `https://hts.usitc.gov/reststop/search?keyword=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, {
      headers: {
        ...BASE_HEADERS,
      }
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: baseHeaders,
        body: JSON.stringify({ results: [], error: `HTS API returned an error: ${response.statusText}` })
      };
    }

    const results = await response.json();

    return {
      statusCode: 200,
      headers: {
        ...baseHeaders,
        "cache-control": "s-maxage=3600, stale-while-revalidate",
      },
      body: JSON.stringify({ results })
    };
  } catch (err: any) {
    return {
      statusCode: 502,
      headers: baseHeaders,
      body: JSON.stringify({ results: [], error: 'Failed to fetch or parse HTS API response', details: err.message })
    };
  }
};
