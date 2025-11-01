'use strict';

const functions = require('firebase-functions/v1');
const { PubSub } = require('@google-cloud/pubsub');

const pubsub = new PubSub();

// ============================================================================
// PART 1: PUBLISHING MESSAGES TO TOPICS
// ============================================================================

// {PUBLISH_BASE64}
/**
 * HTTP Function to publish a message to a Pub/Sub topic
 * 
 * This demonstrates how to publish messages programmatically.
 * Use this to trigger other Pub/Sub functions.
 * 
 * Usage:
 * POST /publishMessage
 * Body: { "message": "Hello World" }
 */
exports.publishMessage = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, topic = 'your-topic-name' } = req.body;

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


// {PUBLISH_JSON}
/**
 * HTTP Function to publish JSON data to a topic
 * 
 * This demonstrates publishing structured data.
 * 
 * Usage:
 * POST /publishJson
 * Body: { "name": "John Doe", "email": "john@example.com" }
 */
exports.publishJson = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { topic = 'your-topic-name', data } = req.body;

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


// {PUBLISH_ATTRIBUTES}
/**
 * HTTP Function to publish a message with attributes
 * 
 * Attributes are useful for filtering and routing messages.
 * 
 * Usage:
 * POST /publishWithAttributes
 * Body: { 
 *   "message": "Hello",
 *   "priority": "high",
 *   "userId": "12345"
 * }
 */
exports.publishWithAttributes = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, topic = 'your-topic-name', attributes = {} } = req.body;

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


// ============================================================================
// PART 2: CONSUMING MESSAGES FROM TOPICS (TRIGGERS)
// ============================================================================

// {TRIGGER_BASE64}
/**
 * Cloud Function triggered by Pub/Sub that logs a message using the data published to the topic.
 * 
 * This function demonstrates how to:
 * - Set up a Pub/Sub trigger using onPublish()
 * - Decode base64 encoded message data
 * - Log messages to the Firebase console
 * 
 * When you use onPublish() in your code, Firebase automatically creates a subscription
 * for this function to the specified topic during deployment.
 * 
 * Usage:
 * 1. Deploy this function: firebase deploy --only functions:helloPubSub
 * 2. Publish a message to the 'your-topic-name' topic using:
 *    - publishMessage function above
 *    - gcloud CLI: gcloud pubsub topics publish your-topic-name --message "Hello"
 *    - Google Cloud Console
 * 
 * Note: The function will be triggered automatically when a message is published.
 */
exports.helloPubSub = functions.pubsub.topic('your-topic-name').onPublish((message) => {

  const messageBody = message.data ? Buffer.from(message.data, 'base64').toString() : null;

  functions.logger.log(`Hello ${messageBody || 'World'}!`);

  return null;
});

// {TRIGGER_JSON}
/**
 * Cloud Function triggered by Pub/Sub that logs a message using the data published to the
 * topic as JSON.
 * 
 * This function demonstrates:
 * - Handling JSON formatted messages
 * - Error handling for malformed JSON
 * - Accessing nested JSON properties
 * 
 * Usage:
 * Publish a JSON message to the 'your-topic-name' topic
 * 
 * Example message:
 * { "name": "John Doe", "email": "john@example.com" }
 * 
 * Note: Firebase automatically creates a subscription to 'your-topic-name' topic
 * when you deploy this function.
 */
exports.helloPubSubJson = functions.pubsub.topic('your-topic-name').onPublish((message) => {
  // {TRIGGER_JSON}
  // Get the `name` attribute of the PubSub message JSON body.
  let name = null;
  try {
    name = message.json.name;
  } catch (e) {
    functions.logger.error('PubSub message was not JSON', e);
  }

  // Print the message in the logs.
  functions.logger.log(`Hello ${name || 'World'}!`);

  return null;
});

// {TRIGGER_ATTRIBUTES}
/**
 * Cloud Function triggered by Pub/Sub that logs a message using the data attributes
 * published to the topic.
 * 
 * This function demonstrates:
 * - Using message attributes (metadata) instead of message body
 * - Working with Pub/Sub message attributes
 * 
 * Usage:
 * Publish a message with attributes to the 'your-topic-name' topic
 * 
 * Example (using gcloud):
 * gcloud pubsub topics publish your-topic-name \
 *   --message 'Hello' \
 *   --attribute name=Alice,priority=high
 * 
 * Note: Message attributes are useful for filtering and routing without parsing the body.
 */
exports.helloPubSubAttributes = functions.pubsub.topic('your-topic-name').onPublish((message) => {
  // {TRIGGER_ATTRIBUTES}
  // Get the `name` attribute of the message.
  const name = message.attributes.name;

  // Print the message in the logs.
  functions.logger.log(`Hello ${name || 'World'}!`);

  return null;
});

// {ADVANCED_EXAMPLE}
/**
 * Advanced Pub/Sub Example: Order Processing System
 * 
 * This demonstrates a more realistic use case:
 * - Process order data from JSON
 * - Validate required fields
 * - Perform different actions based on order type
 * - Structured logging
 * - Error handling
 * 
 * This is triggered automatically when you publish a message to the 'orders' topic.
 */
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

    switch (orderData.type) {
      case 'standard':
        functions.logger.info('Processing standard order');
        // Add your order processing logic here
        break;
      case 'express':
        functions.logger.info('Processing express order - priority handling');
        // Add your express order logic here
        break;
      case 'bulk':
        functions.logger.info('Processing bulk order - special pricing');
        // Add your bulk order logic here
        break;
      default:
        functions.logger.warn(`Unknown order type: ${orderData.type}`);
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));

    functions.logger.info(`Order ${orderData.orderId} processed successfully`);

    return { success: true, orderId: orderData.orderId };
  } catch (error) {
    functions.logger.error('Error processing order', error);
    return null;
  }
});
// {ADVANCED_EXAMPLE}
