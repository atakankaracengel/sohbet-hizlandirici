# Sohbet Hızlandırıcı

> ChatGPT'nin uzun sohbetlerde yavaşlamasını çözen Chrome/Firefox/Helium eklentisi. Eski mesajları arka planda tutar, tarayıcı rahatlar.

## ✨ Problem

ChatGPT'de uzun bir sohbet açtığında tarayıcı **aşırı RAM yer**, **sayfa kaydırma takılır**, **yanıt üretimi yavaşlar**. Sebep: ChatGPT tüm konuşma geçmişini (mapping tree) tek seferde DOM'a render eder. Binlerce mesaj olduğunda bu binlerce DOM düğümü demek.

## 💡 Çözüm

Eklenti, ChatGPT'nin `/backend-api/conversation/{id}` isteğine gelen JSON'u **fetch interceptor** ile yakalar. Mapping tree içinden sadece **son N mesaj** (varsayılan 30) tutar, gerisini budar. ChatGPT bu kırpılmış ağaçla render yapar — kullanıcı yeni mesaj gönderinceye kadar farkı hissetmez.

### Akış

```
ChatGPT frontend
    │
    ▼ fetch(/backend-api/conversation/abc)
    │
    ▼ window.fetch (PACHED by mainWorld.js)
    │
    ▼ original fetch → JSON parse → trim mapping tree
    │
    ▼ inject only last N user/assistant messages
    │
    ▼ new Response(JSON.stringify(trimmed)) → ChatGPT render
```

### Performans kazancı

- 1000 mesajlık sohbet: ~95% daha az DOM düğümü
- RAM: ~80% düşüş
- Kaydırma: anlık (lag yok)
- Yeni mesaj üretimi: algılanabilir hızlanma

## 🎯 Özellikler

- **Performans Modu**: açık/kapalı toggle
- **Mesaj Limiti**: gösterilecek son mesaj sayısı (1-5000)
- **Parça Boyutu**: "Daha Eskiyi Yükle" başına ek mesaj
- **"Tümünü Göster"**: geçici olarak tüm geçmişi göster
- **"Şimdi Optimize Et"**: aktif sohbeti yeniden kırp
- **Banner**: üstte kaç eski mesaj gizlendi gösterir, "Tümünü Göster" linki
- **Mini counter**: kapatılınca köşede sayı
- **Toast**: optimize edildi bildirimi (slide-in)
- **Otomatik algılama**: layout uyumsuz olduğunda "Desteklenmiyor" uyarısı

## 🛠 Kurulum (Geliştirici modu)

### Chrome / Helium / Brave / Edge / Arc

1. `chrome://extensions` adresine git
2. **Geliştirici modu**'nu aç
3. **Paketlenmemiş öğe yükle** → bu klasörü seç
4. `https://chatgpt.com` aç, sohbet aç, eklenti otomatik çalışır

### Firefox

1. `about:debugging#/runtime/this-firefox` → **Geçici eklenti yükle**
2. `manifest.json`'ı seç

## 🏗 Mimari

```
manifest.json          MV3, matches: chatgpt.com + chat.openai.com
background.js          Ayar broadcast + storage yönetimi
mainWorld.js           ★ Fetch interceptor (MAIN world, document_start)
content.js             UI köprüsü: toast + banner + message handler
popup.{html,css,js}    Ayarlar paneli
img/                   İkonlar
ui.css                 Sayfa içi overlay stilleri
_locales/              Çoklu dil (en, tr, ...)
```

### Katmanlı iletişim

```
[chatgpt.com sayfası]
  ├── mainWorld.js (MAIN world, document_start'te yüklenir)
  │   ├── fetch'i patchler
  │   ├── mapping tree'yi kırpar
  │   └── postMessage ile durumu content.js'e bildirir
  │
  ├── content.js (isolated world, document_idle'da yüklenir)
  │   ├── localStorage üzerinden mainWorld ile ayar paylaşır
  │   ├── CustomEvent('cgptscroll-config') ile tetikler
  │   ├── toast + banner DOM'a ekler
  │   └── chrome.runtime.onMessage ile popup ile konuşur
  │
  └── background.js (service worker)
      └── storage değişince tüm ChatGPT tablarına broadcast

[popup.html] → chrome.tabs.sendMessage → content.js
```

### mainWorld.js çekirdek fonksiyonu

```js
window.fetch = async (...args) => {
  if (isConversationGet(url, method)) {
    const response = await originalFetch(...args);
    const text = await response.clone().text();
    const trimmed = trimConversationPayload(JSON.parse(text));
    // Sadece son N görünür mesajı tut, mapping tree'yi yeniden kur
    return new Response(JSON.stringify(trimmed.json), { ... });
  }
  return originalFetch(...args);
};
```

`trimConversationPayload`: current_node'dan köke yol çıkarır, user/assistant mesajları filtreler, son N'i tutar, kalan node'ların `parent`/`children` referanslarını yeniden bağlar.

## 🔒 Gizlilik

- **Hiçbir sunucu** — tüm işlem tarayıcıda
- **Hiçbir authentication** — Google OAuth yok
- **Hiçbir telemetri** — kullanım verisi toplanmaz
- **Hiçbir ücretli özellik yok** — sınırsız, premium yok, günlük limit yok
- Ayarlar sadece `chrome.storage.sync` ile cihazlar arası senkronize

## 🐛 Bilinen sınırlamalar

- ChatGPT'nin mapping tree formatını kullandığı için arayüz değişikliklerinde bozulabilir
- Çok eski şubeler (fork) çalışmayabilir
- Reasoning modelleri (o1, o3) için optimize edilmemiş olabilir

## 📝 Lisans

MIT — [LICENSE](./LICENSE).