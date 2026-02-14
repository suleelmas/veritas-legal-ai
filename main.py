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

# %100 Denetlenmiş, Hata Vermeyen Hukuk Görsel ID'leri
# (Bu ID'leri Instagram'ın en sevdiği link yapısıyla birleştireceğiz)
safe_photo_ids = [
    "1589829545856-d10d557cf95f", "1505664194779-8beaceb93744",
    "1450101499163-c8848c66ca85", "1473186578172-c141e6798ee4",
    "1521791136364-79c0640a52c1", "1507679799987-c73779587ccf",
    "1453722751126-97e51e4863e6", "1593113598332-cd288d649433",
    "1553484771-047a44efe27b", "1486312338239-5e58a2f5915a"
]

def create_post():
    try:
        # 1. ADIM: Gemini Karar Mekanizması
        print("Gemini içerik üretiyor ve görsel seçiyor...")
        # Gemini'ye rastgele bir seçim yaptırıyoruz ama liste içinden seçmesini zorunlu kılıyoruz
        prompt = (
            f"Select one unique ID from this list: {safe_photo_ids}. "
            "Write a short, professional Instagram caption for 'Veritas Q-AI' about legal technology. "
            "Return only: ID: [selected_id] | CAPTION: [your caption]"
        )
        
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        raw_output = response.text
        
        try:
            selected_id = raw_output.split("|")[0].replace("ID:", "").strip()
            content = raw_output.split("|")[1].replace("CAPTION:", "").strip()
        except:
            selected_id = random.choice(safe_photo_ids)
            content = "Empowering legal precision with Veritas Q-AI. #LegalTech #Innovation"

        # 2. ADIM: INSTAGRAM'IN HATA VEREMEYECEĞİ STATİK URL YAPISI
        # Bu yapı doğrudan görseli bir dosya gibi sunar, Instagram yönlendirme (redirect) hatası veremez.
        image_url = f"https://images.unsplash.com/photo-{selected_id}?ixlib=rb-4.0.3&auto=format&fit=crop&w=1080&q=80"

        print(f"Deneme yapılıyor. Görsel: {image_url}")

        # 3. ADIM: Instagram API - Medya Kabı Oluşturma
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {
            'image_url': image_url, 
            'caption': content, 
            'access_token': insta_token
        }
        
        r = requests.post(post_url, data=payload)
        
        if r.status_code != 200:
            print(f"İlk deneme başarısız. B planına geçiliyor...")
            # B PLANI: Link yapısını daha da basitleştirip tekrar dene
            image_url_b = f"https://source.unsplash.com/{selected_id}/1080x1080.jpg"
            payload['image_url'] = image_url_b
            r = requests.post(post_url, data=payload)

        if r.status_code != 200:
            print(f"Kritik Hata (9004): Instagram linki hala kabul etmiyor. Detay: {r.text}")
            return

        creation_id = r.json()['id']
        print(f"Medya yüklendi (ID: {creation_id}). 30 saniye bekleniyor...")
        time.sleep(30) 
        
        # 4. ADIM: Yayına Alma
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        publish_res = requests.post(publish_url, data={'creation_id': creation_id, 'access_token': insta_token})
        
        if publish_res.status_code == 200:
            print(f"NİHAYET BAŞARILI! Paylaşılan ID: {selected_id}")
        else:
            print(f"Yayınlama hatası: {publish_res.text}")

    except Exception as e:
        print(f"Beklenmedik Hata: {e}")

if __name__ == "__main__":
    create_post()
    
