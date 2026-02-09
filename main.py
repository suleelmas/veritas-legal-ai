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
        # 1. Gemini İçerik Üretimi
        prompt = (
            "Write a short, professional Instagram caption in English for Veritas Q-AI. "
            "Focus on AI in law. Output ONLY the caption and these 5 hashtags: "
            "#VeritasQAI #LegalTech #AIforLawyers #Innovation #LawTech."
        )
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        content = response.text

        # 2. Instagram'ın İstediği En Saf Link Yapısı
        # Parametreleri temizledik, sadece en gerekli olanları bıraktık.
        law_photos = [
            "1589829545856-d10d557cf95f", "1505664194779-8beaceb93744", 
            "1450101499163-c8848c66ca85", "1473186578172-c141e6798ee4",
            "1521791136364-79c0640a52c1", "1507679799987-c73779587ccf",
            "1453722751126-97e51e4863e6", "1593113598332-cd288d649433"
        ]
        
        selected_id = random.choice(law_photos)
        
        # Instagram bazen '?' işaretinden sonrasını sevmez. 
        # Bu yüzden en sade JPG çıktısını zorluyoruz.
        image_url = f"https://images.unsplash.com/photo-{selected_id}?ixlib=rb-4.0.3&auto=format&fit=crop&w=1080&q=80"

        # 3. Instagram API İşlemleri
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {
            'image_url': image_url, 
            'caption': content, 
            'access_token': insta_token
        }
        
        print(f"Deneme yapılıyor: {image_url}")
        r = requests.post(post_url, data=payload)
        
        # EĞER HALA HATA ALIRSAK (B PLANI): 
        # Linki bir kez daha sadeleştirip deneyeceğiz.
        if r.status_code != 200:
            print("İlk deneme başarısız, B planı uygulanıyor...")
            image_url_simple = f"https://images.unsplash.com/photo-{selected_id}.jpg"
            payload['image_url'] = image_url_simple
            r = requests.post(post_url, data=payload)

        if r.status_code != 200:
            print(f"Instagram Kesin Hata: {r.text}")
            return

        creation_id = r.json()['id']
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        publish_res = requests.post(publish_url, data={'creation_id': creation_id, 'access_token': insta_token})
        
        if publish_res.status_code == 200:
            print("BAŞARILI! Veritas Q-AI postu yayında.")
        else:
            print(f"Yayınlama hatası: {publish_res.text}")

    except Exception as e:
        print(f"Hata: {e}")

if __name__ == "__main__":
    create_post()
    
