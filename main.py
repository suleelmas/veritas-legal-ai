import os
from google import genai
import requests
import time

# GitHub Secrets
gemini_key = os.getenv("GEMINI_API_KEY")
insta_token = os.getenv("INSTA_TOKEN")
insta_id = os.getenv("INSTA_ACCOUNT_ID")

# Gemini istemcisi
client = genai.Client(api_key=gemini_key)

def create_post():
    try:
        # 1. Metin Üretimi
        print("Gemini içerik üretiyor...")
        caption_prompt = (
            "Write a short, professional Instagram caption in English for Veritas Q-AI. "
            "Focus: AI in legal analysis. "
            "Include these hashtags: #VeritasQAI #LegalTech #AIforLawyers."
        )
        caption_res = client.models.generate_content(model="gemini-2.0-flash", contents=caption_prompt)
        content = caption_res.text

        # 2. Görsel Üretimi (Imagen 3.0)
        # Hata aldığımız model ismini en güncel haliyle güncelledim
        print("Gemini özgün görsel üretiyor (Imagen 3)...")
        image_prompt = (
            "A high-end, professional photography of a modern legal gavel next to a glowing blue digital circuit board, "
            "representing AI in law. Corporate, cinematic lighting, 4k, realistic."
        )
        
        # Imagen modelini çağırıyoruz
        generate_t2i = client.models.generate_images(
            model='imagen-3.0-generate-001',
            prompt=image_prompt,
            config={'number_of_images': 1}
        )
        
        # Gemini'nin ürettiği görselin doğrudan linki
        image_url = generate_t2i.generated_images[0].url
        print(f"Görsel üretildi: {image_url}")

        # 3. Instagram Paylaşımı
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {
            'image_url': image_url, 
            'caption': content, 
            'access_token': insta_token
        }
        
        print("Instagram'a gönderiliyor...")
        r = requests.post(post_url, data=payload)
        
        if r.status_code != 200:
            print(f"Instagram Hatası: {r.text}")
            return

        creation_id = r.json()['id']
        
        # Instagram'ın görseli işlemesi için 5 saniye bekleyelim
        time.sleep(5)
        
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        publish_res = requests.post(publish_url, data={'creation_id': creation_id, 'access_token': insta_token})
        
        if publish_res.status_code == 200:
            print("BAŞARILI! Veritas Q-AI artık kendi ürettiği görsellerle yayında.")
        else:
            print(f"Yayınlama hatası: {publish_res.text}")

    except Exception as e:
        print(f"Hata oluştu: {e}")

if __name__ == "__main__":
    create_post()
    
