const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FIREBASE_PROJECT_ID = "spesa-condivisa-f2f50";

exports.handler = async function (event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const body = JSON.parse(event.body);
        const { user, itemsCount, listName } = body;

        // 1. Recupera dinamicamente le email degli utenti da Firestore
        const usersUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users_spesa`;
        const usersRes = await fetch(usersUrl);
        const usersData = await usersRes.json();

        const recipients = [];
        if (usersData.documents) {
            usersData.documents.forEach(doc => {
                const email = doc.fields?.email?.stringValue;
                if (email) recipients.push(email);
            });
        }

        if (recipients.length === 0) {
            return { statusCode: 200, body: JSON.stringify({ message: "Nessun destinatario trovato." }) };
        }

        // 2. Invia l'email di notifica fine spesa a tutti gli utenti del DB
        await resend.emails.send({
            from: 'SpesaWeb <onboarding@resend.dev>',
            to: recipients,
            subject: `✅ Spesa completata da ${user}!`,
            html: `
                <h2>Spesa completata! 🎉</h2>
                <p>L'utente <strong>${user}</strong> ha appena premuto <em>FINE SPESA</em> ed ha archiviato <strong>${itemsCount} articoli</strong> per la lista <em>${listName}</em>.</p>
                <p>La lista "Da comprare" è stata svuotata.</p>
                <p><a href="https://tuo-sito.netlify.app">Apri SpesaWeb</a></p>
            `
        });

        return { statusCode: 200, body: JSON.stringify({ message: "Notifica fine spesa inviata al gruppo!" }) };
    } catch (error) {
        console.error("Errore notifica fine spesa:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};