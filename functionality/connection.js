import { createGameBoards } from "./game.js";
import { eliminateListeners } from "./game.js";
import { initializeShips } from "./game.js";

let shipsSend = false;
let gameJoined = false;
let actualGameId = '';
let actualUser = '';

const powerUps = {
    sonar: {
        cost: 5,
        enable: true,
    },
    attackAircraft: {
        cost: 10,
        enable: true,
    },
    mine: {
        cost: 5,
    },
    shield: {
        cost: 15,
        enable: true,
        turnsActive: 3,
    },
    missiles: {
        cost: 15,
        turnsWait: 5,
    },
    repair: {
        cost: 10,
        enable: true,
    },
    emp: {
        cost: 25,
        turnsWait: 10,
    }
}

let players = [];
let amountPlayers = 1;

function sendMessage(socket, message) {
    const messageString = JSON.stringify(message);
    socket.send(messageString);
}

function enableReadyBt() {
    ready.disabled = !(shipsSend && gameJoined);
}

function changeMessage(message) {
    document.getElementById('messages').innerText = message;
}

function disableGameBts(disable) {
    createGame.disabled = disable;
    joinGame.disabled = disable;
    document.getElementById('game-id').disabled = disable;
}

function handleUserRegistration() {
    document.getElementById('username').disabled = true;
    submitUsername.disabled = true;

    sendFleet.disabled = false;
    disableGameBts(false);
    changeMessage('Your user has been registered');

    const name = document.getElementById('username').value;
    document.getElementById('user-name').innerText = name;
    players.push(name);
    actualUser = name;
}

function handleFleetEstablished() {
    shipsSend = true;
    enableReadyBt();
    changeMessage('Your fleet has been established');
}

function handleGameCreation(gameId) {
    gameJoined = true;
    actualGameId = gameId;
    document.getElementById('game-id').value = gameId;
    leaveGame.disabled = false;
    disableGameBts(true);
    enableReadyBt();
    changeMessage(`Game created. ID: ${gameId}`);
}

