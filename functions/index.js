// 'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

exports.sendPairingNotification = functions.database.ref('/dci/{dciNo}/latestRound').onWrite(event => {
    const original = event.data.val();
    console.log('Data to write: ', original !== null ? original.toString() : 'none');
    const dciNo = event.params.dciNo;

    // Get the list of device notification tokens.
    const getDeviceTokensRef = admin.database().ref(`/tokens/${dciNo}`).once('value');
    const getLatestRoundRef = admin.database().ref(`/dci/${dciNo}/latestRound`).once('value');
        //event.data.ref.parent.child('tokens');
    Promise.all([getDeviceTokensRef, getLatestRoundRef]).then(results => {
        const tokens = results[0].val();
        const round = results[1].val();

        // Check if there are any device tokens.
        // if (!tokensSnapshot.hasChildren()) {
        //     return console.log('There are no notification tokens to send to.');
        // }
        const payload = {
            notification: {
                title: 'Round #? has started!',
                body: `Your opponent is ${round.opponent} at table ${round.table}.`
            }
        };

        return admin.messaging().sendToDevice(tokens, payload).then(response => {
            // For each message check if there was an error.
            const tokensToRemove = [];
            response.results.forEach((result, index) => {
                const error = result.error;
                if (error) {
                    console.error('Failure sending notification to', tokens[index], error);
                    // Cleanup the tokens who are not registered anymore.
                    if (error.code === 'messaging/invalid-registration-token' ||
                        error.code === 'messaging/registration-token-not-registered') {
                        //tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
                    }
                }
            });
            return Promise.all(tokensToRemove);
        });
    });
});