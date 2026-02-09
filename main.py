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

        # 2. %100 ÇALIŞAN RASTGELE GÖRSEL HAVUZU
        # Instagram'ın hata vermeyeceği doğrudan fotoğraf ID'leri
        law_photos = [
            "1589829545856-d10d557cf95f", "1505664194779-8beaceb93744", 
            "1450101499163-c8848c66ca85", "1473186578172-c141e6798ee4",
            "1521791136364-79c0640a52c1", "1507679799987-c73779587ccf",
            "1453722751126-97e51e4863e6", "1593113598332-cd288d649433",
            "1528732163351-512c8b05988d", "1427751369412-14197394206c",
            "1553484771-047a44efe27b", "1486312338239-5e58a2f5915a",
            "1504384308000-525207b6f247", "1497366216401-20e7af5669e2"
        ]
        
        selected_id = random.choice(law_photos)
        # Doğrudan fotoğraf dosyasına giden temiz URL
        image_url = f"https://images.unsplash.com/photo-{selected_id}?w=1080&q=80&fm=jpg"

        # 3. Instagram API Adımları
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {'image_url': image_url, 'caption': content, 'access_token': insta_token}
        
        print(f"Seçilen görsel gönderiliyor: {image_url}")
        r = requests.post(post_url, data=payload)
        
        if r.status_code != 200:
            print(f"Instagram Hatası: {r.text}")
            return

        creation_id = r.json()['id']
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        publish_res = requests.post(publish_url, data={'creation_id': creation_id, 'access_token': insta_token})
        
        if publish_res.status_code == 200:
            print("Veritas Q-AI postu yeni bir görselle paylaşıldı!")
        else:
            print(f"Yayınlama hatası: {publish_res.text}")

    except Exception as e:
        print(f"Hata: {e}")

if __name__ == "__main__":
    create_post()
    
