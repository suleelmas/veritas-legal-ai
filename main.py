import os
import random
from google import genai
import requests

# GitHub Secrets
gemini_key = os.getenv("GEMINI_API_KEY")
insta_token = os.getenv("INSTA_TOKEN")
insta_id = os.getenv("INSTA_ACCOUNT_ID")

client = genai.Client(api_key=gemini_key)

def create_post():
    try:
        # 1. Gemini ile Metin Üretimi (Metin zekası sorunsuz çalışıyor)
        print("Gemini içerik üretiyor...")
        prompt = (
            "Write a short, professional Instagram caption in English for Veritas Q-AI. "
            "Focus on AI-powered legal document analysis. "
            "Include 5 hashtags like #VeritasQAI #LegalAI #LegalTech."
        )
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        content = response.text

        # 2. Instagram'ın Kabul Ettiği %100 Statik Görsel Havuzu
        # Bu ID'ler doğrudan Unsplash'in ana sunucusundan gelir
        photo_pool = [
            "1589829545856-d10d557cf95f", "1505664194779-8beaceb93744",
            "1450101499163-c8848c66ca85", "1473186578172-c141e6798ee4",
            "1521791136364-79c0640a52c1", "1507679799987-c73779587ccf",
            "1453722751126-97e51e4863e6", "1593113598332-cd288d649433",
            "1575505506539-8b10420a4c82", "1521790821163-f30007821e8c",
            "1504384308000-525207b6f247", "1486312338239-5e58a2f5915a",
            "1553484771-047a44efe27b", "1528732163351-512c8b05988d"
        ]
        
        selected_id = random.choice(photo_pool)
        # Link yapısını Instagram'ın en sevdiği statik formata getirdik
        image_url = f"https://images.unsplash.com/photo-{selected_id}?w=1080&q=80&fm=jpg"

        print(f"Görsel Seçildi: {image_url}")

        # 3. Instagram Paylaşımı
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {
            'image_url': image_url, 
            'caption': content, 
            'access_token': insta_token
        }
        
        r = requests.post(post_url, data=payload)
        
        if r.status_code != 200:
            print(f"Instagram Hatası: {r.text}")
            return

        creation_id = r.json()['id']
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        publish_res = requests.post(publish_url, data={'creation_id': creation_id, 'access_token': insta_token})
        
        if publish_res.status_code == 200:
            print("BAŞARILI! Veritas Q-AI profesyonel bir görselle paylaşıldı.")
        else:
            print(f"Yayınlama hatası: {publish_res.text}")

    except Exception as e:
        print(f"Hata oluştu: {e}")

if __name__ == "__main__":
    create_post()
    
