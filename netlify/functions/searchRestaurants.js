// netlify/functions/searchRestaurants.js

export async function handler(event) {
  try {
    const apiKey = process.env.YELP_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing YELP_API_KEY" }),
      };
    }

    const params = event.queryStringParameters || {};
    const zip = (params.zip || "").trim();
    const radiusMiles = Number(params.radiusMiles || 3);
    const excludeRaw = (params.exclude || "").trim();

    if (!zip) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing zip" }),
      };
    }

    const exclude = excludeRaw
      ? excludeRaw.split(",").map(s => s.trim().toLowerCase())
      : [];

    const radiusMeters = Math.min(
      40000,
      Math.max(500, Math.round(radiusMiles * 1609.34))
    );

    const url = new URL("https://api.yelp.com/v3/businesses/search");
    url.search = new URLSearchParams({
      location: zip,
      radius: String(radiusMeters),
      categories: "restaurants",
      limit: "30",
      sort_by: "rating",
    });

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const data = await response.json();

    let names = (data.businesses || []).map(b => b.name);

    if (exclude.length) {
      names = names.filter(name =>
        !exclude.some(ex =>
          name.toLowerCase().includes(ex)
        )
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify(names),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
