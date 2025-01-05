import { createGameBoards } from "./game.js";
import { eliminateListeners } from "./game.js";
import { initializeShips } from "./game.js";

let shipsSend = false;
let gameJoined = false;
let actualGameId = '';

let players = [];
let amountPlayers = 1;

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

    const name = document.getElementById('username').value;
    document.getElementById('user-name').innerText = name;
    players.push(name);
}

function handleFleetEstablished() {
    shipsSend = true;
    document.getElementById('ready').disabled = enableReadyBt();
    changeMessage('Your fleet has been established');
}

function handleGameCreation(gameId) {
    gameJoined = true;
    actualGameId = gameId;
    document.getElementById('game-id').value = gameId;
    document.getElementById('leave-game').disabled = false;
    disableGameBts(true);
    document.getElementById('ready').disabled = enableReadyBt();
    changeMessage(`Game created. ID: ${gameId}`);
}

function handleJoinGame(gameId, playerNames, playerCount) {
    gameJoined = true;
    actualGameId = gameId;
    amountPlayers = playerCount;
    disableGameBts(true);
    document.getElementById('leave-game').disabled = false;
    document.getElementById('ready').disabled = enableReadyBt();

    for (let name of playerNames) {
        if (!players.includes(name)) {
            players.push(name);
        }
    }
    changeMessage(`${playerNames[playerCount-1]} joined the game lobby`);
}

function handleWait() {
    document.getElementById('ready').disabled = true;
    changeMessage('Waiting for players to be ready...');
}

function handleGameStart(turn) {
    document.getElementById('ready').disabled = true;
    document.getElementById('turn-user').innerText = turn;
    changeMessage('Game started!');

    createGameBoards(amountPlayers);
    document.querySelector('.user-side').appendChild(document.getElementById('messages'));
    document.getElementById('leave-space').appendChild(document.getElementById('leave-game'));
    document.getElementById('leave-space').appendChild(document.getElementById('close-connection'));

    document.getElementById('ship-side').style.display = 'none';
    document.querySelector('.user-side').style.display = 'flex';
    document.querySelector('.game-side').style.display = 'flex';
    document.getElementById('turn-ui').style.display = 'block';
    eliminateListeners();


    const opponentBoards = [...document.getElementsByClassName('table opponent')];
    for (let i = 0; i < opponentBoards.length; i++) {
        const positions = opponentBoards[i].querySelectorAll('.cell');
        positions.forEach((pos) => {
            const idMove = pos.id.split('@')[1];
            if (idMove) {
                pos.addEventListener('click', () => {
                    sendMessage(socket, { type: 'move', gameId: actualGameId, move: idMove, opponentName: players[pos.id.split('@')[0][1] - 1] });
                });
            }
        });
    }
}

function handleMove(move, hit, opponentName, turn) {
    const oppIndex = players.indexOf(opponentName);
    // Hacer algo con estas clases para poder visualizarlo en el tablero
    let hitClass = 'miss';
    if (hit) {
        hitClass = 'hit';
    }
    document.getElementById(`p${oppIndex + 1}@${move}`).classList.add(hitClass);

    // Cambiar el DOM para mostrar a quién le toca ahora
    document.getElementById('turn-user').innerText = turn;
    changeMessage(`${opponentName} has been attacked at: ${move} (${hit})`);

}

function handleGameFinished(winner) {
    // Mostrar quien es el ganador
    changeMessage(`${winner} win the battle!`);
    const userResponse = confirm("Play another game?");
    // Si sí: borrar tableros, abandonar la partida, vaciar [players] y volver a mostrar la pantalla de posicionamiento, reiniciando también
    //    el [actualGameId], [shipsSend] y [amountPlayers]. Solo habilitar botones para [unirse], [crear], [mandar flota]
    if (userResponse) {
        resetGame();
    } else {
        window.location.href = "../index.html";
    }
}

function resetGame() {
    const elsShip = document.querySelectorAll('.ship');
    const wareHouse = document.querySelector('.ship-warehouse');
    elsShip.forEach(function (item) {
        if (item.tagName !== "DIV") {
            wareHouse.appendChild(item);
            item.style.position = 'relative';
            item.style.left = 'auto';
            item.style.bottom = 'auto';
            item.style.top = 'auto';
        } else {
            item.remove();
        }
    });
    const opponents = document.getElementById('opponents-space').childNodes;
    opponents.forEach(function (item) {
        item.remove();
    });
    const playerCells = document.getElementById('player-space').childNodes;
    playerCells.forEach(function (item) {
        item.remove();
    });

    initializeShips();

    document.getElementById('carrier').style.maxWidth = '15rem';
    document.getElementById('battleship').style.maxWidth = '12rem';
    document.getElementById('cruiser').style.maxWidth = '9rem';
    document.getElementById('submarine').style.maxWidth = '9rem';
    document.getElementById('destroyer').style.maxWidth = '6rem';

    document.getElementById('main-options').appendChild(document.getElementById('leave-game'));
    document.getElementById('main-options').appendChild(document.getElementById('close-connection'));
    document.getElementById('ship-side').style.display = 'flex';
    document.querySelector('.user-side').style.display = 'none';
    document.querySelector('.game-side').style.display = 'none';
    document.getElementById('turn-ui').style.display = 'none';
}

function handleGameLost(message) {
    changeMessage(`End of the Game, You lost`);
    const userResponse = confirm("Play another game?");
    if (userResponse) {
        resetGame();
    } else {
        window.location.href = "../index.html";
    }
}

function handleLeftGame() {
    const userResponse = confirm("Play another game?");
    if (userResponse) {
        resetGame();
    } else {
        window.location.href = "../index.html";
    }
}

function handlePlayerLeft(playerCount, playerName, turn) {
    changeMessage(`${playerName} has left the game`);
    document.getElementById('turn-user').innerText = turn;
    for (let i = 0; i < playerCount; i++) {
        if (players[i].includes(name)) {
            players[i].pop();
        }
    }
    // Borrar el tablero del jugador que se fue
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
            handleJoinGame(message.gameId, message.playerNames, message.playerCount);
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
        case 'gameFinished':
            handleGameFinished(message.winner);
            break;
        case 'gameLost':
            handleGameLost(message.message);
            break;
        case 'leftGame':
            handleLeftGame();
            break;
        case 'playerLeft':
            handlePlayerLeft(message.playerCount, message.playerName, message.turn);
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
});

socket.addEventListener('close', () => {
    console.log('%cSe ha cerrado la conexión con el servidor WebSocket', 'color: #ee0000');

    const closeButton = document.getElementById('close-connection');
    closeButton.remove();

    // Mandarlo a [Home Menu]
});

// DOM -----------------------------------------------------------------------------------------------------------------
function obtainShips() {
    const ships = [];
    const shipsNames = ['carrier', 'destroyer', 'cruiser', 'submarine', 'battleship'];

    shipsNames.forEach(shipName => {
        const shipElement = document.getElementById(shipName);
        if (!shipElement || !shipElement.shipInstance) {
            console.error(`Ship not found: ${shipName}`);
            return [];
        }

        const positions = shipElement.shipInstance.cellList.map(cell => cell.id.split('@')[1]);
        if (positions.length === 0) {
            console.error('Set up all your ships on the board!');
            return [];
        }
        ships.push(positions);
    });
    return ships;
}

function disableButtons(disable) {
    const buttons = document.getElementsByClassName('server-operation');
    [...buttons].forEach((button) => {
        button.disabled = disable;
    });

    document.getElementById('username').disabled = disable;
    document.getElementById('game-id').disabled = disable;
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
