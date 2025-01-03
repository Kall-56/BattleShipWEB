let shipsSend = false;
let gameJoined = false;

let lastOpponentClicked = '';
let players = [];

function sendMessage(socket, message) {
    const messageString = JSON.stringify(message);
    socket.send(messageString);
}

function enableReadyBt() {
    return !(shipsSend && gameJoined);
}

function changeMessage(message) {
    document.getElementById('messages').innerText = message;
}

function disableGameBts(disable) {
    document.getElementById('create-game').disabled = disable;
    document.getElementById('join-game').disabled = disable;
    document.getElementById('game-id').disabled = disable;
}

function handleUserRegistration() {
    document.getElementById('username').disabled = true;
    document.getElementById('submit-user').disabled = true;

    document.getElementById('send-ships').disabled = false;
    disableGameBts(false);
    changeMessage('Your user has been registered');

    players.push(document.getElementById('username').value);
}

function handleFleetEstablished() {
    shipsSend = true;
    document.getElementById('send-ships').disabled = true;
    document.getElementById('ready').disabled = enableReadyBt();
    changeMessage('Your fleet has been established');
}

function handleGameCreation(gameId) {
    gameJoined = true;
    document.getElementById('game-id').value = gameId;
    document.getElementById('leave-game').disabled = false;
    disableGameBts(true);
    document.getElementById('ready').disabled = enableReadyBt();
    changeMessage(`Game created. ID: ${gameId}`);
}

function handleJoinGame(playerNames, playerCount) {
    gameJoined = true;
    disableGameBts(true);
    document.getElementById('opponent-boards').setAttribute('class', `players-${playerCount}`);
    document.getElementById('leave-game').disabled = false;
    document.getElementById('ready').disabled = enableReadyBt();

    for (let nameInd in playerNames) {
        if (!players.includes(playerNames[nameInd])) {
            players.push(playerNames[nameInd]);
        }
    }
    changeMessage('Someone joined the game lobby');
}

function handleWait() {
    document.getElementById('ready').disabled = true;
    changeMessage('Waiting for players to be ready...');
}

function handleGameStart(turn) {
    document.getElementById('ready').disabled = true;
    document.getElementById('send-move').disabled = false;
    document.getElementById('player-turn').innerText = turn;
    changeMessage('Game started!');

}

function handleMove(move, hit, opponentName, turn) {
    const oppIndex = players.indexOf(opponentName);
    let hitClass = 'miss';
    if (hit) {
        hitClass = 'hit';
    }
    document.getElementById(`p${oppIndex + 1}@${move}`).classList.add(hitClass);
    document.getElementById('player-turn').innerText = turn;
    changeMessage(`${opponentName} has been attacked at: ${move} (${hit})`);

}

// Maneja los mensajes recibidos
function handleMessage(message) {
    switch (message.type) {
        case 'registered':
            handleUserRegistration();
            break;
        case 'fleetEstablished':
            handleFleetEstablished();
            break;
        case 'gameCreated':
            handleGameCreation(message.gameId);
            break;
        case 'playerJoined':
            handleJoinGame(message.playerNames, message.playerCount);
            break;
        case 'wait':
            handleWait();
            break;
        case 'gameStarted':
            handleGameStart(message.turn);
            break;
        case 'move':
            handleMove(message.move, message.hit, message.opponentName, message.turn);
            break;
        case 'leftGame':
            break;
        case 'playerLeft':
            break;
        case 'error':
            changeMessage(message.message);
            break;
        default:

    }
}

// Constantes que definen el URL del servidor WebSocket
const WEBSOCKET_SCHEME = 'ws';
const WEBSOCKET_SERVER = 'localhost';
const WEBSOCKET_PORT = 8080;
const WEBSOCKET_URL = `${WEBSOCKET_SCHEME}://${WEBSOCKET_SERVER}:${WEBSOCKET_PORT}`;

const socket = new WebSocket(WEBSOCKET_URL);
socket.addEventListener('open', () => {
    console.log(`%cConectado al servidor en ${WEBSOCKET_URL}`,  'color: #99ff00');
    document.getElementById('username').disabled = false;
    document.getElementById('submit-user').disabled = false;
});

socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    handleMessage(message);
    //document.getElementById('messages').innerText = event.data;
});

socket.addEventListener('close', () => {
    console.log('%cSe ha cerrado la conexión con el servidor WebSocket', 'color: #ee0000');

    disableButtons(true);

    const closeButton = document.getElementById('close-connection');
    closeButton.remove();
});

// DOM -----------------------------------------------------------------------------------------------------------------
// Lógica para obtener las posiciones de los barcos
function obtainShips() {
    const ships = [];
    const playerBoard = document.getElementById('board-p1');
    const positions = playerBoard.querySelectorAll('div');

    const shipsNames = ['carrier', 'destroyer', 'cruiser', 'submarine', 'battleship'];
    for (let shipInd in shipsNames) {
        const nameSearch = shipsNames[shipInd];

        const shipPositions = [];
        positions.forEach((pos) => {
            if (pos.firstElementChild) {
                if (pos.firstElementChild.id === nameSearch) {
                    shipPositions.push(pos.id.split('@')[1]);
                }
            }
        });
        if (shipPositions.length > 0) {
            ships.push(shipPositions);
        }
    }
    return ships;
}

function disableButtons(disable) {
    const buttons = document.getElementsByClassName('server-operation');
    [...buttons].forEach((button) => {
        button.disabled = disable;
    });

    document.getElementById('username').disabled = disable;
    document.getElementById('game-id').disabled = disable;
    document.getElementById('move').disabled = disable;
}

function obtainGameId() {
    return document.getElementById('game-id').value;
}

disableButtons(true);

const submitUsername = document.getElementById('submit-user');
submitUsername.addEventListener('click', () => {
    const userName = document.getElementById('username').value;
    if (userName !== '') {
        sendMessage(socket, { type: 'register', userName });
    } else {
        alert('Introduzca un nombre de usuario');
    }
});

const createGame = document.getElementById('create-game');
createGame.addEventListener('click', () => {
    sendMessage(socket, { type: 'create' });
});

const joinGame = document.getElementById('join-game');
joinGame.addEventListener('click', () => {
    sendMessage(socket, { type: 'join', gameId: obtainGameId() });
});

const sendFleet = document.getElementById('send-ships');
sendFleet.addEventListener('click', () => {
    const ships = obtainShips();

    if (ships.length !== 5) {
        alert('Place all the ships before sending them!');
    }
    else {
        sendMessage(socket, { type: 'ships', ships });
    }
});

const ready = document.getElementById('ready');
ready.addEventListener('click', () => {
    sendMessage(socket, { type: 'start', gameId: obtainGameId() });
});

const sendMove = document.getElementById('send-move');
sendMove.addEventListener('click', () => {
    const move = document.getElementById('move').value;
    sendMessage(socket, { type: 'move', gameId: obtainGameId(), move, opponentIndex: (lastOpponentClicked - 1) });
});

const leaveGame = document.getElementById('leave-game');
leaveGame.addEventListener('click', () => {
    sendMessage(socket, { type: 'leave', gameId: obtainGameId() });
});

const closeConnection = document.getElementById('close-connection');
closeConnection.addEventListener('click', () => {
    const response = confirm('¿Estás seguro de que deseas cerrar la conexión con el servidor de WebSocket?\n\n' +
        'Si la cierras, no podrás enviar ni recibir más mensajes y, de acuerdo a esta implementación, tendrás que recargar la página.');

    if (response) {
        socket.close();
    }
});

const opponentBoards = [...document.getElementsByClassName('board opponent')];
for (let i = 0; i < opponentBoards.length; i++) {
    const positions = opponentBoards[i].querySelectorAll('.pos');
    positions.forEach((pos) => {
        const idMove = pos.id.split('@')[1];
        if (idMove) {
            pos.addEventListener('click', () => {
                document.getElementById('move').value = idMove;
                lastOpponentClicked = pos.id.split('@')[0][1] // Because the format is: p{}@{}
                sendMessage(socket, { type: 'move', gameId: obtainGameId(), move: idMove, opponentName: players[lastOpponentClicked - 1] });
            });
        }
    });
}
