import os
from google import genai
import requests

# GitHub Secrets
gemini_key = os.getenv("GEMINI_API_KEY")
insta_token = os.getenv("INSTA_TOKEN")
insta_id = os.getenv("INSTA_ACCOUNT_ID")

# Gemini istemcisini oluşturuyoruz
client = genai.Client(api_key=gemini_key)

def create_post():
    try:
        # 1. ADIM: İNGİLİZCE METİN ÜRETİMİ
        caption_prompt = (
            "Write a short, professional Instagram caption in English for Veritas Q-AI. "
            "Focus: AI-powered legal analysis. Mention speed and accuracy. "
            "Include exactly these 5 hashtags: #VeritasQAI #LegalTech #AIforLawyers #Innovation #LawTech."
        )
        caption_res = client.models.generate_content(model="gemini-2.0-flash", contents=caption_prompt)
        content = caption_res.text

        # 2. ADIM: GEMINI İLE ÖZGÜN GÖRSEL ÜRETİMİ
        # Burada 'imagen-3' modelini kullanarak sıfırdan görsel üretiyoruz
        image_prompt = (
            "A professional, high-quality, futuristic legal concept image. "
            "A glowing digital scale of justice or a gavel made of blue circuit lines. "
            "Modern, corporate, trustworthy, 4k resolution, cinematic lighting."
        )
        
        print("Gemini özgün görseli üretiyor...")
        # NOT: Bazı hesaplarda model ismi 'imagen-3' veya 'gemini-2.0-flash'ın görsel yeteneği olarak değişebilir
        image_response = client.models.generate_images(
            model="imagen-3", # Gemini'nin en iyi görsel modeli
            prompt=image_prompt,
            config={'number_of_images': 1}
        )
        
        # Üretilen görselin geçici URL'sini alıyoruz
        image_url = image_response.generated_images[0].url

        # 3. ADIM: INSTAGRAM'A GÖNDERME
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {
            'image_url': image_url, 
            'caption': content, 
            'access_token': insta_token
        }
        
        print(f"Görsel üretildi, Instagram'a yükleniyor...")
        r = requests.post(post_url, data=payload)
        
        if r.status_code != 200:
            print(f"Instagram Hatası: {r.text}")
            return

        # Yayına alma
        creation_id = r.json()['id']
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        publish_res = requests.post(publish_url, data={'creation_id': creation_id, 'access_token': insta_token})
        
        if publish_res.status_code == 200:
            print("BAŞARILI! Gemini hem metni hem görseli sıfırdan üretti ve paylaştı.")
        else:
            print(f"Yayınlama hatası: {publish_res.text}")

    except Exception as e:
        print(f"Hata oluştu: {e}")

if __name__ == "__main__":
    create_post()
    
