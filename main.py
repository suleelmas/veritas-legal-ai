import os
import google.generativeai as genai
import requests

# Secrets'tan bilgileri çekiyoruz
gemini_key = os.getenv("GEMINI_API_KEY")
insta_token = os.getenv("INSTA_TOKEN")
insta_id = os.getenv("INSTA_ACCOUNT_ID")

# Gemini Kurulumu
genai.configure(api_key=gemini_key)
model = genai.GenerativeModel('gemini-2.0-flash')

def create_post():
    # İçerik Üretme
    prompt = "Create a professional Instagram post about Veritas Q-AI, the world's first quantum-powered legal analysis platform. Include a hook, 3 benefits, and hashtags. Language: English."
    response = model.generate_content(prompt)
    content = response.text

    # Instagram'a Yükleme (Örnek görsel ile)
    image_url = "https://images.unsplash.com/photo-1589829545856-d10d557cf95f" # Geçici hukuk görseli
    
    post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
    payload = {'image_url': image_url, 'caption': content, 'access_token': insta_token}
    r = requests.post(post_url, data=payload)
    
    if r.status_code == 200:
        creation_id = r.json()['id']
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        requests.post(publish_url, data={'creation_id': creation_id, 'access_token': insta_token})
        print("Paylaşım başarılı!")

create_post()
