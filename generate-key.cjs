const crypto = require("crypto");
const fs = require("fs");

const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
  publicKeyEncoding: {
    type: "spki",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem",
  },
});

fs.writeFileSync("gmgn_public.pem", publicKey);
fs.writeFileSync("gmgn_private.pem", privateKey);

console.log("✅ Keys generated!");
console.log("📄 gmgn_public.pem");
console.log("🔐 gmgn_private.pem");
console.log("\nPublic Key:");
console.log(publicKey);
