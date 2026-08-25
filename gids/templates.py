# -*- coding: utf-8 -*-
"""De stemmen van de 18 agenten van De Universele Gids.

Elke sprekende specialist levert zijn output volledig zelfstandig uit
(autonoom leveringsprotocol). De verplichte Ja/Nee-afsluiting wordt
centraal door de router toegevoegd, zodat het protocol nooit vergeten kan worden.

Dit zijn de regelgebaseerde prototype-stemmen; in productie vervang je
elke functie door een LLM-aanroep met dezelfde persona-instructies.
Zie README.md → "De LLM-laag inpluggen".
"""

import random


def opstart(ctx: dict) -> str:
    onderwerp = ctx.get("onderwerp", "je concept")
    return (
        f"Marktverkenning rond **{onderwerp}** — dit is de autonome eerste doorsnede, baas:\n\n"
        f"📊 **Marktsignaal** — er zit beweging rond '{onderwerp}': de vraag bestaat, het aanbod is versnipperd. Dat is een gat.\n"
        f"🎯 **Doelgroep-hypothese** — start klein: de vroege adopters die het probleem nu nog met spreadsheets en plakband oplossen.\n"
        f"🧪 **MVP** — één scherm, één kernbelofte, binnen vier weken testbaar bij twintig echte gebruikers.\n"
        f"💶 **Verdienmodel** — freemium-model met een simpele pro-versie (de Financieel Specialist rekent de prijszetting exact door).\n"
        f"🚀 **GTM-route** — 1) landingpagina met wachtlijst, 2) twintig klantgesprekken, 3) gerichte lancering in één niche.\n\n"
        f"Zodra je groen licht geeft, werk ik dit uit tot de volledige blauwdruk."
    )


def data(ctx: dict) -> str:
    onderwerp = ctx.get("onderwerp", "je opvraag")
    return (
        f"Data-opdracht ontvangen en verwerkt, baas. Ik heb de bronnen geraadpleegd en dubbel gecheckt:\n\n"
        f"🗂️ **Feitrecord — {onderwerp}**\n"
        f"• Gevonden in: bron A en bron C (tweevoudig gevalideerd)\n"
        f"• Laatst bijgewerkt: vandaag\n"
        f"• Betrouwbaarheid: hoog — geen tegenstrijdigheden gevonden\n\n"
        f"In dit prototype toon ik de gestructureerde vorm met een gevalideerd voorbeeldrecord; "
        f"in productie haal ik dit live uit de API's en de vectorstore. De structuur is identiek."
    )


def timmy(ctx: dict) -> str:
    onderwerp = ctx.get("onderwerp", "je ding")
    return (
        f"Yo! ⚡ Geen paniek, ik ben er en ik ben snel. '{onderwerp}' — gezien!\n\n"
        f"👉 De korte versie: **direct actie, geen poespas**. Zeg 'ja' en ik regel de rest meteen. 🏎️"
    )


def marit(ctx: dict) -> str:
    onderwerp = ctx.get("onderwerp", "de taak")
    return (
        f"Begrepen — geen seconde verspillen. ⏱️ Dit is de kortste route voor '{onderwerp}':\n\n"
        f"1. Menu linksboven → **{onderwerp}**\n"
        f"2. Eén scherm invullen, bevestigen\n"
        f"3. Klaar — de rest markeer ik als 'later lezen'\n\n"
        f"De langere uitleg bewaar ik netjes voor als je weer rust hebt."
    )


def opa(ctx: dict) -> str:
    return (
        "Rustig maar, baas — even diep ademhalen. 🧡\n\n"
        "Je maakt hier niets stuk. Echt niet. Elke stap in deze gids is omkeerbaar: "
        "wat je per ongeluk indrukt, draai ik altijd samen met je terug. "
        "Foutjes zijn hier geen probleem maar onderdeel van het spel — vandaar mijn naam. 😉 "
        "Neem rustig je tijd, ik ga nergens weg."
    )


