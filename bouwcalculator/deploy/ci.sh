#!/usr/bin/env bash
# ==========================================================
# Zet de CI-deploy van de Bouwprijscalculator op (1 commando).
#
#   bash bouwcalculator/deploy/ci.sh
#
# Doet vier dingen:
#   1. controleert of je ingelogd bent bij GitHub
#   2. vraagt om het Cloudflare API-token en zet het als repo-secret
#   3. kopieert de workflow naar .github/workflows/
#   4. commit en pusht, zodat GitHub Actions de app publiceert
#
# Het token wordt nooit in de repo of in de log opgeslagen: alleen als
# versleuteld secret in GitHub. Maak het aan op:
#   https://dash.cloudflare.com/profile/api-tokens
# met rechten "Edit Cloudflare Workers" en account = jouw account.
# ==========================================================
set -euo pipefail

echo "==> 1/4  GitHub-login controleren"
if ! gh auth status >/dev/null 2>&1; then
  echo "    Je bent niet ingelogd bij GitHub. Run eerst:  gh auth login" >&2
  exit 1
fi
gh auth status 2>&1 | head -3 | sed 's/^/    /'

echo
echo "==> 2/4  Cloudflare API-token opslaan als secret"
if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "    Token gevonden in de omgeving — gebruik die."
  echo "$CLOUDFLARE_API_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN
else
  echo "    Nog nodig? Maak een token aan op:"
  echo "      https://dash.cloudflare.com/profile/api-tokens"
  echo "    Kies 'Edit Cloudflare Workers' en zet Account Resources op jouw account."
  echo "    Plak het token hieronder (er wordt niets weergegeven):"
  gh secret set CLOUDFLARE_API_TOKEN
fi
echo "    Secret opgeslagen."

echo
echo "==> 3/4  Workflow plaatsen"
mkdir -p .github/workflows
cp bouwcalculator/deploy/deploy-worker.yml .github/workflows/deploy-worker.yml
echo "    .github/workflows/deploy-worker.yml geplaatst."

echo
echo "==> 4/4  Committen en pushen"
git add .github/workflows
git commit -m "ci: deploy-worker"
git push

echo
echo "Klaar. GitHub Actions bouwt nu de Worker (tests eerst, dan deploy)."
echo "Volg de build met:   gh run watch"
echo "De app komt live op: https://patient-sun-c959.guypeers2.workers.dev"
