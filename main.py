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

def create_post():
    try:
        # 1. Gemini İçerik Üretimi
        print("Gemini içerik üretiyor...")
        prompt = (
            "Write a short, professional Instagram caption for Veritas Q-AI. "
            "Focus: Speed and reliability of AI in legal work. Include #VeritasQAI #LegalTech."
        )
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        content = response.text

        # 2. %100 ONAYLI VE TERTEMİZ LİNK YAPISI
        # Parametreleri sildik, sadece ham fotoğraf ID'lerini bıraktık.
        safe_photo_ids = [
            "1589829545856-d10d557cf95f", "1505664194779-8beaceb93744",
            "1450101499163-c8848c66ca85", "1473186578172-c141e6798ee4",
            "1521791136364-79c0640a52c1", "1507679799987-c73779587ccf",
            "1453722751126-97e51e4863e6", "1593113598332-cd288d649433",
            "1553484771-047a44efe27b", "1486312338239-5e58a2f5915a"
        ]
        
        selected_id = random.choice(safe_photo_ids)
        
        # KRİTİK DEĞİŞİKLİK: Linkin sonuna doğrudan .jpg ekliyoruz ve parametreleri kaldırıyoruz.
        # Bu URL doğrudan görsel dosyasını tetikler.
        image_url = f"https://images.unsplash.com/photo-{selected_id}?format=jpg&quality=80&.jpg"

        print(f"Görsel seçildi: {image_url}")

        # 3. Instagram Paylaşım Adımları
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {
            'image_url': image_url, 
            'caption': content, 
            'access_token': insta_token
        }
        
        r = requests.post(post_url, data=payload)
        
        if r.status_code != 200:
            print(f"Instagram Yükleme Hatası (9004 mü?): {r.text}")
            # EĞER HALA HATA VERİRSE: Parametresiz en düz halini dene
            print("B Planı deneniyor...")
            payload['image_url'] = f"https://images.unsplash.com/photo-{selected_id}?auto=format&fit=crop&w=1080&q=80"
            r = requests.post(post_url, data=payload)

        if r.status_code != 200:
            print(f"Maalesef Instagram linki reddetti: {r.text}")
            return

        creation_id = r.json()['id']
        print(f"Medya yüklendi (ID: {creation_id}). 30 saniye bekleniyor...")
        time.sleep(30) 
        
        # 4. Yayına Alma
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        publish_res = requests.post(publish_url, data={'creation_id': creation_id, 'access_token': insta_token})
        
        if publish_res.status_code == 200:
            print("NİHAYET! Profesyonel görsel yayına alındı.")
        else:
            print(f"Yayınlama Hatası: {publish_res.text}")

    except Exception as e:
        print(f"Hata: {e}")

if __name__ == "__main__":
    create_post()
    
