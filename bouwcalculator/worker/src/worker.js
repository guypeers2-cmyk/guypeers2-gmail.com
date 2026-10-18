// ==========================================================
// BOUWPRIJSCALCULATOR — Cloudflare Worker
//
// Serveert de app (statische bestanden) en rekent de offertes
// met de JS-rekenkern. De rekenkern is een 1-op-1 port van
// bouw/bereken.py; de pariteitstest bewaakt dat (zie
// bouwcalculator/tests/test_pariteit.py).
// ==========================================================

import { berekenOfferte, prijsboek } from "../../web/engine.js";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

async function leesJson(request) {
  try {
    return await request.json();
  } catch (_) {
    return {};
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pad = url.pathname.replace(/\/+$/, "") || "/";

    if (pad === "/api/prijsboek") {
      return json({ ...prijsboek(), opslag: "lokaal" });
    }

    if (pad === "/api/offerte") {
      if (request.method !== "POST") {
        return json({ fout: "Gebruik POST voor deze route." }, 405);
      }
      try {
        const body = await leesJson(request);
        return json(berekenOfferte(body.project || {}));
      } catch (fout) {
        return json({ fout: `Kon de offerte niet berekenen: ${fout.message}` }, 400);
      }
    }

    if (pad.startsWith("/api/projecten")) {
      // De Worker heeft geen database: offertes worden in de browser bewaard.
      return json({
        fout: "Opslaan gebeurt in de browser op deze Worker.",
        projecten: [],
      }, 501);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ fout: "Onbekende aanroep." }, 405);
    }

    // Alles overig komt uit de statische bestanden.
    return env.ASSETS.fetch(request);
  },
};
