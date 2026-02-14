import os
import random
import time
from google import genai
import requests

# GitHub Secrets
gemini_key = os.getenv("GEMINI_API_KEY")
insta_token = os.getenv("INSTA_TOKEN")
insta_id = os.getenv("INSTA_ACCOUNT_ID")

client = genai.Client(api_key=gemini_key)

# Profesyonel Hukuk Görsel Havuzu
safe_photo_ids = [
    "1589829545856-d10d557cf95f", "1505664194779-8beaceb93744",
    "1450101499163-c8848c66ca85", "1473186578172-c141e6798ee4",
    "1521791136364-79c0640a52c1", "1507679799987-c73779587ccf",
    "1453722751126-97e51e4863e6", "1593113598332-cd288d649433",
    "1553484771-047a44efe27b", "1486312338239-5e58a2f5915a",
    "1427751369412-14197394206c", "1528732163351-512c8b05988d"
]

def create_post():
    try:
        # 1. ADIM: Gemini'ye hem metni hem de hangi görseli seçeceğini soruyoruz
        print("Gemini içerik üretiyor ve görsel seçiyor...")
        prompt = (
            f"I have a list of image IDs: {safe_photo_ids}. "
            "1. Pick one ID randomly but make sure it feels different from a typical office shot. "
            "2. Write a professional Instagram caption for Veritas Q-AI about AI in law. "
            "Return format: ID: [selected_id] | CAPTION: [your caption]"
        )
        
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        raw_output = response.text
        
        # Gemini'den gelen ID'yi ve metni ayıklıyoruz
        selected_id = raw_output.split("|")[0].replace("ID:", "").strip()
        content = raw_output.split("|")[1].replace("CAPTION:", "").strip()

        # Eğer Gemini saçmalarsa (listedeki ID'lerden birini seçmezse) manuel seçim yap
        if selected_id not in safe_photo_ids:
            selected_id = random.choice(safe_photo_ids)

        image_url = f"https://images.unsplash.com/photo-{selected_id}?format=jpg&q=80&.jpg"
        print(f"Seçilen Yeni Görsel: {image_url}")

        # 2. ADIM: Instagram Paylaşımı
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {'image_url': image_url, 'caption': content, 'access_token': insta_token}
        
        r = requests.post(post_url, data=payload)
        if r.status_code != 200:
            print(f"Hata: {r.text}")
            return

        creation_id = r.json()['id']
        time.sleep(30) # İşleme süresi
        
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        requests.post(publish_url, data={'creation_id': creation_id, 'access_token': insta_token})
        
        print(f"BAŞARILI! Bugün paylaşılan ID: {selected_id}")

    except Exception as e:
        print(f"Hata: {e}")

if __name__ == "__main__":
    create_post()
    
