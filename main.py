import os
from google import genai
import requests

# Secrets'tan (GitHub Sırları) bilgileri çekiyoruz
gemini_key = os.getenv("GEMINI_API_KEY")
insta_token = os.getenv("INSTA_TOKEN")
insta_id = os.getenv("INSTA_ACCOUNT_ID")

# Yeni nesil Gemini kurulumu
client = genai.Client(api_key=gemini_key)

def create_post():
    try:
        # 1. Gemini ile İçerik Üretme
        # 'models/' ön eki 404 hatasını çözmek için eklendi
        prompt = "Create a professional Instagram post about Veritas Q-AI, an AI-powered legal analysis platform. Mention its speed and accuracy for lawyers. Language: English."
        response = client.models.generate_content(
            model="models/gemini-1.5-flash", 
            contents=prompt
        )
        content = response.text

        # 2. Instagram Paylaşım Ayarları
        # Unsplash üzerinden güvenilir bir görsel linki
        image_url = "https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=1080"
        
        # Medya Kabı Oluşturma (Step 1)
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {
            'image_url': image_url, 
            'caption': content, 
            'access_token': insta_token
        }
        
        print("Instagram sunucularına veri gönderiliyor...")
        r = requests.post(post_url, data=payload)
        
        # Eğer Instagram tarafında hata olursa detayını yazdır
        if r.status_code != 200:
            print(f"Instagram Hata Detayı: {r.text}")
            return

        # Medyayı Yayınlama (Step 2)
        creation_id = r.json()['id']
        publish_url = f"
        
