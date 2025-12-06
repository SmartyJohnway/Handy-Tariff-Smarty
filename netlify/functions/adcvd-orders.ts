import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';

const BASE_URL =
  process.env.ADCVD_BASE_URL ||
  // 預設使用 data.trade.gov 端點
  'https://data.trade.gov/adcvd_orders/v1/search';
const API_KEY = process.env.ADCVD_SUBSCRIPTION_KEY || '';
const USER_AGENT =
  process.env.ADCVD_USER_AGENT ||
  'Handy-Tariff-Smarty/1.0 (+https://access.trade.gov) NetlifyFunction';

export const handler: Handler = async (event) => {
  try {
    if (!API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing ADCVD_SUBSCRIPTION_KEY env' }),
      };
    }

    const params = new URLSearchParams(event.queryStringParameters as Record<string, string>);
    if (!params.get('q')) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing q parameter' }) };
    }

    const url = `${BASE_URL}?${params.toString()}`;
    const headers: Record<string, string> = {
      // 部分 Azure APIM 端點要求 Ocp-Apim-Subscription-Key；保留兩個 header 以確保相容
      'subscription-key': API_KEY,
      'Ocp-Apim-Subscription-Key': API_KEY,
      // 有些端點檢查 Origin/Host 才放行
      Origin: 'https://access.trade.gov',
      Host: 'data.trade.gov',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Cache-Control': 'no-cache',
      Accept: '*/*',
      'User-Agent': USER_AGENT,
    };

    const res = await fetch(url, { headers });

    const text = await res.text();
    return {
      statusCode: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
      body: text,
    };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'unknown error' }) };
  }
};
