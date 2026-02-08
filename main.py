import os
import google.generativeai as genai
import requests
import json

# Secrets'tan bilgileri çekiyoruz
gemini_key = os.getenv("GEMINI_API_KEY")
insta_token = os.getenv("INSTA_TOKEN")
insta_id = os.getenv("INSTA_ACCOUNT_ID")

# Gemini Kurulumu
genai.configure(api_key=gemini_key)
model = genai.GenerativeModel('gemini-1.5-flash')

def create_post():
    try:
        # İçerik Üretme
        prompt = "Create a professional Instagram post about Veritas Q-AI, an AI-powered legal analysis platform. Make it engaging for lawyers. Language: English."
        response = model.generate_content(prompt)
        content = response.text

        # Daha güvenilir bir görsel linki (Unsplash)
        image_url = "https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=1080"
        
        # 1. Adım: Medya Kabı Oluşturma
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {
            'image_url': image_url, 
            'caption': content, 
            'access_token': insta_token
        }
        
        print("Instagram'a veri gönderiliyor...")
        r = requests.post(post_url, data=payload)
        
        if r.status_code != 200:
            print(f"Instagram Hatası Detayı: {r.text}") # Hatayı burada göreceğiz
            return

        # 2. Adım: Medyayı Yayınlama
        creation_id = r.json()['id']
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        publish_payload = {
            'creation_id': creation_id, 
            'access_token': insta_token
        }
        
        pub_r = requests.post(publish_url, data=publish_payload)
        print(f"Yayınlama Durumu: {pub_r.text}")
        print("Veritas Q-AI paylaşımı başarıyla yapıldı!")

    except Exception as e:
        print(f"Kod hatası: {e}")

if __name__ == "__main__":
    create_post()
    
