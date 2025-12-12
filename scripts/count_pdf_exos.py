import os
import re
import sys
import logging
from io import BytesIO

import requests
from pypdf import PdfReader
from supabase import create_client, Client

"""
Script: scripts/count_pdf_exos.py
But: Remplir automatiquement la colonne exercise_count dans la table Supabase 'exercises' en analysant les PDFs pointés par url_enonce.

Configuration requise:
- SUPABASE_URL: URL de votre projet Supabase (ex: https://xxxxx.supabase.co)
- SUPABASE_KEY: Clé SERVICE_ROLE (autorisations d'écriture). PLACEHOLDER ci-dessous si variable manquante.

Exécution:
- python scripts/count_pdf_exos.py

Prérequis:
- pip install pypdf requests supabase
"""

# --- Configuration Supabase ---
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or "https://VOTRE-PROJET.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "PASTE_VOTRE_SERVICE_ROLE_ICI"

if not SUPABASE_URL or not SUPABASE_KEY or "VOTRE-PROJET" in SUPABASE_URL or "PASTE_VOTRE_SERVICE_ROLE_ICI" in SUPABASE_KEY:
    print("[ERREUR] Variables d'environnement manquantes ou placeholders actifs. \n"
          " - SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL)\n"
          " - SUPABASE_KEY (ou SUPABASE_SERVICE_ROLE_KEY)\n"
          "Veuillez les définir avant d'exécuter le script.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Logging ---
logging.basicConfig(level=logging.INFO, format='%(message)s')
log = logging.getLogger("count_pdf_exos")

# --- Regex pour détecter les exercices ---
# Capture "Exercice 12" avec variations d'accents/majuscules et espaces
EXO_PATTERN = re.compile(r"\b[Ee]xercices?\s*(?:n[oº°]\s*)?(\d+)\b")
# Mot-clé pour détecter la présence de corrigés
CORRECTION_PATTERN = re.compile(r"\b[Cc]orrection\b")


def fetch_pdf_text(url: str) -> str:
    """Télécharge le PDF en mémoire et renvoie son texte complet."""
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        raise RuntimeError(f"Téléchargement PDF échoué: {e}")

    try:
        reader = PdfReader(BytesIO(resp.content))
        texts = []
        for page in reader.pages:
            try:
                texts.append(page.extract_text() or "")
            except Exception:
                # Certaines pages peuvent ne pas s'extraire proprement; on continue
                continue
        return "\n".join(texts)
    except Exception as e:
        raise RuntimeError(f"Lecture PDF échouée: {e}")


def count_exercises_in_text(text: str) -> int:
    """Applique l'algorithme demandé pour estimer le nombre d'exercices."""
    if not text:
        return 0

    # 1) Regex: trouve tous les "Exercice <chiffre>" et prends le maximum
    numbers = []
    for match in EXO_PATTERN.finditer(text):
        try:
            n = int(match.group(1))
            numbers.append(n)
        except Exception:
            continue

    if numbers:
        return max(numbers)

    # 2) Fallback: compte les occurrences de "Exercice"
    exo_word_count = len(re.findall(r"\b[Ee]xercices?\b", text))
    has_correction = bool(CORRECTION_PATTERN.search(text))

    if exo_word_count == 0:
        return 0

    # Divise par 2 si on trouve "Correction" (énoncé + corrigé)
    if has_correction:
        return max(1, exo_word_count // 2)
    return exo_word_count


def process_all_exercises():
    # Récupère id, url_enonce, title, exercise_count
    res = supabase.from("exercises").select("id, url_enonce, title, exercise_count").execute()
    rows = res.data or []

    if not rows:
        log.info("Aucun exercice trouvé dans la table 'exercises'.")
        return

    log.info(f"{len(rows)} exercices à analyser...")

    for row in rows:
        exo_id = row.get("id")
        url = row.get("url_enonce")
        title = row.get("title") or "(sans titre)"
        current_count = row.get("exercise_count")

        if not url or not isinstance(url, str):
            log.info(f"{title} : URL manquante, ignoré.")
            continue

        try:
            text = fetch_pdf_text(url)
        except Exception as e:
            log.info(f"{title} : téléchargement/lecture PDF échouée ({e}).")
            continue

        try:
            new_count = count_exercises_in_text(text)
        except Exception as e:
            log.info(f"{title} : analyse échouée ({e}).")
            continue

        if new_count is None:
            new_count = 0

        if current_count != new_count:
            # Met à jour en base
            try:
                supabase.from("exercises").update({"exercise_count": new_count}).eq("id", exo_id).execute()
                log.info(f"{title} : {new_count} exos trouvés... Update OK (ancien={current_count}).")
            except Exception as e:
                log.info(f"{title} : {new_count} exos trouvés... Update FAILED ({e}).")
        else:
            log.info(f"{title} : {new_count} exos trouvés... Rien à mettre à jour.")


if __name__ == "__main__":
    process_all_exercises()