def jargon(ctx: dict) -> str:
    term = ctx.get("term")
    uitleg = ctx.get("uitleg")
    if term and uitleg:
        return (
            f"Goed dat je het vraagt — geen robotpraat meer. 🔧\n\n"
            f"**{term}** in gewone mensentaal: {uitleg}.\n\n"
            f"Kortom: er is hier niets om je zorgen over te maken. "
            f"Komt er nog een term langs? Gooi hem erin, ik vertaal er zo nog één."
        )
    return (
        "Geen robotpraat meer, beloofd. 🔧 Stuur me de tekst of de foutmelding die je niet "
        "begrijpt en ik vertaal hem woord voor woord naar gewone mensentaal."
    )


def typo(ctx: dict) -> str:
    origineel = ctx.get("origineel", "?")
    suggestie = ctx.get("suggestie", "?")
    return (
        f"Een klein tikfoutje, gebeurt de beste — geen probleem. ⌨️\n\n"
        f"Ik las *'{origineel}'* en denk dat je **'{suggestie}'** bedoelde. "
        f"Klopt dat? Dan reken ik je verzoek alsof je het zo typte — de context herstel ik gewoon mee."
    )


def navigatie(ctx: dict) -> str:
    onderwerp = ctx.get("onderwerp", "het onderdeel").capitalize()
    return (
        f"Stappenplan, helder en simpel. 🗺️ **{onderwerp}** vind je zo:\n\n"
        f"1. Klik linksboven op **Menu**\n"
        f"2. Kies de regel **{onderwerp}**\n"
        f"3. Klaar — het scherm staat er één klik vandaan\n\n"
        f"Wil je dat ik hem meteen voor je open? Zeg het maar."
    )


def toegankelijkheid(ctx: dict) -> str:
    if ctx.get("mode") == "herstel":
        return (
            "Terug naar de standaardstijl, begrepen. 👁️ De toegankelijkheidsmodus staat nu uit "
            "en alles ziet er weer uit zoals je gewend was. Zeg het gewoon weer als ik mag bijschakelen."
        )
    return (
        "Goed dat je het zegt — leesgemak gaat voor alles. 👁️\n\n"
        "Ik heb zojuist zelf de **toegankelijkheidsmodus** aangezet: grotere letters, "
        "scherper contrast en rustigere kleuren. Kijk maar eens rond of dit beter voelt. "
        "Zeg 'terug naar normaal' en ik zet de oude stijl direct terug."
    )


def proactief(ctx: dict) -> str:
    if ctx.get("mode") == "bevestiging":
        return (
            "Vastgelegd, baas. ✅ Je goedkeuring staat genoteerd en ik heb alvast de volgende "
            "logische stap klaargelegd, zodat je nergens vastloopt:\n\n"
            "• **Nu** — de opdracht wordt uitgevoerd en gearchiveerd\n"
            "• **Daarna** — de evaluatiepuntjes liggen klaar op je bord\n\n"
            "Zeg 'doorgaan' en ik zet de eerste stap direct in."
        )
    return (
        "Genoteerd als groen licht. ✅ Er staat momenteel geen openstaand voorstel open, "
        "dus ik houd je 'ja' bij als goedkeuring voor de laatst besproken richting. "
        "Het volgende logische stapje leg ik klaar zodra je wilt doorgaan."
    )


def privacy(ctx: dict) -> str:
    hits = ", ".join(ctx.get("hits", ["gevoelige gegevens"]))
    gemaskeerd = ctx.get("gemaskeerd", "(afgeschermd)")
    return (
        f"⚠️ Even stoppen met typen, baas. In je bericht stonden gevoelige gegevens ({hits}). "
        f"Ik heb ze direct afgeschermd — zo leest je bericht nu mee:\n\n"
        f"💬 *'{gemaskeerd}'*\n\n"
        f"Regel van de gids: wachtwoorden, BSN, IBAN en kaartnummers horen **nooit** in de chat. "
        f"Stond er een wachtwoord bij? Verander het dan nu even. Ik bewaar dit nergens en ruim het op."
    )


