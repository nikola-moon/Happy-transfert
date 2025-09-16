// functions/send.js
const { kv } = require('@netlify/kv');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

// Liste des traitants avec leurs chat IDs Telegram
const traitants = [
  { nom: "Michael", numero: "0500567568", chatId: "6347791875" }, 
  { nom: "Traitant 2", numero: "+2250500000002", chatId: "222222222" },
  { nom: "Traitant 3", numero: "+2250700000003", chatId: "333333333" },
  { nom: "Traitant 4", numero: "+2250100000004", chatId: "444444444" }
];

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
    }

    // Récupérer les données du frontend
    const data = JSON.parse(event.body);
    const { telephone, forfait, montant, operateur, service } = data;

    if (!telephone || !forfait || !operateur) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Données manquantes' }) };
    }

    // Lire l'index de rotation depuis Netlify KV
    let indexRotation = await kv.get('indexRotation');
    if (indexRotation === null || isNaN(indexRotation)) {
      indexRotation = 0;
    } else {
      indexRotation = parseInt(indexRotation);
    }

    // Sélectionner le traitant suivant
    const traitant = traitants[indexRotation];

    // Mettre à jour l'index dans KV (rotation circulaire)
    const nextIndex = (indexRotation + 1) % traitants.length;
    await kv.set('indexRotation', nextIndex);

    // Générer un ID unique pour la commande
    const commandId = uuidv4();

    // Préparer le message Telegram
    const message = `
📲 *Nouvelle demande* (ID: ${commandId})
- Numéro client: ${telephone}
- Opérateur: ${operateur}
- Forfait: ${forfait}
${montant ? `- Montant: ${montant} FCFA` : ""}
${service ? `- Service: ${service}` : ""}
👉 *Envoyer paiement à*: ${traitant.nom} (${traitant.numero})
    `;

    // Envoyer le message via Telegram
    const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
    if (!TELEGRAM_TOKEN) {
      throw new Error("TELEGRAM_TOKEN n'est pas défini dans Netlify.");
    }

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: traitant.chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    const telegramResult = await response.json();
    if (!telegramResult.ok) {
      throw new Error(`Erreur Telegram: ${telegramResult.description}`);
    }

    // Logger l'assignment dans Netlify KV
    await kv.set(`assignment:${commandId}`, JSON.stringify({
      commandId,
      numero: telephone,
      operateur,
      forfait,
      montant,
      service,
      traitant: traitant.nom,
      traitantNumero: traitant.numero,
      timestamp: new Date().toISOString()
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Demande envoyée avec succès ✅',
        traitant: { nom: traitant.nom, numero: traitant.numero },
        commandId
      })
    };
  } catch (error) {
    console.error('Erreur serveur:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Erreur serveur' })
    };
  }
};
