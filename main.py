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

def create_post():
    try:
        # 1. Gemini İçerik Üretimi
        print("Gemini içerik üretiyor...")
        prompt = (
            "Write a short, professional Instagram caption in English for Veritas Q-AI. "
            "Focus: AI-driven legal precision. Include #VeritasQAI #LegalTech #Innovation."
        )
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        content = response.text

        # 2. GÖRSEL SEÇİMİ (Şarap şişesi falan gelmemesi için kısıtlandı)
        # Sadece ciddi ve kurumsal kelimeler bıraktım
        safe_keywords = ["law-office", "gavel", "justice-scale", "cyber-security", "modern-lawyer"]
        selected = random.choice(safe_keywords)
        random_seed = random.randint(1, 5000)
        
        # Instagram'ın reddetmemesi için kaynak dosyaya doğrudan giden yapı
        image_url = f"https://loremflickr.com/1080/1080/{selected}?lock={random_seed}"

        print(f"Konsept: {selected} | Görsel URL: {image_url}")

        # 3. Instagram Medya Hazırlama
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {
            'image_url': image_url, 
            'caption': content, 
            'access_token': insta_token
        }
        
        r = requests.post(post_url, data=payload)
        
        if r.status_code != 200:
            print(f"Yükleme Hatası: {r.text}")
            return

        creation_id = r.json()['id']
        print(f"Medya işleniyor (ID: {creation_id})...")
        
        # 30 saniye bekleyelim, garanti olsun
        time.sleep(30) 
        
        # 4. Yayınlama
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        publish_res = requests.post(publish_url, data={'creation_id': creation_id, 'access_token': insta_token})
        
        if publish_res.status_code == 200:
            print("BAŞARILI! Profesyonel görsel paylaşıldı.")
        else:
            print(f"Yayınlama Hatası: {publish_res.text}")

    except Exception as e:
        print(f"Hata: {e}")

if __name__ == "__main__":
    create_post()
    
