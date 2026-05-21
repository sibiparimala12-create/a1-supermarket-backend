const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const registrationToken = 'fKNE3slhSu-jPP_ahJsXx8:APA91bHBB5Tu1smFVJBvy7Ydcu9hJmnsuetndLwAUYaYZMViJIhDD2vkPyCWd0CbVWm3DsmPYO75fXTVFZ0q77UDaXApEH1VZ-Vx_kZQsdh-ADet25g0Xjk';

const message = {
    notification: {
        title: 'Diagnostic Test',
        body: 'Testing FCM connectivity from backend'
    },
    token: registrationToken
};

admin.messaging().send(message)
    .then((response) => {
        console.log('Successfully sent message:', response);
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error sending message:', error);
        process.exit(1);
    });
