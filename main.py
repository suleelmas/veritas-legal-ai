import os
from google import genai
import requests

# GitHub Secrets'tan güvenli şekilde çekiyoruz
gemini_key = os.getenv("GEMINI_API_KEY")
insta_token = os.getenv("INSTA_TOKEN")
insta_id = os.getenv("INSTA_ACCOUNT_ID")

client = genai.Client(api_key=gemini_key)

def create_post():
    try:
        # 1. Gemini ile Hukuk Analizi Üretme
        prompt = "Create a professional Instagram post about Veritas Q-AI, an AI-powered legal analysis platform. Mention its speed and accuracy for lawyers. Include legal hashtags. Language: English."
        response = client.models.generate_content(
            model="gemini-2.0-flash", 
            contents=prompt
        )
        content = response.text

        # 2. Instagram Paylaşımı (Profesyonel Görsel)
        image_url = "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1080"
        
        # Medya Kabı
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {'image_url': image_url, 'caption': content, 'access_token': insta_token}
        
        r = requests.post(post_url, data=payload)
        if r.status_code != 200:
            print(f"Hata Detayı: {r.text}")
            return

        # Yayınlama
        creation_id = r.json()['id']
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        requests.post(publish_url, data={'creation_id': creation_id, 'access_token': insta_token})
        print("Veritas Q-AI paylaşımı başarıyla yapıldı!")

    except Exception as e:
        print(f"Beklenmeyen Hata: {e}")

if __name__ == "__main__":
    create_post()
    
