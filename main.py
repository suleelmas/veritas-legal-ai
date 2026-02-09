import os
import random
from google import genai
import requests

gemini_key = os.getenv("GEMINI_API_KEY")
insta_token = os.getenv("INSTA_TOKEN")
insta_id = os.getenv("INSTA_ACCOUNT_ID")

client = genai.Client(api_key=gemini_key)

def create_post():
    try:
        # 1. Gemini ile İçerik Üretimi
        prompt = (
            "Write a short, professional Instagram caption in English for Veritas Q-AI. "
            "Focus: AI-powered legal analysis. "
            "Output ONLY the caption and these 5 hashtags: #VeritasQAI #LegalTech #AIforLawyers #Innovation #LawTech."
        )
        
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        content = response.text

        # 2. HER GÜN FARKLI VE GARANTİ GÖRSEL
        # Instagram'ın hata vermemesi için doğrudan fotoğraf sunucusunu (images.unsplash.com) kullanıyoruz.
        # Aşağıdaki listeden her gün rastgele bir hukuk fotoğrafı seçilecek.
        photo_ids = [
            "photo-1589829545856-d10d557cf95f", # Adalet heykeli
            "photo-1505664194779-8beaceb93744", # Hukuk kitapları
            "photo-1450101499163-c8848c66ca85", # İmza/Kalem
            "photo-1473186578172-c141e6798ee4", # Gavel/Tokmak
            "photo-1521791136364-79c0640a52c1", # El sıkışma/Anlaşma
            "photo-1507679799987-c73779587ccf"  # Ofis/Teknoloji
        ]
        selected_photo = random.choice(photo_ids)
        image_url = f"https://images.unsplash.com/photo-{selected_photo}?w=1080&q=80&fm=jpg&crop=entropy&cs=tinysrgb"
        
        # 3. Instagram Paylaşım Adımları
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {'image_url': image_url, 'caption': content, 'access_token': insta_token}
        
        print(f"Görsel hazırlanıyor: {image_url}")
        r = requests.post(post_url, data=payload)
        
        if r.status_code != 200:
            print(f"Instagram Hatası: {r.text}")
            return

        creation_id = r.json()['id']
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        requests.post(publish_url, data={'creation_id': creation_id, 'access_token': insta_token})
        
        print("Veritas Q-AI postu farklı bir hukuk görseliyle başarıyla paylaşıldı!")

    except Exception as e:
        print(f"Beklenmedik bir hata oluştu: {e}")

if __name__ == "__main__":
    create_post()
    
