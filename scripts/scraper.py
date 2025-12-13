import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from urllib.parse import urljoin, unquote, urlsplit, urlunsplit, quote

# --- CONFIGURATION ---
""" 
Charge les identifiants Supabase depuis les variables d'environnement.
Requis:
- SUPABASE_SERVICE_ROLE_KEY (clé secrète service role)
- SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL
"""
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "Variables d'environnement manquantes pour le scraper: SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY"
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- LISTE DES URLS À SCRAPER ---
TARGET_URLS = [
    ("exercices-spé/algèbre", "https://www.xif.fr/public/pr%C3%A9pas-dupuy-de-l%C3%B4me-maths/exercices-sp%C3%A9/alg%C3%A8bre/"),
    ("exercices-spé/analyse", "https://www.xif.fr/public/pr%C3%A9pas-dupuy-de-l%C3%B4me-maths/exercices-sp%C3%A9/analyse/"),
    ("exercices-spé/probabilités", "https://www.xif.fr/public/pr%C3%A9pas-dupuy-de-l%C3%B4me-maths/exercices-sp%C3%A9/probabilit%C3%A9s/"),
    ("exercices-sup/algèbre", "https://www.xif.fr/public/pr%C3%A9pas-dupuy-de-l%C3%B4me-maths/exercices-sup/alg%C3%A8bre/"),
    ("exercices-sup/analyse", "https://www.xif.fr/public/pr%C3%A9pas-dupuy-de-l%C3%B4me-maths/exercices-sup/analyse/"),
    ("exercices-sup/proba", "https://www.xif.fr/public/pr%C3%A9pas-dupuy-de-l%C3%B4me-maths/exercices-sup/probas/"),
    ("exercices-oraux", "https://www.xif.fr/public/pr%C3%A9pas-dupuy-de-l%C3%B4me-maths/exercices-oraux/")
]

def scrape_exercises(chapter_label, url):
    print(f"\n🚀 Connexion à {url} ...")
    try:
        response = requests.get(url)
        response.raise_for_status()
    except Exception as e:
        print(f"❌ Erreur connexion : {e}")
        return []

    soup = BeautifulSoup(response.content, 'html.parser')
    # Détection déterministe basée sur chapter_label, avec fallback URL
    url_decoded = unquote(url).lower()
    label = chapter_label.lower()
    if "spé" in label or "spe" in label:
        niveau = "Spé"
    elif "sup" in label:
        niveau = "Sup"
    elif "oral" in label:
        niveau = "Oral"
    else:
        if "exercices-sup" in url_decoded:
            niveau = "Sup"
        elif "exercices-spé" in url_decoded or "exercices-spe" in url_decoded:
            niveau = "Spé"
        elif "exercices-oraux" in url_decoded:
            niveau = "Oral"
        else:
            niveau = "Autre"

    # Type de chapitre normalisé
    if "algèbre" in label or "algebre" in label or "algèbre" in url_decoded or "algebre" in url_decoded:
        chapitre_type = "Algèbre"
    elif "analyse" in label or "analyse" in url_decoded:
        chapitre_type = "Analyse"
    elif "proba" in label or "probabil" in label or "proba" in url_decoded or "probabil" in url_decoded:
        chapitre_type = "Probas"
    else:
        chapitre_type = "Autre"

    # Nom de chapitre affiché (pour l’UI), cohérent avec filtre
    if niveau == "Oral":
        chapter_name = "Oraux"
    else:
        chapter_name = chapitre_type

    exercises_to_insert = []

    def canonicalize_url(u: str) -> str:
        # Décode d'abord, puis réencode proprement, et uniformise le casing du schéma/host
        try:
            parts = urlsplit(u)
            scheme = parts.scheme.lower()
            netloc = parts.netloc.lower()
            # Décoder puis réencoder le chemin avec quote (accents → percent-encoding uniforme)
            decoded_path = unquote(parts.path)
            encoded_path = quote(decoded_path, safe='/._-')
            # Idem pour query
            decoded_query = unquote(parts.query)
            encoded_query = quote(decoded_query, safe='=&._-')
            canonical = urlunsplit((scheme, netloc, encoded_path.rstrip('/'), encoded_query, ''))
            return canonical
        except Exception:
            return u.rstrip('/')

    for link in soup.find_all('a'):
        href = link.get('href')
        filename = link.get_text().strip()
        if href and href.lower().endswith('.pdf'):
            full_url = canonicalize_url(urljoin(url, href))
            clean_title = filename.replace('.pdf', '').replace('-', ' ').replace('_', ' ').capitalize()
            print(f"📄 Trouvé : {clean_title}")
            data = {
                "title": clean_title,
                "chapter": chapter_name,
                "niveau": niveau,
                "categorie": chapitre_type,
                "url_enonce": full_url,
                "is_premium": False
            }
            exercises_to_insert.append(data)
    return exercises_to_insert

def main():
    all_exercises = []
    for chapter_label, url in TARGET_URLS:
        found = scrape_exercises(chapter_label, url)
        if found:
            print(f"Envoi de {len(found)} exercices vers Supabase...")
            try:
                res = supabase.table("exercises").upsert(found, on_conflict="url_enonce").execute()
                print("✅ Succès :", res)
            except Exception as e:
                print(f"❌ Erreur lors de l'insertion dans Supabase : {e}")
        else:
            print("Aucun exercice PDF trouvé pour cette page.")

if __name__ == "__main__":
    main()
