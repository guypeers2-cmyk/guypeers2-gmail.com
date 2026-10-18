#!/usr/bin/env bash
# ==========================================================
# Controleer of de Bouwprijscalculator online staat.
#
#   bash bouwcalculator/deploy/controle.sh
#   bash bouwcalculator/deploy/controle.sh https://andere-url
#
# Te draaien op een machine die de URL kan bereiken.
# ==========================================================
set -uo pipefail

URL="${1:-https://patient-sun-c959.guypeers2.workers.dev}"
URL="${URL%/}"
fouten=0

regel() { printf "  %-34s %s\n" "$1" "$2"; }
check() { # naam url verwacht
  local naam="$1" url="$2" verwacht="$3" code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "$url" 2>/dev/null || echo "000")
  if [ "$code" = "$verwacht" ]; then
    regel "$naam" "OK (HTTP $code)"
  else
    regel "$naam" "FOUT — HTTP $code (verwacht $verwacht)"
    fouten=$((fouten + 1))
  fi
}

echo "Controle van $URL"
echo

# Eerst: serveert de worker onze app, of nog de standaard "Hello World!"?
root=$(curl -s --max-time 20 "$URL/" 2>/dev/null || true)
if printf "%s" "$root" | grep -qi "hello world"; then
  echo "  inhoud root                    FOUT — standaard 'Hello World!'"
  echo
  echo "De worker bestaat, maar serveert nog de standaard 'Hello World!'." >&2
  echo "De app is dus NIET (of niet met deze code) gedeployed." >&2
  echo "  → deploy vanuit de repo-map:  bash bouwcalculator/deploy/nu-publiceren.sh" >&2
  exit 1
fi
if printf "%s" "$root" | grep -qi "bouwprijscalculator\|bouwprijs"; then
  echo "  inhoud root                    OK (onze app)"
else
  echo "  inhoud root                    ? (onbekende inhoud)"
fi
echo

echo "Statische app"
check "index.html" "$URL/" "200"
check "styles.css" "$URL/styles.css" "200"
check "app.js" "$URL/app.js" "200"
check "engine.js (browser-fallback)" "$URL/engine.js" "200"
check "prijsboek.js" "$URL/prijsboek.js" "200"

echo
echo "Rekenkern (API)"
check "/api/prijsboek" "$URL/api/prijsboek" "200"
check "/api/offerte" "$URL/api/offerte" "405"   # 405 = alleen POST, dus de route bestaat

echo
echo "Een echte berekening"
antwoord=$(curl -s --max-time 25 -X POST "$URL/api/offerte" \
  -H "Content-Type: application/json" \
  -d '{"project":{"naam":"Controle","ruimtes":[{"id":"r1","naam":"K","lengte":4,"breedte":3,"hoogte":2.5,"openingen":[{"naam":"Deur","muur":"noord","breedte":0.9,"hoogte":2.1}]}],"regels":[{"id":"g1","ruimte_id":"r1","oppervlak":"noord","pakket_id":"gyproc_wand_profiel","opties":{"zijden":"2 zijden","isolatie":"mineralen wol 75 mm"}}]}}' 2>/dev/null)
if [ -n "$antwoord" ]; then
  echo "$antwoord" | python3 -c "
import json,sys
d = json.load(sys.stdin)
r = d['regels'][0]
t = d['totalen']
print(f\"  {'omschrijving':<34} {r['omschrijving'][:44]}\")
print(f\"  {'uren / materiaal / arbeid':<34} {r['uren']} u · {r['materiaal_kosten']} · {r['arbeidskosten']}\")
print(f\"  {'totaal incl. btw':<34} {t['totaal']} (moet 1020.30 zijn)\")
" 2>/dev/null || regel "antwoord" "onleesbaar"
else
  regel "antwoord" "geen antwoord"
  fouten=$((fouten + 1))
fi

echo
if [ "$fouten" -eq 0 ]; then
  body=$(curl -s --max-time 20 "$URL/api/prijsboek" 2>/dev/null || true)
  if printf "%s" "$body" | grep -qi "hello world"; then
    echo "FOUT: de worker serveert de standaard 'Hello World!' — de app staat er nog niet." >&2
    echo "      Deploy vanuit de repo-map:  bash bouwcalculator/deploy/nu-publiceren.sh" >&2
    exit 1
  fi
  echo "Alles OK — de app staat online op $URL"
else
  echo "$fouten punt(en) mislukt."
  echo
  echo "Hulp:"
  echo "  • HTTP 404 op alles → de worker heet anders of is niet gedeployed."
  echo "    Kijk in de Cloudflare-dashboard bij Workers & Pages."
  echo "  • HTTP 530/1101 → de workers.dev-subdomain voor dit account staat nog uit."
  echo "    Dashboard → account → Workers & Pages → workers.dev-subdomain → activeren."
  echo "  • HTTP 403 op /api/* → de Worker serveert geen API; controleer of de"
  echo "    juiste versie van bouwcalculator/web is gedeployd."
  echo "  • Alles 404 behalve / → het pad /bouwcalculator/web is verkeerd."
fi
exit $((fouten > 0))
