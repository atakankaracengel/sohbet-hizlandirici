# Gizlilik Politikası — Sohbet Hızlandırıcı (ChatGPT Speed Booster)

**Son güncelleme**: 2026

Bu eklenti gizliliğinize önem verir. Bu belge, eklentinin verilerinizi nasıl işlediğini açıklar.

## Toplanan Veri: YOK

Sohbet Hızlandırıcı **hiçbir kullanıcı verisi toplamaz, saklamaz veya aktarmaz**. Tüm işlem kullanıcının kendi tarayıcısında gerçekleşir.

Spesifik olarak:

- ❌ Analitik / telemetry
- ❌ Kullanım istatistikleri
- ❌ Konum bilgisi
- ❌ Cihaz bilgisi
- ❌ Sohbet içeriği kaydı
- ❌ Hesap bilgisi
- ❌ Çerez (cookie) okuma/yazma

## Sunucu Bağlantısı: YOK

Eklenti **hiçbir dış sunucuya bağlanmaz**. Hiçbir API çağrısı yapılmaz. Hiçbir veri ağ üzerinden gönderilmez.

Eklenti sadece:
- `chatgpt.com` ve `chat.openai.com` sitelerinin kendi iç API'siyle iletişim kurar (kullanıcının tarayıcısı içinde)
- `chrome.storage.sync` ile ayarları cihazlar arası senkronize eder (Google'ın kendi altyapısı)

## Erişilen Veriler

Eklenti, kullanıcının **kendisinin açtığı ChatGPT sohbetinin** mesajlarına erişir. Bu erişim:

- **Yalnızca kullanıcının etkin sekmesinde**, performans modu açıkken otomatik olarak çalışır
- **Yalnızca render budama** amacıyla kullanılır (mapping tree'yi kırpar)
- **Hiçbir yere kaydedilmez veya gönderilmez**
- **Sekme kapatıldığında tüm bellek temizlenir**

## İzinler

| İzin | Neden |
|---|---|
| `storage` | Kullanıcı ayarlarını cihazlar arası senkronize etmek |
| `chatgpt.com` host | Sadece ChatGPT sitesinde çalışmak |
| `chat.openai.com` host | Sadece ChatGPT sitesinde çalışmak |

## Üçüncü Taraflar

Eklenti:
- **Google OAuth kullanmaz**
- **Hiçbir analytics servisine** veri göndermez
- **Hiçbir reklam ağına** bağlı değildir
- **Ücretli abonelik veya ödeme** bilgisi toplamaz
- **Hesap kaydı veya oturum açma** yoktur

## Açık Kaynak

Eklenti MIT lisansıyla açık kaynak kodludur. Kodu istediğiniz zaman inceleyebilirsiniz:
https://github.com/atakankaracengel/sohbet-hizlandirici

## Çocukların Gizliliği

Eklenti 13 yaş altı çocuklara yönelik değildir ve bilerek çocuklardan veri toplamaz.

## Değişiklikler

Bu politika zaman zaman güncellenebilir. Önemli değişiklikler GitHub commit geçmişinde görülecektir.

## İletişim

Gizlilik ile ilgili sorularınız için GitHub Issues açabilirsiniz:
https://github.com/atakankaracengel/sohbet-hizlandirici/issues

---

**Özet**: Bu eklenti veri toplamaz. Tek yaptığı, ChatGPT'nin sohbet verisini tarayıcıda budamak — böylece tarayıcı daha rahat çalışır. Başka hiçbir şey.