function handleJoinGame(gameId, playerNames, playerCount) {
    gameJoined = true;
    actualGameId = gameId;
    amountPlayers = playerCount;
    disableGameBts(true);
    //enableReadyBt();
    leaveGame.disabled = false;

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

function changeBoardSize() {
    const elements = document.querySelectorAll('.opponent');
    if (elements.length === 1) {
        elements.forEach(el => {
            el.style.width = '60%';
            el.style.height = '85%';
        });
        document.getElementById('opponents-space').style.height = '100%';
    } else if (elements.length === 2) {
        elements.forEach(el => {
            el.style.width = '90%';
            el.style.height = '80%';
        });
        document.getElementById('opponents-space').style.height = '100%';
    } else {
        elements.forEach(el => {
            el.style.width = '60%';
            el.style.height = '85%';
        });
        elements[elements.length-1].style.width = '30%';
        elements[elements.length-1].style.height = '80%';
        document.getElementById('opponents-space').style.height = '50%';
    }
}

function boardSizeOnPlayerLeft() {
    const elements = document.querySelectorAll('.opponent');
    const elementsParent = document.querySelectorAll('.opponent-table');
    if (document.querySelector('.forth-player-side')) {
        elementsParent.forEach(el => {
            document.getElementById('opponents-space').appendChild(el);
        });
        document.querySelector('.forth-player-side').remove();
    }
    if (elements.length === 1) {
        elements.forEach(el => {
            el.style.width = '60%';
            el.style.height = '85%';
        });
        document.getElementById('opponents-space').style.height = '100%';
    } else if (elements.length === 2) {
        elements.forEach(el => {
            el.style.width = '90%';
            el.style.height = '80%';
        });
        document.getElementById('opponents-space').style.height = '100%';
    }
}

function handleGameStart(turn) {
    ready.disabled = true;
    document.getElementById('turn-user').innerText = turn;
    changeMessage('Game started!');

    createGameBoards(amountPlayers);
    changeBoardSize();

    document.querySelector('.user-side').appendChild(document.getElementById('messages'));
    document.getElementById('leave-space').appendChild(leaveGame);
    document.getElementById('leave-space').appendChild(closeConnection);

    document.getElementById('ship-side').style.display = 'none';
    document.querySelector('.user-side').style.display = 'flex';
    document.querySelector('.game-side').style.display = 'flex';
    document.getElementById('turn-ui').style.display = 'block';

    eliminateListeners();

    // Se le coloca el evento al tablero (padre de las celdas) y se aprovecha el bubbling
    const opponentBoards = document.querySelectorAll('.table.opponent');
    opponentBoards.forEach((board) => {
        board.addEventListener('click', (event) => {
            const pos = event.target.closest('.cell');
            if (!pos) { return; }

            const idMove = pos.id.split('@')[1];
            if (idMove && !(pos.classList.contains('hit') || pos.classList.contains('miss'))) {
                sendMessage(socket, {
                    type: 'move',
                    gameId: actualGameId,
                    move: idMove,
                    opponentName: players[pos.id.split('@')[0][1] - 1]
                });
            } else {
                changeMessage('You cannot attack there!');
            }
        });
    });
}

function handleMove(move, hit, opponentName, turn) {
    const oppIndex = players.indexOf(opponentName);

    // Clases para identificar un hit o miss
    let hitClass = 'miss';
    if (hit) {
        hitClass = 'hit';
    }

    document.getElementById(`p${oppIndex + 1}@${move}`).classList.add(hitClass);
    document.getElementById('turn-user').innerText = turn;
    changeMessage(`${opponentName} has been attacked at: ${move} (${hit})`);

}

function handleGameFinished(winner) {
    changeMessage(`${winner} won the battle!`);

    resetGame();
    shipsSend = false;
    enableReadyBt();
    disableGameBts(true);
}

function resetGame() {
    for (let i = 0; i < players.length; i++) {
        if (players[i] === -1) {
            players.splice(i, 1);
        }
    }
    console.log(players);

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
    const opponents = [...document.getElementById('opponents-space').children];
    opponents.forEach((item) => { item.remove(); });

    const playerCells = [...document.getElementById('player-space').children];
    playerCells.forEach((item) => { item.remove(); });

    document.getElementById('board-p1').remove();
    if (document.querySelector('.forth-player-side')) {
        document.querySelector('.forth-player-side').remove();
    }
    document.getElementById('opponents-space').style.height = 'auto';

    initializeShips();

    document.getElementById('carrier').style.maxWidth = '15rem';
    document.getElementById('battleship').style.maxWidth = '12rem';
    document.getElementById('cruiser').style.maxWidth = '9rem';
    document.getElementById('submarine').style.maxWidth = '9rem';
    document.getElementById('destroyer').style.maxWidth = '6rem';

    document.getElementById('main-options').appendChild(leaveGame);
    document.getElementById('main-options').appendChild(closeConnection);
    document.getElementById('options').appendChild(document.getElementById('messages'));

    document.getElementById('ship-side').style.display = 'flex';
    document.querySelector('.user-side').style.display = 'none';
    document.querySelector('.game-side').style.display = 'none';
    document.getElementById('turn-ui').style.display = 'none';
}

function handleGameLost(message) {
    changeMessage(message);
}

function handleLeftGame(started) {
    players = [];
    players.push(actualUser);
    if (started) {
        resetGame();
    }
    shipsSend = false;
    gameJoined = false;
    enableReadyBt();
    disableGameBts(false);
    leaveGame.disabled = true;
    changeMessage('You left the lobby!');
}

function handlePlayerLeft(playerCount, playerName, started, turn) {
    changeMessage(`${playerName} has left the game`);
    document.getElementById('turn-user').innerText = turn;

    amountPlayers--;

    const playerIndex = players.indexOf(playerName);
    if (started) {
        // Borrar el tablero del jugador que se fue
        console.log(document.getElementById(`board-p${playerIndex + 1}`).parentElement);
        console.log(document.getElementById('hijo: '));
        console.log(document.getElementById(`board-p${playerIndex + 1}`));
        document.getElementById(`board-p${playerIndex + 1}`).parentElement.remove();
        // Reemplazar el string del jugador para poder quitarlo al finalizar el juego
        // De mientras, dejarlo como -1 para mantener los índices de los otros jugadores
        players = players.with(playerIndex, -1);
        boardSizeOnPlayerLeft();
    } else {
        players.splice(playerIndex, 1);
        enableReadyBt();
    }
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
            handleLeftGame(message.started);
            break;
        case 'playerLeft':
            handlePlayerLeft(message.playerCount, message.playerName, message.started, message.turn);
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

    window.location.href = '../index.html';
});

// DOM -----------------------------------------------------------------------------------------------------------------
function obtainShips() {
    const ships = {};
    const shipsNames = ['carrier', 'destroyer', 'cruiser', 'submarine', 'battleship'];

    shipsNames.forEach(shipName => {
        const shipElement = document.getElementById(shipName);
        if (!shipElement || !shipElement.shipInstance) {
            console.error(`Ship not found: ${shipName}`);
            return {};
        }

        const positions = shipElement.shipInstance.cellList.map(cell => cell.id.split('@')[1]);
        if (positions.length === 0) {
            console.error('Set up all your ships on the board!');
            return {};
        }
        ships[shipName] = positions;
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

    if (!ships) {
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
    const response = confirm('Are you sure you do not want to continue playing?\n' +
        'To play again just select "multiplayer" on the home menu');

    if (response) {
        socket.close();
    }
});

// POWERUPS ------------------------------------------------------------------------------------------------------------
const sonarBt = document.getElementById('sonar');
sonarBt.addEventListener('click', () => {});

const aircraftAttackBt = document.getElementById('attack-aircraft');
aircraftAttackBt.addEventListener('click', () => {});

const mineBt = document.getElementById('sea-mine');
mineBt.addEventListener('click', () => {});

const shieldBt = document.getElementById('defensive-shield');
shieldBt.addEventListener('click', () => {});

const missilesBt = document.getElementById('cruise-missile');
missilesBt.addEventListener('click', () => {});

const repairBt = document.getElementById('quick-repair');
repairBt.addEventListener('click', () => {});

const empBt = document.getElementById('emp-attack');
empBt.addEventListener('click', () => {});
