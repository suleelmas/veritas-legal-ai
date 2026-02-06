import os
import google.generativeai as genai
import requests

# Secrets'tan bilgileri çekiyoruz
gemini_key = os.getenv("GEMINI_API_KEY")
insta_token = os.getenv("INSTA_TOKEN")
insta_id = os.getenv("INSTA_ACCOUNT_ID")

# Gemini Kurulumu
genai.configure(api_key=gemini_key)
model = genai.GenerativeModel('gemini-2.0-flash')

def create_post():
    try:
        # İçerik Üretme
        prompt = "Create a professional Instagram post about Veritas Q-AI. Mention it's an AI-powered legal analysis platform. Include 3 benefits and legal hashtags. Language: English."
        response = model.generate_content(prompt)
        content = response.text

        # Instagram'a Yükleme (Örnek hukuk görseli)
        image_url = "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1000&auto=format&fit=crop"
        
        # 1. Adım: Medya Kabı Oluşturma
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {
            'image_url': image_url, 
            'caption': content, 
            'access_token': insta_token
        }
        r = requests.post(post_url, data=payload)
        r.raise_for_status() # Hata varsa durdur
        
        # 2. Adım: Medyayı Yayınlama
        creation_id = r.json()['id']
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        publish_payload = {
            'creation_id': creation_id, 
            'access_token': insta_token
        }
        requests.post(publish_url, data=publish_payload)
        print("Veritas Q-AI paylaşımı başarıyla yapıldı!")

    except Exception as e:
        print(f"Hata oluştu: {e}")

if __name__ == "__main__":
    create_post()
    
