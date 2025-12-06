import type { Handler } from "@netlify/functions";

const HTS_CURRENT_RELEASE_URL = "https://hts.usitc.gov/reststop/currentRelease";

export const handler: Handler = async () => {
  try {
    const response = await fetch(HTS_CURRENT_RELEASE_URL, {
      headers: {
        "Accept": "application/json",
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch current release info: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "cache-control": "s-maxage=3600, stale-while-revalidate", // Cache for 1 hour
      },
      body: JSON.stringify(data),
    };
  } catch (err: any) {
    console.error("get-hts-current-release Error:", err);
    return {
      statusCode: 502, // Bad Gateway
      body: JSON.stringify({ error: "Failed to fetch from upstream HTS API.", details: err.message }),
    };
  }
};