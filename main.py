import os
from google import genai
import requests

# GitHub Secrets'tan bilgiler çekiliyor
gemini_key = os.getenv("GEMINI_API_KEY")
insta_token = os.getenv("INSTA_TOKEN")
insta_id = os.getenv("INSTA_ACCOUNT_ID")

client = genai.Client(api_key=gemini_key)

def create_post():
    try:
        # Gemini Komutu: Daha katı kurallar ekledik ki hashtagleri unutmasın
        prompt = (
            "Write a high-quality, professional Instagram caption for Veritas Q-AI. "
            "Focus: AI-powered legal document analysis and speed for lawyers. "
            "Language: English only. "
            "Output format: Start with a catchy headline, followed by 2 sentences of explanation. "
            "At the end, ALWAYS include exactly these 5 hashtags: #VeritasQAI #LegalTech #AIforLawyers #LegalInnovation #FutureOfLaw. "
            "Do not include any other text, labels, or choices."
        )
        
        response = client.models.generate_content(
            model="gemini-2.0-flash", 
            contents=prompt
        )
        content = response.text

        # Görsel Linki (Hukuk Temalı)
        image_url = "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1080"
        
        # Instagram API İşlemleri
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {'image_url': image_url, 'caption': content, 'access_token': insta_token}
        
        r = requests.post(post_url, data=payload)
        if r.status_code != 200:
            print(f"Hata: {r.text}")
            return

        creation_id = r.json()['id']
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        requests.post(publish_url, data={'creation_id': creation_id, 'access_token': insta_token})
        print("Veritas Q-AI postu 5 hashtag ve İngilizce diliyle başarıyla paylaşıldı!")

    except Exception as e:
        print(f"Hata oluştu: {e}")

if __name__ == "__main__":
    create_post()
    
