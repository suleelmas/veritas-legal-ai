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

# INSTAGRAM'IN ASLA REDDEDEMEYECEĞİ STATİK DOSYA LİNKLERİ
# Bu linklerin her biri doğrudan bir .jpg dosyasına gider (Redirect içermez)
safe_images = [
    "https://images.pexels.com/photos/5668473/pexels-photo-5668473.jpeg", # Adalet Terazisi
    "https://images.pexels.com/photos/6077368/pexels-photo-6077368.jpeg", # Tokmak ve Kitap
    "https://images.pexels.com/photos/3771097/pexels-photo-3771097.jpeg", # Modern Ofis
    "https://images.pexels.com/photos/8112129/pexels-photo-8112129.jpeg", # Hukuk Dosyaları
    "https://images.pexels.com/photos/4427545/pexels-photo-4427545.jpeg", # İmza ve Kalem
    "https://images.pexels.com/photos/159832/way-right-of-way-right-justice-159832.jpeg", # Klasik Adliye
    "https://images.pexels.com/photos/6077326/pexels-photo-6077326.jpeg", # Tokmak (Yakın Çekim)
    "https://images.pexels.com/photos/3771120/pexels-photo-3771120.jpeg"  # Teknoloji ve Hukuk
]

def create_post():
    try:
        # 1. Gemini İçerik Üretimi
        print("Gemini içerik üretiyor...")
        prompt = (
            "Write a short, professional Instagram caption for Veritas Q-AI about AI in law. "
            "Focus on efficiency. Include #VeritasQAI #LegalTech #AI."
        )
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        content = response.text

        # 2. Rastgele Statik Görsel Seçimi
        image_url = random.choice(safe_images)
        print(f"Görsel seçildi: {image_url}")

        # 3. Instagram API İşlemi
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {
            'image_url': image_url, 
            'caption': content, 
            'access_token': insta_token
        }
        
        r = requests.post(post_url, data=payload)
        
        if r.status_code != 200:
            print(f"Instagram hala reddediyor! Detay: {r.text}")
            return

        creation_id = r.json()['id']
        print(f"Medya yüklendi (ID: {creation_id}). 30 saniye bekleniyor...")
        time.sleep(30) 
        
        # 4. Yayına Alma
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        publish_res = requests.post(publish_url, data={'creation_id': creation_id, 'access_token': insta_token})
        
        if publish_res.status_code == 200:
            print(f"BAŞARILI! Sonunda 9004 hatasını yendik. Paylaşılan görsel: {image_url}")
        else:
            print(f"Yayınlama hatası: {publish_res.text}")

    except Exception as e:
        print(f"Hata: {e}")

if __name__ == "__main__":
    create_post()
    
