const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FIREBASE_PROJECT_ID = "spesa-condivisa-f2f50";
const LIST_ID = "IL_TUO_LIST_ID"; // Sostituisci con l'ID della tua lista

exports.handler = async function (event, context) {
    try {
        // 1. Legge la lista spesa da Firestore
        const listUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/shopping_lists/${LIST_ID}`;
        const listRes = await fetch(listUrl);
        const listData = await listRes.json();

        const toBuyFields = listData.fields?.toBuy?.arrayValue?.values || [];
        const toBuyItems = toBuyFields.map(v => v.stringValue);

        // Se la lista è vuota, esce senza fare nulla
        if (toBuyItems.length === 0) {
            return { statusCode: 200, body: JSON.stringify({ message: "Lista vuota." }) };
        }

        // 2. Legge dinamicamente tutti gli utenti registrati da Firestore
        const usersUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users_spesa`;
        const usersRes = await fetch(usersUrl);
        const usersData = await usersRes.json();

        // Estrae tutte le email presenti nel database degli utenti
        const recipients = [];
        if (usersData.documents) {
            usersData.documents.forEach(doc => {
                const email = doc.fields?.email?.stringValue;
                if (email) recipients.push(email);
            });
        }

        if (recipients.length === 0) {
            console.log("Nessun destinatario trovato nel database.");
            return { statusCode: 200, body: JSON.stringify({ message: "Nessuna email trovata." }) };
        }

        // 3. Invia l'email dinamica a tutto il gruppo
        const listHtml = toBuyItems.map(item => `<li><strong>${item}</strong></li>`).join('');

        await resend.emails.send({
            from: 'SpesaWeb <onboarding@resend.dev>',
            to: recipients, // Array dinamico di email estratte da Firestore
            subject: `🛒 Ci sono ${toBuyItems.length} articoli da comprare!`,
            html: `
                <h2>Promemoria Spesa delle 17:00 🛒</h2>
                <p>Ecco gli articoli attualmente presenti nella lista <strong>"Da comprare"</strong>:</p>
                <ul>${listHtml}</ul>
                <p><a href="https://tuo-sito.netlify.app">Apri SpesaWeb</a></p>
            `
        });

        return { statusCode: 200, body: JSON.stringify({ message: "Promemoria inviato ai membri del gruppo!" }) };
    } catch (error) {
        console.error("Errore funzione 17:00:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};