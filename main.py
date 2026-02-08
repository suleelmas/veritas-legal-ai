import os
from google import genai
import requests

# Secrets'tan bilgileri çekiyoruz
gemini_key = os.getenv("GEMINI_API_KEY")
insta_token = os.getenv("INSTA_TOKEN")
insta_id = os.getenv("INSTA_ACCOUNT_ID")

# Yeni Gemini Kurulumu
client = genai.Client(api_key=gemini_key)

def create_post():
    try:
        # İçerik Üretme (Model adını 'gemini-2.0-flash' veya 'gemini-1.5-flash' yapabilirsin)
        prompt = "Create a professional Instagram post about Veritas Q-AI, an AI-powered legal analysis platform. Mention its speed and accuracy for lawyers. Language: English."
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        content = response.text

        # Güvenilir görsel
        image_url = "https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=1080"
        
        # Instagram'a veri gönderiliyor
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {
            'image_url': image_url, 
            'caption': content, 
            'access_token': insta_token
        }
        
        print("Instagram'a gönderiliyor...")
        r = requests.post(post_url, data=payload)
        
        if r.status_code != 200:
            print(f"Hata Detayı: {r.text}")
            return

        # Medyayı Yayınlama
        creation_id = r.json()['id']
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        publish_payload = {
            'creation_id': creation_id, 
            'access_token': insta_token
        }
        
        pub_r = requests.post(publish_url, data=publish_payload)
        print("Veritas Q-AI paylaşımı başarıyla yapıldı!")

    except Exception as e:
        print(f"Kod hatası: {e}")

if __name__ == "__main__":
    create_post()
