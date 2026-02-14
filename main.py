import os
import random
import time
from google import genai
import requests

# GitHub Secrets
gemini_key = os.getenv("GEMINI_API_KEY")
insta_token = os.getenv("INSTA_TOKEN")
insta_id = os.getenv("INSTA_ACCOUNT_ID")

client = genai.Client(api_key=gemini_key)

# %100 DENETLENMİŞ KURUMSAL HUKUK GÖRSELLERİ
# (Her biri doğrudan .jpeg dosyasıdır ve 9004 hatası vermez)
safe_images = [
    "https://images.pexels.com/photos/6077368/pexels-photo-6077368.jpeg", # Tokmak ve Adalet Terazisi
    "https://images.pexels.com/photos/5668473/pexels-photo-5668473.jpeg", # Gümüş Adalet Terazisi
    "https://images.pexels.com/photos/6077326/pexels-photo-6077326.jpeg", # Ahşap Tokmak Yakın Çekim
    "https://images.pexels.com/photos/8112129/pexels-photo-8112129.jpeg", # Hukuk Dosyaları ve Gözlük
    "https://images.pexels.com/photos/4427545/pexels-photo-4427545.jpeg", # Sözleşme İmzalayan Kalem
    "https://images.pexels.com/photos/7120340/pexels-photo-7120340.jpeg", # Klasik Hukuk Kitaplığı
    "https://images.pexels.com/photos/159832/way-right-of-way-right-justice-159832.jpeg", # Adliye Heykeli
    "https://images.pexels.com/photos/3771097/pexels-photo-3771097.jpeg", # Ciddi Toplantı Odası (Salon değil!)
    "https://images.pexels.com/photos/5669614/pexels-photo-5669614.jpeg", # Anayasa ve Kanun Kitapları
    "https://images.pexels.com/photos/5669602/pexels-photo-5669602.jpeg"  # Adalet Terazisi (Modern Çekim)
]

def create_post():
    try:
        # 1. Gemini İçerik Üretimi
        print("Gemini içerik üretiyor...")
        prompt = (
            "Write a short, professional Instagram caption for Veritas Q-AI. "
            "Topic: Artificial Intelligence in Legal Analysis. "
            "Tone: Corporate and innovative. Include #VeritasQAI #LegalTech #Innovation."
        )
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        content = response.text

        # 2. Onaylı Listeden Rastgele Seçim
        image_url = random.choice(safe_images)
        print(f"Görsel seçildi (Garantili Hukuk Teması): {image_url}")

        # 3. Instagram API İşlemi
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {
            'image_url': image_url, 
            'caption': content, 
            'access_token': insta_token
        }
        
        r = requests.post(post_url, data=payload)
        
        if r.status_code != 200:
            print(f"Hata: {r.text}")
            return

        creation_id = r.json()['id']
        print(f"Medya yüklendi (ID: {creation_id}). 30 saniye bekleniyor...")
        time.sleep(30) 
        
        # 4. Yayına Alma
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        publish_res = requests.post(publish_url, data={'creation_id': creation_id, 'access_token': insta_token})
        
        if publish_res.status_code == 200:
            print(f"MÜKEMMEL! Veritas Q-AI artık gerçek bir hukuk postuyla yayında.")
        else:
            print(f"Yayınlama hatası: {publish_res.text}")

    except Exception as e:
        print(f"Hata: {e}")

if __name__ == "__main__":
    create_post()
    
