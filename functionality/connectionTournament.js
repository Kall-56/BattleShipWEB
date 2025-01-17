// Constantes que definen el URL del servidor WebSocket
const WEBSOCKET_SCHEME = 'ws';
const WEBSOCKET_SERVER = 'localhost';
const WEBSOCKET_PORT = 8080;
const WEBSOCKET_URL = `${WEBSOCKET_SCHEME}://${WEBSOCKET_SERVER}:${WEBSOCKET_PORT}`;

function sendMessage(socket, message) {
    const messageString = JSON.stringify(message);
    socket.send(messageString);
}

let gameJoined = false;
let actualId = '';
let actualUser = '';

let players = [];
let amountPlayers = 1;

// Maneja los mensajes recibidos
function handleMessage(message) {
    switch (message.type) {
        case 'registered':
            handleUserRegistration();
            break;
        case 'tournamentCreated':
            handleTournamentCreation(message.tournamentId);
            break;
        case 'playerJoinedTournament':
            handleJoinTournament(message.tournamentId, message.playerNames, message.playerCount);
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
        case 'error':
            changeMessage(message.message);
            break;
        default:

    }
}

function handleUserRegistration() {
    document.getElementById('username').disabled = true;
    submitUsername.disabled = true;

    disableGameBts(false);
    changeMessage('Your user has been registered');

    const name = document.getElementById('username').value;
    players.push(name);
    actualUser = name;
}

function handleTournamentCreation(tournamentId) {
    gameJoined = true;
    actualId = tournamentId;
    document.getElementById('tournament-id').value = tournamentId;
    leaveGame.disabled = false;
    disableGameBts(true);
    enableReadyBt();
    changeMessage(`Tournament created. ID: ${gameId}`);
}

function handleJoinTournament(tournamentId, playerNames, playerCount) {
    gameJoined = true;
    actualId = tournamentId;
    amountPlayers = playerCount;
    disableGameBts(true);
    leaveGame.disabled = false;

    for (let name of playerNames) {
        if (!players.includes(name)) {
            players.push(name);
        }
    }
    changeMessage(`${playerNames[playerCount-1]} joined the game lobby`);
    ready.disabled = false;
}

function handleWait() {
    document.getElementById('ready').disabled = true;
    changeMessage('Waiting for players to be ready...');
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


function changeMessage(message) {
    document.getElementById('messages').innerText = message;
}

function obtainGameId() {
    return document.getElementById('tournament-id').value;
}

function enableReadyBt() {
    ready.disabled = !(gameJoined);
}

function disableGameBts(disable) {
    createGame.disabled = disable;
    joinGame.disabled = disable;
    document.getElementById('tournament-id').disabled = disable;
}

function disableButtons(disable) {
    const buttons = document.getElementsByClassName('server-operation');
    [...buttons].forEach((button) => {
        button.disabled = disable;
    });

    document.getElementById('username').disabled = disable;
    document.getElementById('tournament-id').disabled = disable;
}

disableButtons(true);

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


const ready = document.getElementById('ready');
ready.addEventListener('click', () => {
    sendMessage(socket, { type: 'startTournament', tournamentId: obtainGameId() });
});

const submitUsername = document.getElementById('submit-user');
submitUsername.addEventListener('click', () => {
    const userName = document.getElementById('username').value;
    if (userName !== '') {
        sendMessage(socket, { type: 'register', userName });
    } else {
        alert('Introduzca un nombre de usuario');
    }
});

const createGame = document.getElementById('create-tournament');
createGame.addEventListener('click', () => {
    sendMessage(socket, { type: 'createTournament', typeOfGames: 'vs' });
});

const joinGame = document.getElementById('join-tournament');
joinGame.addEventListener('click', () => {
    sendMessage(socket, { type: 'joinTournament', tournamentId: obtainGameId() });
});

const leaveGame = document.getElementById('leave-tournament');
leaveGame.addEventListener('click', () => {
    sendMessage(socket, { type: 'leaveTournament', gameId: obtainGameId() });
});

const closeConnection = document.getElementById('close-connection');
closeConnection.addEventListener('click', () => {
    const response = confirm('Are you sure you do not want to continue playing?\n' +
        'To play again just select "multiplayer" on the home menu');

    if (response) {
        socket.close();
    }
});