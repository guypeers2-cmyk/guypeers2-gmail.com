#!/usr/bin/env bash
# ==========================================================
# Publiceer de Bouwprijscalculator op Cloudflare Workers
# en controleer of de URL echt live staat.
#
#   CLOUDFLARE_API_TOKEN=cfat_... bash bouwcalculator/deploy/nu-publiceren.sh
#
# Zonder token werkt het ook als je al bent ingelogd:
#   npx wrangler login && bash bouwcalculator/deploy/nu-publiceren.sh
# ==========================================================
set -euo pipefail

URL="https://patient-sun-c959.guypeers2.workers.dev"

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] && [ ! -f "$HOME/.config/.wrangler/config/default.toml" ]; then
  echo "Geen token en geen login gevonden." >&2
  echo "  Maak een token aan op https://dash.cloudflare.com/profile/api-tokens" >&2
  echo "  met de rechten 'Edit Cloudflare Workers', en draai dan:" >&2
  echo "    CLOUDFLARE_API_TOKEN=<jouw-token> bash bouwcalculator/deploy/nu-publiceren.sh" >&2
  exit 1
fi

echo "==> 1/3  Deployen naar Cloudflare Workers"
npx --yes wrangler@4 deploy

echo
echo "==> 2/3  Wachten tot de Worker antwoordt"
code="000"
for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$URL/" || echo "000")
  if [ "$code" = "200" ]; then
    break
  fi
  sleep 5
done

echo
echo "==> 3/3  Controle"
if [ "$code" = "200" ]; then
  echo "    LIVE: $URL"
  echo
  echo "    Tip: 'npx wrangler tail' laat de live requests van de Worker zien."
else
  echo "    De URL antwoordde nog niet (HTTP $code)." >&2
  echo "    Kijk in de dashboard bij Workers & Pages -> patient-sun-c959 -> Logs" >&2
  echo "    of draai opnieuw:  npx wrangler deploy" >&2
  exit 1
fi
