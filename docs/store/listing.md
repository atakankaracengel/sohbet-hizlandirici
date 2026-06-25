# Sohbet Hızlandırıcı — Mağaza Açıklaması

## 🇹🇷 Türkçe (TR)

**Kısa açıklama** (132 karakter sınırı):
```
ChatGPT'nin uzun sohbetlerde yavaşlamasını çözer. Eski mesajları gizler, tarayıcıyı rahatlatır. Sınırsız, ücretsiz.
```

**Detaylı açıklama**:

```
Sohbet Hızlandırıcı, ChatGPT'deki uzun konuşmaların tarayıcınızı yavaşlatmasını engelleyen bir performans eklentisidir.

SORUN
━━━━

ChatGPT'de 100+ mesajlık bir sohbet açtığınızda tarayıcı ciddi şekilde yavaşlar:
• RAM kullanımı patlar
• Sayfa kaydırma takılır
• Yanıt üretimi gecikir

Sebep: ChatGPT tüm konuşma geçmişini (mapping tree) tek seferde DOM'a render eder.

ÇÖZÜM
━━━━━

Eklenti, ChatGPT'nin sohbet verisi isteğini arka planda yakalar. Sadece son N mesajı (varsayılan 30) tutar, gerisini budar. ChatGPT bu kırpılmış ağaçla render yapar.

PERFORMANS KAZANCI
━━━━━━━━━━━━━━━━━

• 1000 mesajlık sohbet: ~95% daha az DOM düğümü
• RAM: ~80% düşüş
• Kaydırma: lag yok
• Yanıt üretimi: belirgin hızlanma

ÖZELLİKLER
━━━━━━━━━

• Performans modu açma/kapama
• Gösterilecek mesaj sayısı (1-5000)
• "Daha Eskiyi Yükle" ile parça parça eski mesajları getir
• "Tümünü Göster" ile geçici olarak tüm geçmişi göster
• Otomatik algılama (uyumsuz layout'ta uyarı)
• Çoklu dil desteği (Türkçe, İngilizce)

GİZLİLİK
━━━━━━━

• Hiçbir sunucu — tüm işlem tarayıcıda
• Hiçbir authentication — Google OAuth yok
• Hiçbir telemetri
• Hiçbir ücretli özellik — sınırsız, günlük limit yok
• Ayarlar sadece chrome.storage.sync ile senkronize

LİSANS: MIT — açık kaynak
```

**Kategori**: Üretkenlik (Productivity)
**Dil**: Türkçe, İngilizce

---

## 🇬🇧 English (EN)

**Short description** (132 char limit):
```
Fix slow ChatGPT in long conversations. Hides old messages, frees the browser. Unlimited, free.
```

**Detailed description**:

```
Sohbet Hızlandırıcı (Chat Speed Booster) is a performance extension that prevents long ChatGPT conversations from slowing down your browser.

THE PROBLEM
━━━━━━━━━━

When you open a 100+ message ChatGPT conversation, your browser slows down dramatically:
• RAM usage spikes
• Page scrolling lags
• Response generation delays

Cause: ChatGPT renders the entire conversation history (mapping tree) into the DOM at once.

THE SOLUTION
━━━━━━━━━━━

The extension intercepts ChatGPT's conversation data request in the background. It keeps only the last N messages (default 30) and trims the rest. ChatGPT renders with this trimmed tree.

PERFORMANCE GAIN
━━━━━━━━━━━━━━━

• 1000-message chat: ~95% fewer DOM nodes
• RAM: ~80% reduction
• Scrolling: no lag
• Response generation: noticeably faster

FEATURES
━━━━━━━━

• Performance mode toggle on/off
• Message count to display (1-5000)
• "Load Older" to fetch older messages in chunks
• "Show All" to temporarily reveal full history
• Auto-detection (warns on unsupported layouts)
• Multi-language (Turkish, English)

PRIVACY
━━━━━━

• No server — everything runs locally
• No authentication — no Google OAuth
• No telemetry
• No paid features — unlimited, no daily caps
• Settings sync via chrome.storage.sync only

LICENSE: MIT — open source
```

**Category**: Productivity
**Language**: Turkish, English