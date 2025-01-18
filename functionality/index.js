const WEBSOCKET_SCHEME = 'ws';
const WEBSOCKET_SERVER = 'localhost';
const WEBSOCKET_PORT = 8080;
const WEBSOCKET_URL = `${WEBSOCKET_SCHEME}://${WEBSOCKET_SERVER}:${WEBSOCKET_PORT}`;

const leaderboard = document.getElementById('load-leaderboard');
leaderboard.addEventListener('click', () => {
    const socket = new WebSocket(WEBSOCKET_URL);

    socket.addEventListener('open', () => {
        console.log(`%cConectado al servidor en ${WEBSOCKET_URL}`,  'color: #99ff00');

        const messageString = JSON.stringify({ type: 'consultWinners'});
        socket.send(messageString);
    });

    socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'winnersTable') {
            document.getElementById('leaderboard-content').innerHTML = message.content;
        }
        socket.close();
    });

    socket.addEventListener('close', () => {
        console.log('%cSe ha cerrado la conexión con el servidor WebSocket', 'color: #ee0000');
    });
});