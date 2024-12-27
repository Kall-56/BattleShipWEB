let follower = document.getElementById('carrier');
let is_clicked = false;

follower.addEventListener('mousedown', function(){
    is_clicked = true;

});

document.addEventListener('mouseup', function(){
    is_clicked = false;
});

document.addEventListener('mousemove', function(e){
    //if (is_clicked) {
    follower.style.position = 'absolute';
    follower.style.top = (e.clientY - follower.clientHeight/2) + 'px';
    follower.style.left = (e.clientX - follower.clientWidth/2) + 'px';
    //}
});

function calculateShipTiles(startPos, orientation, size) {
    const rows = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    let row = startPos.charAt(0);
    let col = Number(startPos.slice(1));

    if (orientation === 'horizontal' && (col === 0 || (col + size - 1) > 10)) {
        return []; // Out of bounds
    }

    let rowIndex = rows.indexOf(row) + size;
    if (orientation === 'vertical' && (rowIndex > rows.length)) {
        return []; // Out of bounds
    }

    let positions = [];
    for (let i = 0; i < size; i++) {
        if (orientation === 'vertical') {
            let auxRowIndex = rows.indexOf(row) + i;
            let auxRow = rows[auxRowIndex];
            positions.push(`${auxRow}${col}`);
        } else {
            let auxCol = col + i;
            positions.push(`${row}${auxCol}`);
        }
    }
    return positions;
}

function placeShip(ship, position, orientation) {
    const shipSizes = {
        carrier: 5,
        cruiser: 3,
        submarine: 3,
        battleship: 4,
        destroyer: 2,
    };

    const shipSize = shipSizes[ship] || 0;
    if (!shipSize) {
        return;
    }

    let positions = calculateShipTiles(position, orientation, shipSize);
    if (positions.length !== shipSize) {
        console.error("Cannot place ship. Out of bounds");
        return;
    }

    // Verifying overlapping
    for (let pos of positions) {
        const tile = document.getElementById(`p1@${pos}`);
        if (!tile) {
            console.error(`Not valid position: ${pos}`);
            return;
        }
        if (tile.hasChildNodes()) {
            console.error(`Position ${pos} already occupied.`);
            return;
        }
    }

    let shipPieces = [];
    for (let i = 0; i < shipSize; i++) {
        let shipElement = document.createElement('div');
        shipElement.setAttribute('id', ship);
        shipElement.setAttribute('class', `ship ${orientation} tile-${i + 1}`);
        shipPieces.push(shipElement);
    }

    for (let i = 0; i < shipSize; i++) {
        let pos = document.getElementById(`p1@${positions[i]}`);
        pos.appendChild(shipPieces.at(i));
    }
}

function generateBoard(playerNum) {
    const letters = ['-', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    const boardSize = letters.length;
    let board = document.createElement('div');

    board.setAttribute('class', `table p${playerNum}`);
    board.setAttribute('id', `board-p${playerNum}`);

    for (let index = 0; index < boardSize * boardSize; index++) {
        const row = Math.floor(index / boardSize);
        const col = index % boardSize;

        const tile = document.createElement('div');
        tile.setAttribute('class', 'cell');

        if (row === 0 && col !== 0) {
            tile.textContent = col.toString();
        } else if (col !== 0) {
            tile.setAttribute('id', `p${playerNum}@${letters[row] + col}`);
        }
        if (col === 0 && row !== 0) {
            tile.textContent = letters[row].toUpperCase();
        }
        board.appendChild(tile);
    }
    return board;
}

function createGameBoards(amountPlayers) {
    let playerBoardPlace = document.getElementById('player-space');
    let opponentsPlace = document.getElementById('opponents-space');

    let casillas = generateBoard(1).childNodes;
    [...casillas].forEach(casilla => {playerBoardPlace.appendChild(casilla)});

    for (let i = 2; i <= amountPlayers; i++) {
        let opponentPlace = document.createElement('div');
        opponentPlace.setAttribute('class', 'player-container');

        let opponentName = document.createElement('span');
        opponentName.setAttribute('id', `p${i}-name`);
        opponentPlace.appendChild(opponentName);

        opponentPlace.appendChild(generateBoard(i));
        opponentsPlace.appendChild(opponentPlace);
    }
}

createGameBoards(3);
placeShip("carrier", "d4", "horizontal");
