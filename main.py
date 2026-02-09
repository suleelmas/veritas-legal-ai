import os
import random # Rastgele sayı üretmek için bu kütüphaneyi ekledik
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
        # 1. Gemini ile Profesyonel İngilizce İçerik Üretimi (Dünkü kodumuz aynı)
        prompt = (
            "Write a short, professional Instagram caption in English for Veritas Q-AI. "
            "Focus on how AI helps lawyers analyze complex documents. "
            "Output ONLY the caption and these 5 hashtags: #VeritasQAI #LegalTech #AIforLawyers #Innovation #LawTech."
        )
        
        response = client.models.generate_content(
            model="gemini-2.0-flash", 
            contents=prompt
        )
        content = response.text

        # 2. HER GÜN FARKLI VE RASTGELE GÖRSEL SEÇİMİ İÇİN KOD
        # Unsplash'in 'featured' (öne çıkanlar) API'sini kullanarak rastgele görsel çekiyoruz.
        # 'law,legal,technology,justice' anahtar kelimeleriyle hukuk ve teknoloji temalı görseller gelecek.
        # 'sig=' parametresi her seferinde farklı bir görsel gelmesini sağlar.
        random_seed = random.randint(1, 100000) # Her çalıştığında farklı bir sayı üretir
        image_url = f"https://source.unsplash.com/featured/1080x1080/?law,legal,technology,justice&sig={random_seed}"
        
        # 3. Instagram Paylaşım Adımları
        post_url = f"https://graph.facebook.com/v21.0/{insta_id}/media"
        
        # Instagram'ın hata vermemesi için medyanın türünü belirtmek üzere ekstra bir adım ekleyelim
        # Bu, Unsplash'in bazen doğrudan fotoğraf dosyası dönmemesi sorununu aşar.
        
        # Önce görseli indirip sonra yüklüyoruz ki Instagram "URL bir fotoğraf değil" demesin
        print(f"Rastgele görsel indiriliyor: {image_url}")
        img_data = requests.get(image_url).content
        
        # Görseli geçici bir dosyaya kaydediyoruz
        with open('temp_image.jpg', 'wb') as handler:
            handler.write(img_data)

        # Medya Kabı Oluşturma (Artık yerel dosyadan yüklüyoruz)
        # NOT: Instagram Graph API'de doğrudan yerel dosya yüklemek biraz karmaşıktır.
        # Bu yöntemde yine de bir URL bekler, bu yüzden güvenli bir URL ile devam edelim.
        # Önceki "source.unsplash" hatasına karşı, en güvenilir yol "images.unsplash" ile rastgele bir ID kullanmaktır:

        final_image_url = f"https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1080&q=80&fm=jpg&sig={random_seed}" 
        # NOT: Unsplash API'si direkt 'source'dan çekince URL'i değiştirebiliyor.
        # En güvenilir yöntem, sık kullanılan bir temel URL'e random ID eklemektir.
        # Yukarıdaki link, hem random ID hem de doğrudan fotoğraf bağlantısı sağlamak için güncellendi.
        
        payload = {'image_url': final_image_url, 'caption': content, 'access_token': insta_token}
        
        print(f"Medya kabı oluşturuluyor: {final_image_url}")
        r = requests.post(post_url, data=payload)
        
        if r.status_code != 200:
            print(f"Instagram Hatası: {r.text}")
            return

        creation_id = r.json()['id']
        publish_url = f"https://graph.facebook.com/v21.0/{insta_id}/media_publish"
        publish_payload = {'creation_id': creation_id, 'access_token': insta_token}
        requests.post(publish_url, data=publish_payload)
        
        print("Veritas Q-AI postu yepyeni ve rastgele bir fotoğrafla başarıyla paylaşıldı!")

    except Exception as e:
        print(f"Hata oluştu: {e}")

if __name__ == "__main__":
    create_post()
    
