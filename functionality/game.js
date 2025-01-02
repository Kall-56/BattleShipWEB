document.addEventListener('DOMContentLoaded', (event) => {
    class shipClass {
        constructor(htmlElement, name, orientation, size,) {
            this.htmlElement = [];
            this.htmlElement.push(htmlElement);
            this.name = name;
            this.orientation = orientation;
            this.size = size;
            this.cellList = [];
        }
        setProperties(shipDiv, newOrientation){
            this.htmlElement = shipDiv;
            this.name = this.htmlElement.id;
            this.orientation = newOrientation;
            this.size = getShipSize(this.name);
        }
        setHtmlElement(newHtml) {
            this.htmlElement = newHtml;
        }
        getHtmlElement() {
            return this.htmlElement;
        }
        getName() {
            return this.name;
        }
        getOrientation() {
            return this.orientation;
        }
        getSize() {
            return this.size;
        }
        setCellList(cells) {
            this.cellList = cells;
        }
        getCellList() {
            return this.cellList;
        }
    }

    function getShipSize(shipName) {
        const shipSizes = {
            carrier: 5,
            cruiser: 3,
            submarine: 3,
            battleship: 4,
            destroyer: 2,
        };
        return shipSizes[shipName];
    }

    function getCellIndex(cell) {
        for (let i = 0; i < iCells.length; i++) {
            if (iCells[i] === cell) {
                return i;
            }
        }
    }

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
        const shipSize = getShipSize(ship.id);

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

    function validatePlacement(ship, position, orientation, shipSize) {
        let positions = calculateShipTiles(position, orientation, shipSize);
        if (positions.length !== shipSize) {
            console.log("Cannot place ship. Out of bounds");
            return false;
        }

        // Verifying overlapping
        for (let pos of positions) {
            const tile = document.getElementById(`p1@${pos}`);
            if (!tile) {
                console.log(`Not valid position: ${pos}`);
                return false;
            }
            if (tile.hasChildNodes()) {
                console.log(`Position ${pos} already occupied.`);
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

//--------------------------------------------------------------------------------------------------------------------//
    let dragElement = null;
    let elOrientation = "horizontal";
    let elSize = 0;

    function handleDragStart(evt) {
        this.style.opacity = '0.4';
        if (this.shipInstance) {
            dragElement = this.shipInstance;
        } else {
            dragElement = new shipClass(this,this.id,elOrientation,getShipSize(this.id));
            console.log("confirmed creation");
            console.log(dragElement);
            //elSize = getShipSize(this.id);
        }

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

        iCells.forEach(function (item) {
            if (!item.hasChildNodes()) {
                item.classList.remove('over');
                item.classList.remove('cant');
            }
        });

        let index = getCellIndex(this);
        if (validatePlacement(dragElement.name,position,dragElement.orientation,dragElement.size)) {
            for (let i = index; i < index +dragElement.size; i++) {
                if (!iCells[i].hasChildNodes()) {
                    iCells[i].classList.add('over');
                }
            }
        } else {
            for (let i = index; i < index+dragElement.size; i++) {
                if (!iCells[i].hasChildNodes()) {
                    iCells[i].classList.add('cant');
                }
            }
        }
    }

    function handleDrop(evt) {
        if (evt.stopPropagation) {
            evt.stopPropagation();
        }

        if (!this.classList.contains("cant")) {
            let elId = evt.dataTransfer.getData("text/plain");
            let elShip = document.getElementById(elId);

            elShip.style.position = "absolute";
            elShip.style.width = 100 * dragElement.size + "%";
            elShip.style.height = 90 + "%";
            elShip.style.left = (100 / dragElement.size) + "%";
            this.appendChild(elShip);

            dragElement.cellList.length = 0;
            console.log(dragElement.htmlElement);
            for (let i = dragElement.htmlElement.length-1; i > 0; i--) {
                dragElement.htmlElement[i].remove();
            }
            dragElement.htmlElement.length = 1;
            console.log(dragElement.htmlElement);
            console.log("this should be 1");

            let index = getCellIndex(this);
            for (let i = index+1; i < index + dragElement.size; i++) {
                let shipPart = document.createElement("div");
                shipPart.classList.add("ship");
                dragElement.htmlElement.push(shipPart);

                iCells[i].appendChild(shipPart);
                dragElement.cellList.push(iCells[i]);
            }
            console.log(dragElement.htmlElement);
            console.log("this should be all");
        }
        return false;
    }

    function handleDragEnd(evt) {
        this.style.opacity = '1';
        this.shipInstance = dragElement;

        iCells.forEach(function (item) {
            if (!item.hasChildNodes()) {
            item.classList.remove('over');
            item.classList.remove('cant');
            }
        });
    }

    createGameBoard4Ships(1);

    let iShips = document.querySelectorAll('.ship');
    let iCells = document.querySelectorAll('.cell');

    iShips.forEach(function (item) {
        item.addEventListener('dragstart', handleDragStart, false);
        item.addEventListener('dragend', handleDragEnd, false);
        item.addEventListener('wheel', function() {
            if (dragElement !== null)
            if (elOrientation === "horizontal") {
                elOrientation = "vertical";
                this.style.rotate = 90 + "deg";
            } else {
                elOrientation = "horizontal";
                this.style.rotate = 0+"deg";
            }
        }, true);
    });

    iCells.forEach(function (item) {
        item.addEventListener('dragover', handleDragOver, false);
        item.addEventListener('dragenter', handleDragEnter, false);
        item.addEventListener('drop', handleDrop, false);
    });

    //createGameBoards(3);
    //placeShip("carrier", "d4", "horizontal");
});
