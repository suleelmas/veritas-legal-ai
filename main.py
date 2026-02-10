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
        # 1. ADIM: Gemini ile İçerik Üretimi
        print("Gemini içerik üretiyor...")
        prompt = (
            "Write a short, professional Instagram caption in English for Veritas Q-AI. "
            "Focus on AI and law. Include #VeritasQAI #LegalTech #LawAI."
        )
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        content = response.text

        # 2. ADIM: INSTAGRAM'IN HATA VEREMEYECEĞİ GÖRSEL SİSTEMİ
        # Unsplash bazen redirect yaptığı için Instagram kızıyor. 
        # LoremFlickr doğrudan görsel dosyası gibi davranır.
        keywords = ["lawyer", "justice", "technology", "office", "court"]
        selected_keyword = random.choice(keywords)
        random_id = random.randint(1, 1000)
        
        # Bu URL yapısı Instagram tarafından daha kolay kabul edilir
        image_url = f"https://loremflickr.com/1080/1080/{selected_keyword}?lock={random_id}"

        print(f"Kategori: {selected_keyword} | Görsel URL: {image_url}")

        # 3. ADIM: Instagram API İşlemleri
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {
            'image_url': image_url, 
            'caption': content, 
            'access_token': insta_token
        }
        
        # Instagram'ın indirmesi için deneme
        r = requests.post(post_url, data=payload)
        
        if r.status_code != 200:
            # B PLANI: Eğer yine hata verirse, statik bir imgur veya benzeri sabit link dene
            print(f"Hata alındı, B planı (sabit görsel) deneniyor...")
            payload['image_url'] = "https://images.pexels.com/photos/6077368/pexels-photo-6077368.jpeg?auto=compress&cs=tinysrgb&w=1080"
            r = requests.post(post_url, data=payload)

        if r.status_code != 200:
            print(f"Instagram Kesin Hata: {r.text}")
            return

        creation_id = r.json()['id']
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        publish_res = requests.post(publish_url, data={'creation_id': creation_id, 'access_token': insta_token})
        
        if publish_res.status_code == 200:
            print("BAŞARILI! Veritas Q-AI paylaşımı yapıldı.")
        else:
            print(f"Yayınlama hatası: {publish_res.text}")

    except Exception as e:
        print(f"Hata oluştu: {e}")

if __name__ == "__main__":
    create_post()
    
