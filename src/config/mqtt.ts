import mqtt, { MqttClient } from "mqtt";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();
import { create_metric_socket } from "../controllers/metricController";

// MQTT broker URL
const brokerUrl = process.env.BROKER_URL || "";

// MQTT client options
const options: mqtt.IClientOptions = {
  clientId: "main-server",
  clean: true,
  connectTimeout: 4000,
  keepalive: 60,
  username: "vidyutkavach",
  password: "Ka8J12pH12vG",
  reconnectPeriod: 2000,
  rejectUnauthorized: false,
  ca: fs.readFileSync("./src/config/certificates/ca.crt"),
  key: fs.readFileSync("./src/config/certificates/client.key"),
  cert: fs.readFileSync("./src/config/certificates/client.crt"),
};

// Create MQTT client
const client: MqttClient = mqtt.connect(brokerUrl, options);

// MQTT client event handlers
client.on("connect", () => {
  console.log("Connected to MQTT broker");
  // Subscribe to a topic
  client.subscribe("test", (err) => {
    if (err) {
      console.error("Subscription error:", err);
    } else {
      console.log("Subscribed to topic");
    }
  });
});

client.on("message", (topic, message) => {
  console.log(`Received message on topic ${topic}: ${message.toString()}`);
  create_metric_socket(message);
});

// MQTT client error handler
client.on("error", (err) => {
  console.error("MQTT client error:", err);
});

// MQTT client close handler
client.on("close", () => {
  console.log("MQTT client connection closed");
});

// MQTT client offline handler
client.on("offline", () => {
  console.log("MQTT client is offline");
});

// MQTT client reconnect handler
client.on("reconnect", () => {
  console.log("MQTT client reconnecting...");
});

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
