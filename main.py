import os
from google import genai
import requests

# GitHub Secrets'tan bilgileri çekiyoruz
gemini_key = os.getenv("GEMINI_API_KEY")
insta_token = os.getenv("INSTA_TOKEN")
insta_id = os.getenv("INSTA_ACCOUNT_ID")

# Yeni nesil Gemini kurulumu
client = genai.Client(api_key=gemini_key)

def create_post():
    try:
        # 1. Gemini ile İngilizce ve Profesyonel İçerik Üretme
        prompt = (
            "Write a short, professional, and catchy Instagram caption in English for Veritas Q-AI. "
            "Veritas Q-AI is an AI-powered legal analysis platform that helps lawyers analyze documents with speed and accuracy. "
            "The tone should be innovative and trustworthy. Write ONLY the caption itself, no introductory text or choices. "
            "Include 3-5 legal tech hashtags like #LegalAI #VeritasQAI #LegalTech."
        )
        
        response = client.models.generate_content(
            model="gemini-2.0-flash", 
            contents=prompt
        )
        content = response.text

        # 2. Instagram Paylaşım Ayarları
        image_url = "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1080"
        
        # Medya Kabı Oluşturma
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {
            'image_url': image_url, 
            'caption': content, 
            'access_token': insta_token
        }
        
        print("Sending data to Instagram in English...")
        r = requests.post(post_url, data=payload)
        
        if r.status_code != 200:
            print(f"Instagram Error Detail: {r.text}")
            return

        # Medyayı Yayınlama
        creation_id = r.json()['id']
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        publish_payload = {
            'creation_id': creation_id, 
            'access_token': insta_token
        }
        
        publish_request = requests.post(publish_url, data=publish_payload)
        
        if publish_request.status_code == 200:
            print("Veritas Q-AI English post published successfully!")
        else:
            print(f"Publish Error: {publish_request.text}")

    except Exception as e:
        print(f"An unexpected error occurred: {e}")

# Hatanın oluştuğu yer burasıydı, alt satırın mutlaka içeride (girintili) olması gerekir
if __name__ == "__main__":
    create_post()
    
