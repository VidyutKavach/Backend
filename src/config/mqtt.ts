import mqtt, { MqttClient } from "mqtt";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();
import { create_metric_socket } from "../controllers/metricController";

// MQTT client options
const options: mqtt.IClientOptions = {
  clientId: "main-server",
  clean: true,
  connectTimeout: 4000,
  keepalive: 60,
  username: process.env.BROKER_USERNAME,
  password: process.env.BROKER_PASS,
  reconnectPeriod: 2000,
};

// Create MQTT client
const client: MqttClient = mqtt.connect(process.env.BROKER_URL || "", options);

// MQTT client event handlers
client.on("connect", () => {
  console.log("Connected to MQTT broker");
  // Subscribe to a topic
  client.subscribe("iot_data", (err) => {
    if (err) {
      console.error("Subscription error:", err);
    } else {
      console.log("Subscribed to topic");
    }
  });
});

client.on("message", (topic, message) => {
  create_metric_socket(message);
});

// MQTT client error handler
client.on("error", (err) => {
  console.error("MQTT client error:", err);
});

// MQTT client close handler
// client.on("close", () => {
//   console.log("MQTT client connection closed");
// });

// // MQTT client offline handler
// client.on("offline", () => {
//   console.log("MQTT client is offline");
// });

// // MQTT client reconnect handler
// client.on("reconnect", () => {
//   console.log("MQTT client reconnecting...");
// });

// Publish a message after a delay
// setTimeout(() => {
//   const topic = "test";
//   const message = "Hello, MQTT!";
//   client.publish(topic, message, (err) => {
//     if (err) {
//       console.error("Publish error:", err);
//     } else {
//       console.log(`Published message on topic ${topic}: ${message}`);
//     }
//   });
// }, 2000);
