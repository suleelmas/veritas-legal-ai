import os
import random
from google import genai
import requests

gemini_key = os.getenv("GEMINI_API_KEY")
insta_token = os.getenv("INSTA_TOKEN")
insta_id = os.getenv("INSTA_ACCOUNT_ID")

client = genai.Client(api_key=gemini_key)

def create_post():
    try:
        # Gemini İçerik Üretimi (İngilizce ve 5 Hashtag)
        prompt = (
            "Write a short, professional Instagram caption in English for Veritas Q-AI. "
            "Focus: AI-powered legal analysis. "
            "Output ONLY the caption and these 5 hashtags: #VeritasQAI #LegalTech #AIforLawyers #Innovation #LawTech."
        )
        
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        content = response.text

        # HER GÜN FARKLI GÖRSEL İÇİN:
        # Sonuna eklediğimiz sig= sayesinde Instagram bunun hep yeni bir resim olduğunu anlar
        random_id = random.randint(1, 1000)
        image_url = f"https://source.unsplash.com/featured/1080x1080/?law,legal,ai&sig={random_id}"
        
        # Instagram Paylaşım Adımları
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        payload = {'image_url': image_url, 'caption': content, 'access_token': insta_token}
        
        r = requests.post(post_url, data=payload)
        if r.status_code != 200:
            print(f"Hata: {r.text}")
            return

        creation_id = r.json()['id']
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        requests.post(publish_url, data={'creation_id': creation_id, 'access_token': insta_token})
        print(f"Veritas Q-AI postu yeni bir görsel ({random_id}) ve 5 hashtag ile paylaşıldı!")

    except Exception as e:
        print(f"Hata: {e}")

if __name__ == "__main__":
    create_post()
    
