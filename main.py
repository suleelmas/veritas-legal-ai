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
            "Focus: How AI improves legal workflows. Include #VeritasQAI #LegalTech."
        )
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        content = response.text

        # 2. %100 DENETLENMİŞ GÖRSEL HAVUZU (Kedi/Şarap İhtimali Yok)
        # Bu ID'lerin her biri profesyonel hukuk fotoğraflarıdır.
        safe_photo_ids = [
            "1589829545856-d10d557cf95f", # Gümüş adalet terazisi
            "1505664194779-8beaceb93744", # Eski hukuk kitapları
            "1450101499163-c8848c66ca85", # İmza atan kalem ve daktilo
            "1473186578172-c141e6798ee4", # Tahta tokmak (Gavel)
            "1521791136364-79c0640a52c1", # El sıkışma ve sözleşme
            "1507679799987-c73779587ccf", # Modern ofis binası
            "1453722751126-97e51e4863e6", # Kütüphane rafları
            "1593113598332-cd288d649433", # Adalet heykeli yakın çekim
            "1553484771-047a44efe27b", # Toplantı odası
            "1486312338239-5e58a2f5915a", # Bilgisayar ve hukuk dosyaları
            "1427751369412-14197394206c", # Klasik mahkeme binası
            "1528732163351-512c8b05988d"  # Anayasa kitapları
        ]
        
        selected_id = random.choice(safe_photo_ids)
        # Instagram'ın '9004' hatası vermemesi için en stabil link yapısı:
        image_url = f"https://images.unsplash.com/photo-{selected_id}?w=1080&q=80&fm=jpg"

        print(f"Görsel seçildi (ID: {selected_id}). Instagram'a gönderiliyor...")

        # 3. Instagram Paylaşım Adımları
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {
            'image_url': image_url, 
            'caption': content, 
            'access_token': insta_token
        }
        
        r = requests.post(post_url, data=payload)
        
        if r.status_code != 200:
            print(f"Instagram Yükleme Hatası: {r.text}")
            return

        creation_id = r.json()['id']
        print(f"Medya işleniyor (ID: {creation_id})... 30 saniye bekleniyor.")
        
        # Instagram'ın görseli doğrulaması için gereken bekleme süresi
        time.sleep(30) 
        
        # 4. Yayına Alma
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        publish_res = requests.post(publish_url, data={'creation_id': creation_id, 'access_token': insta_token})
        
        if publish_res.status_code == 200:
            print("BAŞARILI! Veritas Q-AI'a yakışan profesyonel görsel paylaşıldı.")
        else:
            print(f"Yayınlama Hatası: {publish_res.text}")

    except Exception as e:
        print(f"Hata: {e}")

if __name__ == "__main__":
    create_post()
    
