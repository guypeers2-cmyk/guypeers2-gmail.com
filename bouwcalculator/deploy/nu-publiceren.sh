#!/usr/bin/env bash
# ==========================================================
# Publiceer de Bouwprijscalculator op Cloudflare Workers
# en controleer meteen of de URL echt live staat.
#
#   bash bouwcalculator/deploy/nu-publiceren.sh
#   bash bouwcalculator/deploy/nu-publiceren.sh --controle   # alleen checken
#
# Zonder token in de omgeving werkt het ook als je al bent
# ingelogd (npx wrangler login). Anders wordt er veilig
# gevraagd om een API-token (met 'Edit Cloudflare Workers').
#
# LET OP: dit script gaat vanzelf naar de hoofdmap van de
# repository, zodat wraangler ALTIJD onze wrangler.toml
# gebruikt. Een deploy vanuit een andere map levert de
# standaard "Hello World!"-worker op.
# ==========================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

URL="${BOUW_URL:-https://patient-sun-c959.guypeers2.workers.dev}"
URL="${URL%/}"
EXPECTED_NAME="patient-sun-c959"
alleen_controle=0
[ "${1:-}" = "--controle" ] && alleen_controle=1

fout() { printf "  %-32s %s\n" "$1" "$2"; }

# ------------------------------------------------------------
# 0. Voorwaarden
# ------------------------------------------------------------
if [ "$alleen_controle" -eq 0 ]; then
  echo "==> Voorwaarden"
  if [ ! -f "$REPO_ROOT/wrangler.toml" ]; then
    echo "    FOUT: geen wrangler.toml in $REPO_ROOT" >&2
    exit 1
  fi
  name=$(grep -E '^name[[:space:]]*=' "$REPO_ROOT/wrangler.toml" | head -1 | sed -E 's/.*=[[:space:]]*"([^"]+)".*/\1/')
  main=$(grep -E '^main[[:space:]]*=' "$REPO_ROOT/wrangler.toml" | head -1 | sed -E 's/.*=[[:space:]]*"([^"]+)".*/\1/')
  fout "repo-map" "$REPO_ROOT"
  fout "worker" "$name  (main: $main)"
  if [ "$name" != "$EXPECTED_NAME" ]; then
    echo "    LET OP: worker heet '$name' i.p.v. '$EXPECTED_NAME'." >&2
    echo "    De URL wordt dan https://$name.guypeers2.workers.dev" >&2
    URL="https://$name.guypeers2.workers.dev"
  fi
  if [ ! -f "$REPO_ROOT/$main" ]; then
    echo "    FOUT: $main ontbreekt" >&2
    exit 1
  fi
  if [ ! -f "$REPO_ROOT/bouwcalculator/web/index.html" ]; then
    echo "    FOUT: bouwcalculator/web/index.html ontbreekt" >&2
    exit 1
  fi
  echo

  # Token: uit de omgeving, anders uit de wrangler-login, anders vragen.
  if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] && [ ! -f "$HOME/.config/.wrangler/config/default.toml" ]; then
    if [ ! -t 0 ]; then
      echo "    Geen API-token en geen wrangler-login gevonden." >&2
      echo "    Zet het token in de omgeving en draai opnieuw:" >&2
      echo "      CLOUDFLARE_API_TOKEN=<jouw-token> bash bouwcalculator/deploy/nu-publiceren.sh" >&2
      exit 1
    fi
    echo "    Geen API-token en geen wrangler-login gevonden."
    echo "    Maak een token aan op https://dash.cloudflare.com/profile/api-tokens"
    echo "    met de rechten 'Edit Cloudflare Workers' ( Workers Scripts: Edit )."
    echo
    printf "    Token (ingegeven blijft verborgen): "
    read -rs CLOUDFLARE_API_TOKEN
    echo
    if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
      echo "    Geen token ingevuld — afgebroken." >&2
      exit 1
    fi
    export CLOUDFLARE_API_TOKEN
  fi
  echo

  # ------------------------------------------------------------
  # 1. Deployen
  # ------------------------------------------------------------
  echo "==> Deployen naar Cloudflare Workers"
  log="$(mktemp)"
  npx --yes wrangler@4 deploy < /dev/null 2>&1 | tee "$log"
  deploy_rc=${PIPESTATUS[0]}
  # Het URL dat wraangler noemt is de waarheid (bv. bij een ander account).
  echte_url=$(grep -oE 'https://[a-z0-9.-]+\.workers\.dev' "$log" | head -1)
  if [ -n "$echte_url" ]; then
    URL="${echte_url%/}"
  fi
  if [ "$deploy_rc" -ne 0 ]; then
    echo
    echo "    Deploy gaf een fout (exit $deploy_rc)." >&2
    echo "    Bovenstaande melding geeft de oorzaak; meestal:" >&2
    echo "      • 401/403 → token zonder rechten of nog niet geactiveerd" >&2
    echo "      • 10021/530 → workers.dev-subdomain staat uit" >&2
    echo "      • netwerkfout → proxy/VPN of verkeerde tokenregio" >&2
    echo "    Probeer daarna opnieuw:" >&2
    echo "      bash bouwcalculator/deploy/nu-publiceren.sh" >&2
    rm -f "$log"
    exit "$deploy_rc"
  fi
  rm -f "$log"
  echo
fi

# ------------------------------------------------------------
# 2. Wachten tot de Worker antwoordt
# ------------------------------------------------------------
echo "==> Wachten tot $URL antwoordt"
code="000"
body=""
for _ in $(seq 1 24); do
  body=$(curl -s --max-time 15 "$URL/api/prijsboek" 2>/dev/null || true)
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$URL/" 2>/dev/null || echo "000")
  if [ "$code" = "200" ]; then
    break
  fi
  sleep 5
done

# ------------------------------------------------------------
# 3. Controle
# ------------------------------------------------------------
echo
echo "==> Controle"
fout "HTTP-status" "$code"

if [ "$code" != "200" ]; then
  echo
  echo "    De URL antwoordde nog niet (HTTP $code)." >&2
  echo "    • 404  → de worker bestaat niet (of heet anders)" >&2
  echo "    • 530/1101 → workers.dev-subdomain staat uit voor dit account" >&2
  echo "              Dashboard → Workers & Pages → workers.dev-subdomain → activeren" >&2
  echo "    • 403  → tokenrechten of een fout in de Worker-log" >&2
  exit 1
fi

if printf "%s" "$body" | grep -qi "hello world"; then
  echo "    FOUT: de worker serveert nog de standaard 'Hello World!'." >&2
  echo "    Dat betekent dat de deploy NIET vanuit de repo-map is gedaan." >&2
  echo "    Draai dit script (of 'npx wrangler deploy') vanuit $REPO_ROOT" >&2
  exit 1
fi

if printf "%s" "$body" | grep -q '"tarieven"'; then
  fout "prijsboek-API" "OK (onze app staat live)"
  echo
  echo "    LIVE: $URL"
  echo
  echo "    Tip: 'npx wrangler tail' laat de live requests van de Worker zien."
else
  fout "prijsboek-API" "onverwacht antwoord"
  echo "$body" | head -5
  exit 1
fi