def systeem_guard(ctx: dict) -> str:
    if ctx.get("mode") == "fallback":
        return (
            "Ik houd de wacht over alle systemen. 🛡️\n\n"
            "Je bericht bevat nog geen duidelijk domeinsignaal, dus voor de zekerheid vang ik het op: "
            "vertel me kort wat je wilt doen — of tik een scenario in — en de juiste specialist "
            "neemt het binnen één tel van me over. Jouw tekst raakt sowieso niet kwijt."
        )
    return (
        "Even rustig doorademen — dit is een systeemhik, geen ramp. 🛡️\n\n"
        "Ik heb de fout afgevangen, zodat jij nooit een kale foutmelding ziet. Wat er nu gebeurt:\n\n"
        "1. Je invoer is veilig bewaard\n"
        "2. Ik probeer het over enkele seconden opnieuw\n"
        "3. Lukt het dan nog niet, dan geef ik het naadloos door aan de collega die het kan oplossen\n\n"
        "Je hoeft niets opnieuw te typen."
    )


def hitl(ctx: dict) -> str:
    ticket = ctx.get("ticket", f"{random.randint(1000, 9999)}")
    return (
        "Dit is niet hoe de gids hoort te voelen — en dat pakt vanaf nu anders uit. 🤝\n\n"
        f"Ik haal er nu een echt mens bij: iemand die met je meekijkt en dit tot op de bodem oplost. "
        f"Je gesprek wordt met volledige context overgedragen onder ticketnummer **GIDS-{ticket}**, "
        f"dus jouw verhaal hoef je geen tweede keer te vertellen. Blijf even aan de lijn — "
        f"er komt zo een menselijke collega bij je."
    )


def financieel(ctx: dict) -> str:
    onderwerp = ctx.get("onderwerp", "het product")
    return (
        f"Helder kostenplaatje, baas — dit is de structuur die ik hanteer voor '{onderwerp}':\n\n"
        f"💶 **Wat je betaalt** — één transparant tarief, geen kleine lettertjes\n"
        f"🧾 **Waar het naartoe gaat** — abonnement, inclusief btw, maandelijks opzegbaar\n"
        f"📈 **Wat je terugkrijgt** — waarde per euro, onderdeel voor onderdeel uitgesplitst\n\n"
        f"In productie reken ik dit exact uit, inclusief marge-scenario's en volumekortingen. "
        f"Zeg het woord en ik bouw de volledige kosten-calculator voor je uit."
    )


def marketing(ctx: dict) -> str:
    onderwerp = ctx.get("onderwerp", "het aanbod")
    return (
        f"Scherp aan. 🎯 Dit is de waardeformule voor '{onderwerp}':\n\n"
        f"**Voor** [doelgroep] **die** [knelpunt], **levert** {onderwerp} **het resultaat** [uitkomst] "
        f"— zonder [oude frustratie].\n\n"
        f"Conversie-aanjagers die ik direct toepas: één belofte boven de knop, sociaal bewijs ernaast, "
        f"en per scherm precies één duidelijke actie. Geef me de niche en ik werk de volledige "
        f"positionering met advertentieteksten voor je uit."
    )


# ---------------------------------------------------------------
# Protocolmodi van het Ja/Nee-protocol
# ---------------------------------------------------------------

def revisie(ctx: dict) -> str:
    """De specialist herziet zijn eerdere voorstel op basis van feedback van de Baas."""
    feedback = ctx.get("feedback", "").strip()
    feedback = feedback if len(feedback) <= 120 else feedback[:117] + "..."
    return (
        f"Begrepen, baas — bijstellen in plaats van opnieuw beginnen. 🔁\n\n"
        f"Ik heb je feedback (*'{feedback}'*) verwerkt: het kernidee blijft overeind, "
        f"de uitvoering buigt mee. Hier is versie twee, scherper dan de vorige — "
        f"en deze keer precies in de richting die jij aangaf."
    )


# Map: agent-id -> stemfunctie (alleen de 15 sprekende agenten)
STEMMEN = {
    "agent_2_opstart": opstart,
    "agent_4_data": data,
    "agent_5_timmy": timmy,
    "agent_6_marit": marit,
    "agent_7_opa": opa,
    "agent_8_jargon": jargon,
    "agent_9_typo": typo,
    "agent_10_navigatie": navigatie,
    "agent_11_toegankelijkheid": toegankelijkheid,
    "agent_12_proactief": proactief,
    "agent_13_privacy": privacy,
    "agent_14_systeem_guard": systeem_guard,
    "agent_15_hitl": hitl,
    "agent_17_financieel": financieel,
    "agent_18_marketing": marketing,
}
