import os
import random
from google import genai
import requests

# GitHub Secrets
gemini_key = os.getenv("GEMINI_API_KEY")
insta_token = os.getenv("INSTA_TOKEN")
insta_id = os.getenv("INSTA_ACCOUNT_ID")

client = genai.Client(api_key=gemini_key)

def create_post():
    try:
        # 1. ADIM: GEMINI KONUYU VE METNİ BELİRLİYOR
        prompt = (
            "Select a specific legal topic (e.g., Intellectual Property, Cyber Law, or Corporate Ethics). "
            "Write a short, professional Instagram caption for Veritas Q-AI in English. "
            "Then, provide ONLY ONE keyword that best describes this topic for an image search. "
            "Format: CAPTION: [your caption] KEYWORD: [one word]"
        )
        
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        raw_text = response.text
        
        # Metni ve anahtar kelimeyi ayırıyoruz
        caption = raw_text.split("KEYWORD:")[0].replace("CAPTION:", "").strip()
        keyword = raw_text.split("KEYWORD:")[1].strip() if "KEYWORD:" in raw_text else "law"

        # 2. ADIM: DİNAMİK VE HATASIZ GÖRSEL SEÇİMİ
        # Gemini'den gelen keyword'ü kullanarak Unsplash'ten taze görsel çekiyoruz
        random_sig = random.randint(1, 9999)
        # Instagram'ın sevdiği temiz link yapısı
        image_url = f"https://images.unsplash.com/featured/1080x1080/?{keyword},legal&sig={random_sig}.jpg"

        print(f"Konu: {keyword} | Görsel: {image_url}")

        # 3. ADIM: INSTAGRAM PAYLAŞIMI
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {
            'image_url': image_url, 
            'caption': caption + "\n\n#VeritasQAI #LegalTech #AI #Innovation", 
            'access_token': insta_token
        }
        
        r = requests.post(post_url, data=payload)
        
        if r.status_code != 200:
            print(f"Instagram Hatası: {r.text}")
            return

        creation_id = r.json()['id']
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        publish_res = requests.post(publish_url, data={'creation_id': creation_id, 'access_token': insta_token})
        
        if publish_res.status_code == 200:
            print(f"BAŞARILI! Gemini '{keyword}' konusunu seçti ve paylaştı.")
        else:
            print(f"Yayınlama hatası: {publish_res.text}")

    except Exception as e:
        print(f"Hata: {e}")

if __name__ == "__main__":
    create_post()
    
