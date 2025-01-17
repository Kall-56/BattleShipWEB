import { createGameBoards } from "./game.js";
import { eliminateListeners } from "./game.js";
import { initializeShips } from "./game.js";

let shipsSend = false;
let gameJoined = false;
let actualGameId = '';
let actualUser = '';
let actualShips = {};

let actualPowerUp = null;
const powerUps = {
    shield: { // Solo 1 uso
        enable: true,
        turnsActive: 0, // max 3
    },
    missiles: {
        turnsWait: 0, // max 5
    },
    repaired: [], // Solo 1 uso por barco
    emp: {
        turnsWait: 0, // max 10
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

    document.getElementById('total-points').textContent = '0';
    document.querySelector('.user-side').appendChild(document.getElementById('messages'));
    document.getElementById('leave-space').appendChild(leaveGame);
    document.getElementById('leave-space').appendChild(closeConnection);

    document.getElementById('ship-side').style.display = 'none';
    document.querySelector('.user-side').style.display = 'flex';
    document.querySelector('.game-side').style.display = 'flex';
    document.getElementById('turn-ui').style.display = 'block';

    eliminateListeners();

    for (let i = 1; i < amountPlayers; i++) {
        const opponentSpan = document.getElementById(`p${i + 1}-name`);
        opponentSpan.textContent = players[i];

        opponentSpan.addEventListener('click', () => {
            if (actualPowerUp === 'aircraftAttack') {
                sendMessage(socket, {
                    type: 'powerUp',
                    gameId: obtainGameId(),
                    powerupData: { type: 'attackAircraft', cost: 10, opponent: players[i]} });
                actualPowerUp = null;
                resetClassBt();
            } else if (actualPowerUp === 'empAttack' && powerUps.emp.turnsWait === 0) {
                sendMessage(socket, {
                    type: 'powerUp',
                    gameId: obtainGameId(),
                    powerupData: { type: 'emp', cost: 25, opponent: players[i]} });
                actualPowerUp = null;
                resetClassBt();
            } else if (actualPowerUp !== null) {
                changeMessage('Cannot use powerUp');
            }
        })
    }

    const ships = [...document.getElementsByClassName('ship')];
    for (let ship of ships) {
        ship.addEventListener('click', () => {
            if (!actualPowerUp) { return; }
            const shipName = ship.id;
            if (actualPowerUp === 'quickRepair' && !powerUps.repaired.includes(shipName)) {
                sendMessage(socket, {
                    type: 'powerUp',
                    gameId: obtainGameId(),
                    powerupData: { type: 'repair', cost: 10, shipName, shipCells: actualShips[shipName]} });
                actualPowerUp = null;
                resetClassBt();
            } else {
                changeMessage('Cannot use powerUp');
            }
        });
    }

    const playerBoard = document.getElementById('player-space');
    playerBoard.addEventListener('click', (event) => {
        const pos = event.target.closest('.cell');
        if (!pos) { return; }

        const idPos = pos.id.split('@')[1];
        if (!idPos) { return; }
        if (!actualPowerUp) { return; }
        if (actualPowerUp === 'seaMine') {
            if (!(pos.classList.contains('over') || pos.classList.contains('miss'))) {
                sendMessage(socket, {
                    type: 'powerUp',
                    gameId: obtainGameId(),
                    powerupData: {type: 'mine', cost: 5, cell: idPos}
                });
                actualPowerUp = null;
                resetClassBt();
            } else {
                changeMessage('You cannot place a mine there!');
            }
        } else if (actualPowerUp === 'defensiveShield' && powerUps.shield.enable) {
            sendMessage(socket, {
                type: 'powerUp',
                gameId: obtainGameId(),
                powerupData: { type: 'shield', cost: 15, cell: idPos} });
            actualPowerUp = null;
            resetClassBt();
        } else {
            changeMessage('Cannot use powerUp');
        }
    });
    // Se le coloca el evento al tablero (padre de las celdas) y se aprovecha el bubbling
    const opponentBoards = document.querySelectorAll('.table.opponent');
    opponentBoards.forEach((board) => {
        board.addEventListener('click', (event) => {
            const pos = event.target.closest('.cell');
            if (!pos) { return; }

            const idMove = pos.id.split('@')[1];
            if (!idMove) { return; }
            if (actualPowerUp === null) {
                if (!(pos.classList.contains('hit') || pos.classList.contains('miss'))) {
                    sendMessage(socket, {
                        type: 'move',
                        gameId: actualGameId,
                        move: idMove,
                        opponentName: players[pos.id.split('@')[0][1] - 1]
                    });
                } else {
                    changeMessage('You cannot attack there!');
                }
            } else if (actualPowerUp === 'cruiseMissile' && powerUps.missiles.turnsWait === 0) {
                sendMessage(socket, {
                    type: 'powerUp',
                    gameId: obtainGameId(),
                    powerupData: { type: 'missiles', cost: 15, cell: idMove, opponent: players[pos.id.split('@')[0][1] - 1]} });
                actualPowerUp = null;
                resetClassBt();
            } else {
                changeMessage('Cannot use powerUp');
            }
        });
    });
}

function handleMove(move, hit, opponentName, turn, points) {
    document.getElementById('total-points').textContent = points;
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

function handlePowerUp(powerupData, turn) {
    document.getElementById('turn-user').innerText = turn;
    document.getElementById('total-points').textContent = powerupData.points;

    switch (powerupData.type) {
        case 'sonar':
            changeMessage(`There's a ship at: ${powerupData.cell} on ${powerupData.opponent}'s sea!`);
            break;
        case 'aircraftAttack':
            changeMessage(powerupData.message);
            break;
        case 'shield':
            changeMessage(powerupData.message);
            if (powerupData.placingCells) {
                placeDefenseCells(powerupData.cells);
            }
            break;
        case 'missiles':
            changeMessage(powerupData.message);
            break;
        case 'mine':
            changeMessage(powerupData.message);
            break;
        case 'repair':
            repairCells(powerupData.player, powerupData.repairedCells);
            changeMessage(powerupData.message);
            break;
        case 'emp':
            changeMessage(powerupData.message);
            break;
        case 'none':
            changeMessage('A PowerUp has been used!');
            break;
    }
}

function handlePowerupStatus() {
    if (powerUps.shield.turnsActive > 0) {
        powerUps.shield.turnsActive--;
    }
    if (powerUps.missiles.turnsWait > 0) {
        powerUps.missiles.turnsWait--;
    }
    if (powerUps.emp.turnsWait > 0) {
        powerUps.emp.turnsWait--;
    }

    if (powerUps.shield.turnsActive >= 3) {
        shieldBt.disabled = true;
    } else if (powerUps.shield.turnsActive === 0) {
        raiseShields();
    }
    if (powerUps.missiles.turnsWait >= 5) {
        missilesBt.disabled = true;
    } else if (powerUps.missiles.turnsWait === 0) {
        missilesBt.disabled = false;
    }
    if (powerUps.emp.turnsWait >= 10) {
        empBt.disabled = true;
    } else if (powerUps.emp.turnsWait === 0) {
        empBt.disabled = false;
    }
}

function handlePowerupSuccess(message) {
    switch (message.powerup) {
        case 'shield':
            if (powerUps.shield.turnsActive === 0) {
                powerUps.shield.turnsActive = 4;
                powerUps.shield.enable = false;
            }
            break;
        case 'missiles':
            if (powerUps.missiles.turnsWait === 0) {
                powerUps.missiles.turnsWait = 6;
            }
            break;
        case 'emp':
            if (powerUps.emp.turnsWait === 0) {
                powerUps.emp.turnsWait = 11;
            }
            break;
        case 'repair':
            powerUps.repaired.push(message.shipName);
            break;
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
            handleMove(message.move, message.hit, message.opponentName, message.turn, message.points);
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
        case 'powerup':
            handlePowerUp(message.powerupData, message.turn);
            break;
        case 'powerupTurn':
            handlePowerupStatus();
            break;
        case 'powerupSuccess':
            handlePowerupSuccess(message);
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
function raiseShields() {
    sendMessage(socket, { type: 'raiseShields' });
    const defenseCells = [...document.getElementsByClassName('defense')];
    defenseCells.forEach((cell) => cell.classList.remove('defense'));
}

function placeDefenseCells(cells) {
    for (let cell of cells) {
        document.getElementById(`p1@${cell}`).classList.add('defense');
    }
}

function repairCells(playerName, repairedCells) {
    const pIndex = players.indexOf(playerName);

    for (let cell of repairedCells) {
        document.getElementById(`p${pIndex + 1}@${cell}`).setAttribute('class', 'cell');
        document.getElementById(`p${pIndex + 1}@${cell}`).classList.add('repaired');
    }
}

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
    actualShips = ships;

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
function resetClassBt() {
    for (let button of powerupButtons) {
        button.classList.remove('active');
    }
}

function powerupClickListener(button, powerup, message) {
    resetClassBt();
    if (actualPowerUp !== powerup) {
        actualPowerUp = powerup;
        changeMessage(message);
        button.classList.add('active');
    } else {
        actualPowerUp = null;
        changeMessage('PowerUp deselected');
        button.classList.remove('active');
    }
}

const sonarBt = document.getElementById('sonar');
sonarBt.addEventListener('click', () => {
    sendMessage(socket, {
        type: 'powerUp',
        gameId: obtainGameId(),
        powerupData: {type: 'sonar', cost: 5} });
});

const aircraftAttackBt = document.getElementById('attack-aircraft');
aircraftAttackBt.addEventListener('click', () => powerupClickListener(
    aircraftAttackBt,
    'aircraftAttack',
    'Attack Aircraft selected. Click an opponent name to attack it'
));

const mineBt = document.getElementById('sea-mine');
mineBt.addEventListener('click', () => powerupClickListener(
    mineBt,
    'seaMine',
    'Sea Mine selected. Click on a cell to place a mine'
));

const shieldBt = document.getElementById('defensive-shield');
shieldBt.addEventListener('click', () => powerupClickListener(
    shieldBt,
    'defensiveShield',
    'Defensive Shield selected. Click on a cell to activate it'
));

const missilesBt = document.getElementById('cruise-missile');
missilesBt.addEventListener('click', () => powerupClickListener(
    missilesBt,
    'cruiseMissile',
    'Cruise Missile selected. Click on a opponents cell to attack'
));

const repairBt = document.getElementById('quick-repair');
repairBt.addEventListener('click', () => powerupClickListener(
    repairBt,
    'quickRepair',
    'Quick Repair selected. Click on a ship to repair it'
));

const empBt = document.getElementById('emp-attack');
empBt.addEventListener('click', () => powerupClickListener(
    empBt,
    'empAttack',
    'EMP selected. Click on an opponent name to attack'
));

const powerupButtons = [aircraftAttackBt, mineBt, shieldBt, missilesBt, repairBt, empBt];