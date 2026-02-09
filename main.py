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

        # 2. GERÇEK RASTGELE GÖRSEL SEÇİMİ
        # Burada sabit bir ID kullanmıyoruz, doğrudan 'featured' (öne çıkan) havuzundan çekiyoruz.
        random_sig = random.randint(1, 1000000)
        # Instagram'ın reddetmemesi için sonuna .jpg ekleyerek kandırıyoruz
        image_url = f"https://images.unsplash.com/featured/1080x1080/?law,legal,ai,technology&sig={random_sig}.jpg"

        # 3. Instagram API Adımları
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {'image_url': image_url, 'caption': content, 'access_token': insta_token}
        
        print(f"Yeni ve benzersiz görsel gönderiliyor: {image_url}")
        r = requests.post(post_url, data=payload)
        
        if r.status_code != 200:
            print(f"Instagram Hatası: {r.text}")
            return

        creation_id = r.json()['id']
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        publish_res = requests.post(publish_url, data={'creation_id': creation_id, 'access_token': insta_token})
        
        if publish_res.status_code == 200:
            print("İşlem tamam! Şimdi Instagram profilini kontrol edebilirsin.")
        else:
            print(f"Yayınlama hatası: {publish_res.text}")

    except Exception as e:
        print(f"Hata: {e}")

if __name__ == "__main__":
    create_post()
    
