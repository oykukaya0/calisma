# Pokemon Team Builder — Backend API

Kişi 1 (`feature/pokemon-api`) tarafından sağlanan endpoint'ler.
Kişi 2 ve Kişi 3 bu dokümana göre çalışabilir.

## Kurulum

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev               # otomatik yeniden başlar
# veya
npm start
```

Sunucu: `http://localhost:3000`

---

## Yanıt formatı

Başarılı yanıtlar doğrudan veriyi döner. Hatalar her zaman şu şekildedir:

```json
{
  "error": {
    "message": "Aradiginiz Pokemon bulunamadi.",
    "code": "POKEMON_NOT_FOUND",
    "status": 404
  }
}
```

Frontend `error.code` üzerinden dallanma yapabilir — mesaj metni değişebilir, kod değişmez.

| Kod | Durum | Anlamı |
|---|---|---|
| `INVALID_IDENTIFIER` | 400 | Pokemon adı geçersiz karakter içeriyor |
| `LIMIT_TOO_LARGE` | 400 | limit üst sınırı aştı |
| `POKEMON_NOT_FOUND` | 404 | Böyle bir pokemon yok |
| `ENDPOINT_NOT_FOUND` | 404 | Yanlış URL |
| `RATE_LIMITED` | 429 | Dakikada 120 istek sınırı aşıldı |
| `UPSTREAM_UNAVAILABLE` | 502 | PokeAPI'ye ulaşılamıyor |
| `UPSTREAM_TIMEOUT` | 504 | PokeAPI zamanında yanıt vermedi |

---

## `GET /api/health`

Sunucu ve cache durumu.

```json
{
  "status": "ok",
  "env": "development",
  "uptimeSeconds": 42,
  "cache": { "detail": { "size": 12, "hits": 34, "hitRate": 0.85 } }
}
```

---

## `GET /api/pokemon`

Kart listesi. Ana sayfadaki grid için.

| Parametre | Varsayılan | Açıklama |
|---|---|---|
| `limit` | 20 | Sayfa başına kayıt (max 100, `detailed` ile max 30) |
| `offset` | 0 | Kaçıncı kayıttan başlasın |
| `search` | — | İsimde geçen metin (`char` → charizard, charmander…) |
| `type` | — | Tür filtresi (`fire`, `water`, `electric`…) |
| `detailed` | false | `true` ise her kart tam detayıyla döner |

**Örnekler**

```
/api/pokemon?limit=20&offset=0
/api/pokemon?search=char
/api/pokemon?type=fire&limit=12
/api/pokemon?detailed=true&limit=20
```

**Yanıt**

```json
{
  "total": 1302,
  "limit": 20,
  "offset": 0,
  "count": 20,
  "hasMore": true,
  "filters": { "search": null, "type": null, "detailed": false },
  "results": [
    {
      "id": 1,
      "name": "bulbasaur",
      "displayName": "Bulbasaur",
      "image": "https://raw.githubusercontent.com/.../1.png"
    }
  ]
}
```

`detailed=true` verilirse `results` içindeki her öğe aşağıdaki detay nesnesiyle aynı yapıda olur.

---

## `GET /api/pokemon/:identifier`

Tek pokemonun detayı. Ad veya id ile çalışır: `/api/pokemon/pikachu` = `/api/pokemon/25`

`?include=species` eklenirse açıklama metni de gelir (detay sayfası için ideal).

```json
{
  "id": 25,
  "name": "pikachu",
  "displayName": "Pikachu",
  "types": ["electric"],
  "image": "https://.../25.png",
  "sprite": "https://.../25.png",
  "shinyImage": null,
  "height": 0.4,
  "weight": 6,
  "baseExperience": 112,
  "abilities": [
    { "name": "static", "displayName": "Static", "isHidden": false }
  ],
  "stats": {
    "hp": 35, "attack": 55, "defense": 40,
    "specialAttack": 50, "specialDefense": 50, "speed": 90
  },
  "totalStats": 320
}
```

> `height` metre, `weight` kilogram cinsindedir (PokeAPI desimetre/hektogram verir, backend dönüştürür).

---

## `GET /api/pokemon/:identifier/species`

Açıklama metni ve tür bilgisi.

```json
{
  "id": 25,
  "name": "pikachu",
  "description": "When several of these POKeMON gather...",
  "genus": "Mouse Pokemon",
  "color": "yellow",
  "habitat": "forest",
  "generation": "generation-i",
  "isLegendary": false,
  "isMythical": false,
  "captureRate": 190,
  "evolvesFrom": "pichu"
}
```

---

## `GET /api/pokemon/types`

Filtre menüsü için tüm türler.

```json
{
  "count": 18,
  "results": [{ "name": "fire", "displayName": "Fire", "id": 10 }]
}
```

---

## Kişi 2 için not (`feature/database`)

Route'unu eklemek için **sadece** `routes/index.js` içindeki şu satırın yorumunu kaldır:

```js
router.use('/team', require('./team'));
```

`app.js` ve `server.js` dosyalarına dokunma — böylece merge conflict çıkmaz.

Takıma pokemon kaydederken PokeAPI'den tekrar veri çekmene gerek yok; frontend
zaten `id`, `name`, `types`, `image` alanlarına sahip olacak. Veritabanına bunları
yazman yeterli. Detay gerektiğinde `/api/pokemon/:id` üzerinden cache'ten anında gelir.

## Kişi 3 için not (`feature/frontend`)

Dosyalarını `public/` içine koy. Backend bu klasörü otomatik servis eder,
yani `http://localhost:3000` adresi doğrudan senin `index.html` dosyanı açar.
Aynı sunucudan servis edildiği için CORS ayarı yapmana gerek yok.

**Önemli:** Güvenlik başlıkları (CSP) inline `<script>` bloklarını engeller.
JavaScript kodunu `script.js` dosyasına yaz, HTML içine gömme.
