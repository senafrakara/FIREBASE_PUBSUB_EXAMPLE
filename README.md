# Firebase Pub/Sub with Cloud Functions (Gen 1)

> Modern, scalable messaging patterns ile Firebase Functions kullanarak gerçek zamanlı, asenkron işlemler gerçekleştirin.

Bu proje, Firebase Cloud Functions (Gen 1) kullanarak Google Cloud Pub/Sub entegrasyonunu detaylı örneklerle gösterir. Hem mesaj yayınlama (publish) hem de mesaj alma (trigger) örneklerini içerir. Event-driven mimari, gerçek zamanlı bildirimler ve asenkron veri işleme için bu örnekleri başlangıç noktası olarak kullanabilirsiniz.

---

## 📚 İçindekiler

- [Pub/Sub Nedir?](#pubsub-nedir)
- [Proje Yapısı](#proje-yapısı)
- [Kurulum](#kurulum)
- [Topic Oluşturma](#topic-oluşturma)
- [Mesaj Yayınlama (Publishing)](#mesaj-yayınlama-publishing)
- [Mesaj İşleme (Consuming/Triggers)](#mesaj-işleme-consumingtriggers)
- [Tam Örnek Workflow](#tam-örnek-workflow)
- [Deploy](#deploy)
- [Sık Sorulan Sorular](#sık-sorulan-sorular)

---

## 🤔 Pub/Sub Nedir?

**Pub/Sub (Publish/Subscribe)** - Google Cloud'un sunduğu tam yönetimli mesajlaşma servisidir. Mikroservis mimarilerinde bileşenler arasında gevşek bağ (loose coupling) sağlar.

### Temel Kavramlar

- **Topic (Konu)**: Mesajların yayınlandığı kanal
- **Publisher (Yayıncı)**: Topic'e mesaj gönderen uygulama/fonksiyon
- **Subscriber (Abone)**: Mesajları alan fonksiyon/hizmet
- **Subscription (Abonelik)**: Bir subscriber'ın bir topic'e bağlanması

### Önemli Not

Firebase Functions'da `onPublish()` kullandığınızda, Firebase **otomatik olarak** bir subscription oluşturur. Yani sadece şunu yazarsanız:

```javascript
exports.myFunction = functions.pubsub.topic('my-topic').onPublish((message) => {
  // Mesaj işleme kodu
});
```

Firebase deploy sırasında `my-topic` için bir subscription oluşturur ve bu fonksiyonu her mesajda tetikler.

### Avantajları

✅ **Asenkron İşleme**: Uygulamanız mesaj gönderip hemen devam edebilir
✅ **Ölçeklenebilirlik**: Binlerce mesajı otomatik olarak yönetir
✅ **Güvenilirlik**: Mesajların kaybolmamasını garanti eder
✅ **Decoupling**: Servisler birbirinden bağımsız çalışır
✅ **Sürüklenme Direnci**: Trafik piklerinde mesajları kuyruğa alır

### Kullanım Senaryoları

- 📧 **E-posta/Push Bildirimler**: Kullanıcı işlemi yaptığında arka planda bildirim gönderme
- 📊 **Veri İşleme**: Büyük veri setlerini parçalara ayırıp paralel işleme
- 🎯 **Event-Driven Mimari**: Mikroservisler arası haberleşme
- 📈 **Raporlama**: Zamanlanmış görevler ve veri toplama
- 🔄 **Veri Dönüşümü**: A/B testing, analytics verisi işleme

---

## 📁 Proje Yapısı

```
firebase-pubsub-example/
├── functions/
│   ├── index.js              # Tüm Pub/Sub örnekleri
│   ├── package.json          # Bağımlılıklar
│   └── .gitignore
├── firebase.json             # Firebase yapılandırması
├── .firebaserc               # Firebase proje ID
├── .gitignore
└── README.md                 # Bu dosya
```

---

## 🛠️ Kurulum

### Gereksinimler

- Node.js 20 veya üzeri
- Firebase CLI (`npm install -g firebase-tools`)
- Google Cloud CLI (opsiyonel, topic oluşturma için)
- Firebase Projesi (ücretsiz başlayın: [console.firebase.google.com](https://console.firebase.google.com))

### Adım 1: Projeyi Klonlayın veya İndirin

```bash
git clone https://github.com/senafrakara/firebase-pubsub-example.git
cd firebase-pubsub-example
```

### Adım 2: Bağımlılıkları Yükleyin

```bash
cd functions
npm install
cd ..
```

### Adım 3: Firebase Projenizi Bağlayın

```bash
firebase login
firebase use --add
```

Proje ID'nizi seçin veya girin.

---

## 🎯 Topic Oluşturma

Pub/Sub kullanmak için önce topic'leri oluşturmanız gerekir. Üç yöntem var:

### Yöntem 1: Google Cloud Console (En Kolay)

1. [Google Cloud Console](https://console.cloud.google.com) açın
2. Üst menüden "Cloud Pub/Sub" seçin
3. Sol menüden "Topics" tıklayın
4. "Create Topic" butonuna tıklayın
5. Topic adını girin (örn: `topic-name`, `orders`, `notifications`)

### Yöntem 2: gcloud CLI

```bash
# Projenizi aktif edin
gcloud config set project YOUR-PROJECT-ID

# Topic oluşturun
gcloud pubsub topics create topic-name
gcloud pubsub topics create another-topic-name
gcloud pubsub topics create yet-another-topic-name
gcloud pubsub topics create orders

# Oluşturduğunuz topic'leri listeleyin
gcloud pubsub topics list
```

### Yöntem 3: Code ile (Firebase Admin SDK)

Fonksiyonlarınızda şu kodu çalıştırabilirsiniz:

```javascript
const { PubSub } = require('@google-cloud/pubsub');
const pubsub = new PubSub();

// Topic oluştur
await pubsub.createTopic('my-new-topic');
```

---

## 📤 Mesaj Yayınlama (Publishing)

Bu bölümde topic'lere nasıl mesaj göndereceğinizi öğreneceksiniz.

### gcloud CLI ile Mesaj Gönderme

En basit yöntem:

```bash
# Basit string mesaj
gcloud pubsub topics publish topic-name --message "Hello from Pub/Sub!"

# JSON mesaj gönderme
gcloud pubsub topics publish another-topic-name --message '{"name":"John Doe","age":30}'

# Attribute (metadata) ile mesaj gönderme
gcloud pubsub topics publish yet-another-topic-name \
  --message "Hello" \
  --attribute name=Alice,priority=high,userId=12345
```

### Projede Yer Alan Publish Fonksiyonları

Proje üç HTTP endpoint içerir:

#### 1. Basit Mesaj Gönderme

```bash
curl -X POST https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/publishMessage \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello World",
    "topic": "topic-name"
  }'
```

**Kod:**

```javascript
exports.publishMessage = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, topic = 'test-topic' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Publish message to topic
    const messageId = await pubsub.topic(topic).publishMessage({
      data: Buffer.from(message),
    });

    functions.logger.info(`Message ${messageId} published to topic ${topic}`);

    return res.status(200).json({
      success: true,
      messageId,
      topic,
      message
    });
  } catch (error) {
    functions.logger.error('Error publishing message:', error);
    return res.status(500).json({ error: 'Failed to publish message' });
  }
});
```

#### 2. JSON Mesaj Gönderme

```bash
curl -X POST https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/publishJson \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "json-topic",
    "data": {
      "name": "John Doe",
      "email": "john@example.com",
      "orderId": "12345"
    }
  }'
```

**Kod:**

```javascript
exports.publishJson = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { topic = 'json-topic', data } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }

    // Publish JSON message
    const messageId = await pubsub.topic(topic).publishMessage({
      json: data,
    });

    functions.logger.info(`JSON message ${messageId} published to topic ${topic}`);

    return res.status(200).json({
      success: true,
      messageId,
      topic,
      data
    });
  } catch (error) {
    functions.logger.error('Error publishing JSON message:', error);
    return res.status(500).json({ error: 'Failed to publish message' });
  }
});
```

#### 3. Attribute ile Mesaj Gönderme

```bash
curl -X POST https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/publishWithAttributes \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Processing complete",
    "topic": "attributes-topic",
    "attributes": {
      "userId": "12345",
      "priority": "high",
      "type": "notification"
    }
  }'
```

**Kod:**

```javascript
exports.publishWithAttributes = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, topic = 'attributes-topic', attributes = {} } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Publish message with attributes
    const messageId = await pubsub.topic(topic).publishMessage({
      data: Buffer.from(message),
      attributes: attributes
    });

    functions.logger.info(`Message ${messageId} published with attributes`, attributes);

    return res.status(200).json({
      success: true,
      messageId,
      topic,
      message,
      attributes
    });
  } catch (error) {
    functions.logger.error('Error publishing message with attributes:', error);
    return res.status(500).json({ error: 'Failed to publish message' });
  }
});
```

---

## 📥 Mesaj İşleme (Consuming/Triggers)

`onPublish()` kullandığınızda Firebase otomatik subscription oluşturur ve mesaj geldiğinde fonksiyonunuzu tetikler.

### 1. Base64 Mesaj İşleme

```bash
# Mesaj gönder
gcloud pubsub topics publish topic-name --message "Hello World"

# Veya HTTP endpoint ile
curl -X POST https://YOUR-REGION.cloudfunctions.net/publishMessage \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello World", "topic": "topic-name"}'
```

**Trigger Kodu:**

```javascript
exports.helloPubSub = functions.pubsub.topic('topic-name').onPublish((message) => {
  // Decode the PubSub Message body
  const messageBody = message.data ? Buffer.from(message.data, 'base64').toString() : null;
  
  functions.logger.log(`Hello ${messageBody || 'World'}!`);
  
  return null;
});
```

### 2. JSON Mesaj İşleme

```bash
# Mesaj gönder
gcloud pubsub topics publish another-topic-name --message '{"name":"John Doe","email":"john@example.com"}'
```

**Trigger Kodu:**

```javascript
exports.helloPubSubJson = functions.pubsub.topic('another-topic-name').onPublish((message) => {
  let name = null;
  try {
    name = message.json.name;
  } catch (e) {
    functions.logger.error('PubSub message was not JSON', e);
  }
  
  functions.logger.log(`Hello ${name || 'World'}!`);
  
  return null;
});
```

### 3. Attribute ile Mesaj İşleme

```bash
# Mesaj gönder
gcloud pubsub topics publish yet-another-topic-name \
  --message "Hello" \
  --attribute name=Alice,priority=high,userId=67890
```

**Trigger Kodu:**

```javascript
exports.helloPubSubAttributes = functions.pubsub.topic('yet-another-topic-name').onPublish((message) => {
  const name = message.attributes.name;
  const priority = message.attributes.priority;
  
  functions.logger.log(`Hello ${name || 'World'}! Priority: ${priority}`);
  
  return null;
});
```

### 4. İleri Seviye: Sipariş İşleme Sistemi

```bash
# Sipariş mesajı gönder
gcloud pubsub topics publish orders --message '{
  "orderId": "ORD-12345",
  "customerId": "CUST-67890",
  "total": 129.99,
  "type": "express",
  "items": ["item1", "item2"]
}'
```

**Trigger Kodu:**

```javascript
exports.processOrder = functions.pubsub.topic('orders').onPublish(async (message) => {
  try {
    const orderData = message.json;
    
    // Validate required fields
    if (!orderData.orderId || !orderData.customerId || !orderData.total) {
      functions.logger.error('Invalid order data: missing required fields', orderData);
      return null;
    }

    // Log order received
    functions.logger.info(`Processing order ${orderData.orderId}`, {
      orderId: orderData.orderId,
      customerId: orderData.customerId,
      total: orderData.total,
      timestamp: new Date().toISOString()
    });

    // Process order based on type
    switch (orderData.type) {
      case 'standard':
        functions.logger.info('Processing standard order');
        // Standard order logic
        break;
      case 'express':
        functions.logger.info('Processing express order - priority handling');
        // Express order logic
        break;
      case 'bulk':
        functions.logger.info('Processing bulk order - special pricing');
        // Bulk order logic
        break;
      default:
        functions.logger.warn(`Unknown order type: ${orderData.type}`);
    }

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 100));

    functions.logger.info(`Order ${orderData.orderId} processed successfully`);
    
    return { success: true, orderId: orderData.orderId };
  } catch (error) {
    functions.logger.error('Error processing order', error);
    return null;
  }
});
```

---

## 🔄 Tam Örnek Workflow

İşte baştan sona tüm süreç:

### Adım 1: Topic Oluşturun

```bash
gcloud pubsub topics create notification-topic
```

### Adım 2: Fonksiyonları Deploy Edin

```bash
firebase deploy --only functions
```

Bu işlem:
- `notification-topic` için otomatik bir subscription oluşturur
- Trigger fonksiyonlarınızı aktif eder

### Adım 3: Mesaj Gönderin

```bash
# Yöntem 1: gcloud ile
gcloud pubsub topics publish notification-topic --message '{"userId":"123","message":"Welcome!"}'

# Yöntem 2: HTTP endpoint ile
curl -X POST https://YOUR-REGION.cloudfunctions.net/publishJson \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "notification-topic",
    "data": {"userId":"123","message":"Welcome!"}
  }'
```

### Adım 4: Logları İzleyin

```bash
# Tüm loglar
firebase functions:log

# Belirli fonksiyon
firebase functions:log --only processOrder

# Gerçek zamanlı
firebase functions:log --tail
```

---

## 🚢 Deploy

### İlk Deploy

```bash
firebase deploy --only functions
```

### Belirli Bir Fonksiyon Deploy Etme

```bash
firebase deploy --only functions:processOrder
```

### Environment Variables

```bash
firebase functions:config:set email.password="your-secret"
firebase deploy --only functions
```

Fonksiyon içinde:

```javascript
const emailPassword = functions.config().email.password;
```

---

## 📊 Monitoring ve Debugging

### Logları Görüntüleme

```bash
# Tüm loglar
firebase functions:log

# Belirli bir fonksiyon
firebase functions:log --only processOrder

# Gerçek zamanlı
firebase functions:log --tail
```

### Firebase Console

- [Firebase Console](https://console.firebase.google.com) → Functions → Logs
- Detaylı stack trace'ler
- Execution time, memory metrikleri

### Cloud Monitoring

Google Cloud Console → Monitoring:
- Invocation sayısı
- Error rate
- Latency
- Cost tracking

### Topic ve Subscription Kontrolü

```bash
# Topic listesi
gcloud pubsub topics list

# Subscription listesi
gcloud pubsub subscriptions list

# Topic detayları
gcloud pubsub topics describe topic-name

# Subscription detayları
gcloud pubsub subscriptions describe YOUR-SUBSCRIPTION-NAME
```

---

## ❓ Sık Sorulan Sorular

### onPublish() ile subscription otomatik oluşur mu?

**Evet!** Firebase deploy sırasında otomatik oluşturur. Manuel oluşturmanıza gerek yok.

### Pub/Sub mu HTTP mu kullansam?

| Özellik | Pub/Sub | HTTP |
|---------|---------|------|
| Kullanım | Asenkron, background | Senkron, anında yanıt |
| Güvenilirlik | Mesaj garantisi | Connection drop riski |
| Bekleme | Kuyruk sistemi | Timeout riski |
| Örnek | Email gönderme, rapor oluşturma | API istekleri, anında yanıt |

**Öneri**: Zaman alan işlemler için Pub/Sub, hızlı yanıt gereken yerlerde HTTP.

### Mesaj sırası garantili mi?

Hayır. Pub/Sub **at-least-once** delivery sağlar ama sıra garantisi yok. Sıralama gerekiyorsa:
- Mesajlara sequence number ekleyin
- Partitioned topic kullanın
- Tek subscriber kullanın

### Maliyet nasıl?

- **Firebase Functions**: İlk 2M çağrı ücretsiz, sonra $0.40 / 1M
- **Pub/Sub**: İlk 10GB ücretsiz, sonra $0.40 / 10GB

Aylık 1M mesaj için yaklaşık **$0.40**!

### Error handling nasıl?

```javascript
exports.resilientFunction = functions.pubsub.topic('reliable').onPublish(async (message) => {
  let retries = 0;
  const maxRetries = 3;
  
  while (retries < maxRetries) {
    try {
      await processMessage(message.json);
      break; // Success
    } catch (error) {
      retries++;
      if (retries === maxRetries) {
        // Dead letter queue veya alert gönder
        await sendAlert(error);
      }
    }
  }
});
```

### Local'de nasıl test ederim?

```bash
# Emulator başlat
firebase emulators:start --only functions,pubsub

# Başka terminal'de test
curl -X POST http://localhost:8080/YOUR-PROJECT/us-central1/publishMessage \
  -H "Content-Type: application/json" \
  -d '{"message":"Test","topic":"test-topic"}'
```

---

## 🎯 Gerçek Dünya Senaryoları

### Senaryo 1: Kullanıcı Kayıt Bildirimi

```javascript
// 1. Publish mesajı
exports.triggerWelcomeEmail = functions.auth.user().onCreate(async (user) => {
  await pubsub.topic('user-signup').publishMessage({
    json: {
      userId: user.uid,
      email: user.email,
      name: user.displayName
    }
  });
});

// 2. Consume mesajı
exports.sendWelcomeEmail = functions.pubsub.topic('user-signup').onPublish(async (message) => {
  const { userId, email, name } = message.json;
  
  // SendGrid, Mailgun, vs. ile e-posta gönder
  await emailService.send({
    to: email,
    subject: `Hoş geldin ${name}!`,
    html: generateWelcomeTemplate(name)
  });
  
  functions.logger.info(`Welcome email sent to ${email}`);
});
```

### Senaryo 2: Resim İşleme Pipeline

```javascript
exports.resizeImage = functions.pubsub.topic('image-uploaded').onPublish(async (message) => {
  const { imageUrl, userId } = message.json;
  
  const thumbnails = await Promise.all([
    createThumbnail(imageUrl, { width: 150, height: 150 }),
    createThumbnail(imageUrl, { width: 500, height: 500 }),
    createThumbnail(imageUrl, { width: 1200, height: 1200 })
  ]);
  
  await admin.firestore()
    .collection('user-images')
    .doc(userId)
    .set({ thumbnails });
});
```

---

## 📚 Ek Kaynaklar

- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [Google Cloud Pub/Sub Guide](https://cloud.google.com/pubsub/docs)
- [Cloud Functions Pricing](https://firebase.google.com/pricing)
- [Event-Driven Architecture](https://cloud.google.com/architecture/event-driven-architecture)

---

## 📄 Lisans

MIT License

Detaylar için `LICENSE` dosyasına bakın.

---

## 🎓 Öğrenme Yolu

1. ✅ Topic oluşturmayı öğrenin
2. ✅ Publish fonksiyonlarını test edin
3. ✅ Trigger fonksiyonlarını anlayın
4. ✅ Local emulator'da test edin
5. ✅ Deploy edip production'da izleyin
6. 🚀 Kendi projelerinizde kullanın!

**Happy Coding! 🎉**
