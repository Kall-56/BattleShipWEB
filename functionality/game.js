document.addEventListener('DOMContentLoaded', (event) => {
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

    function validatePlacement(ship, position, orientation) {
        const shipSizes = {
            carrier: 5,
            cruiser: 3,
            submarine: 3,
            battleship: 4,
            destroyer: 2,
        };

        const shipSize = shipSizes[ship] || 0;
        if (!shipSize) {
            return false;
        }

        let positions = calculateShipTiles(position, orientation, shipSize);
        if (positions.length !== shipSize) {
            console.error("Cannot place ship. Out of bounds");
            return false;
        }

        // Verifying overlapping
        for (let pos of positions) {
            const tile = document.getElementById(`p1@${pos}`);
            if (!tile) {
                console.error(`Not valid position: ${pos}`);
                return false;
            }
            if (tile.hasChildNodes()) {
                console.error(`Position ${pos} already occupied.`);
                return false;
            }
        }
        return true;
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
        [...casillas].forEach(casilla => {
            playerBoardPlace.appendChild(casilla)
        });

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

    function createGameBoard4Ships(amountPlayers) {
        let shipBoardPlace = document.getElementById('ship-side');

        shipBoardPlace.appendChild(generateBoard(1));
    }

    let dragElement = null;

    function handleDragStart(evt) {
        this.style.opacity = '0.4';

        dragElement = this;
        evt.dataTransfer.effectAllowed = 'move';

        evt.dataTransfer.setData('text/plain', this.id);
    }

    function handleDragOver(evt) {
        if (evt.preventDefault) {
            evt.preventDefault();
        }

        evt.dataTransfer.dropEffect = 'move';
        return false;
    }

    function handleDragEnter(evt) {
        let position = this.id;
        position = position.slice(3);
        if (validatePlacement(dragElement.id,position,"horizontal")) {
            this.classList.add('over');
        } else {
            this.classList.add('cant');
        }
    }

    function handleDragLeave(evt) {
        this.classList.remove('over');
        this.classList.remove('cant');
    }

    function handleDrop(evt) {
        if (evt.stopPropagation) {
            evt.stopPropagation();
        }

        if (dragElement !== this) {
            dragElement.innerHTML = this.innerHTML;
            this.innerHTML = evt.dataTransfer.getData('text/html');
        }

        return false;
    }

    function handleDragEnd(evt) {
        this.style.opacity = '1';

        iCells.forEach(function (item) {
            item.classList.remove('over');
        });
    }

    createGameBoard4Ships(1);

    let iShips = document.querySelectorAll('.ship');
    let iCells = document.querySelectorAll('.cell');

    iShips.forEach(function (item) {
        item.addEventListener('dragstart', handleDragStart, false);
        item.addEventListener('dragend', handleDragEnd, false);
    });

    iCells.forEach(function (item) {
        item.addEventListener('dragover', handleDragOver, false);
        item.addEventListener('dragenter', handleDragEnter, false);
        item.addEventListener('dragleave', handleDragLeave, false);
        item.addEventListener('drop', handleDrop, false);
    });

    //createGameBoards(3);
    //placeShip("carrier", "d4", "horizontal");
});
