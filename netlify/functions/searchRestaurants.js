// netlify/functions/searchRestaurants.js

export async function handler(event) {
  try {
    const apiKey = process.env.YELP_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing YELP_API_KEY env var" }),
      };
    }

    const params = event.queryStringParameters || {};
    const zip = (params.zip || "").trim();
    const radiusMiles = Number(params.radiusMiles || params.radius || 3);
    const excludeRaw = (params.exclude || "").trim();

    if (!zip) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing zip" }),
      };
    }

    const exclude = excludeRaw
      ? excludeRaw.split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
      : [];

    const radiusMeters = Math.min(
      40000,
      Math.max(500, Math.round(radiusMiles * 1609.34))
    );

    const url =
      "https://api.yelp.com/v3/businesses/search?" +
      new URLSearchParams({
        location: zip,
        radius: String(radiusMeters),
        categories: "restaurants",
        limit: "30",
        sort_by: "rating",
      }).toString();

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const text = await response.text();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "Yelp API error", details: text }),
      };
    }

    const data = JSON.parse(text);

    let names = (data.businesses || []).map(b => b.name);

    if (exclude.length) {
      names = names.filter(name => {
        const lower = name.toLowerCase();
        return !exclude.some(word => lower.includes(word));
      });
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}