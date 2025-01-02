document.addEventListener('DOMContentLoaded', () => {
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

    function createGameBoard4Ships() {
        let shipBoardPlace = document.getElementById('ship-side');

        shipBoardPlace.appendChild(generateBoard(1));
    }

//--------------------------------------------------------------------------------------------------------------------//
    let dragElement = null;

    function handleDragStart(evt) {
        this.style.opacity = '0.4';
        let orientation;

        if (this.shipInstance) {
            dragElement = this.shipInstance;
        } else {
            if (this.classList.contains("vertical")) {
                orientation = "vertical";
            } else {
                orientation = "horizontal";
            }

            dragElement = new shipClass(this,this.id,orientation,getShipSize(this.id));
            console.log("confirmed creation");
            console.log(dragElement);
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

    function handleDragEnter() {
        let position = this.id;
        position = position.slice(3);

        iCells.forEach(function (item) {
            if (!item.hasChildNodes()) {
                item.classList.remove('over');
                item.classList.remove('cant');
            }
        });

        let index = getCellIndex(this);
        let orientationValue;
        if (dragElement.orientation === "horizontal") {
            orientationValue = 1;
        }else {
            orientationValue = 11;
        }

        if (validatePlacement(dragElement.name, position, dragElement.orientation, dragElement.size)) {
            for (let i = index; i < index + (dragElement.size * orientationValue); i += orientationValue) {
                if ((i <= 120) && !iCells[i].hasChildNodes()) {
                    iCells[i].classList.add('over');
                }
            }
        } else {
            for (let i = index; i < index + (dragElement.size * orientationValue); i += orientationValue) {
                if ((i <= 120) && !iCells[i].hasChildNodes()) {
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
            if (dragElement.orientation === "horizontal") {
                elShip.style.maxWidth = 100 * dragElement.size + "%";
                elShip.style.left = 10 + "%";
                elShip.style.bottom = 0 + "px";
                elShip.style.top = "auto";
            }else {
                elShip.style.maxwidth = 100 * (dragElement.size - 1) + "%";
                elShip.style.left = "auto";
                elShip.style.top = 100 + "%";
                elShip.style.bottom = "auto";
            }
            this.appendChild(elShip);

            dragElement.cellList.length = 0;

            for (let i = dragElement.htmlElement.length-1; i > 0; i--) {
                dragElement.htmlElement[i].remove();
            }
            dragElement.htmlElement.length = 1;



            let index = getCellIndex(this);
            dragElement.cellList.push(iCells[index]);

            if (dragElement.orientation === "horizontal") {
                for (let i = index + 1; i < index + dragElement.size; i++) {
                    let shipPart = document.createElement("div");
                    shipPart.classList.add("ship");
                    dragElement.htmlElement.push(shipPart);

                    iCells[i].appendChild(shipPart);
                    dragElement.cellList.push(iCells[i]);
                }

            }else {
                for (let i = index + 11; i < index + (dragElement.size*11); i+=11) {
                    let shipPart = document.createElement("div");
                    shipPart.classList.add("ship");
                    dragElement.htmlElement.push(shipPart);

                    iCells[i].appendChild(shipPart);
                    dragElement.cellList.push(iCells[i]);
                }
            }
        }
        return false;
    }

    function handleDragEnd() {
        this.style.opacity = '1';
        this.shipInstance = dragElement;
        dragElement = null;

        iCells.forEach(function (item) {
            if (!item.hasChildNodes()) {
            item.classList.remove('over');
            item.classList.remove('cant');
            }
        });
    }

    createGameBoard4Ships();

    let iShips = document.querySelectorAll('.ship');
    let iCells = document.querySelectorAll('.cell');

    iShips.forEach(function (item) {
        item.addEventListener('dragstart', handleDragStart, false);
        item.addEventListener('dragend', handleDragEnd, false);
        item.addEventListener('wheel', function() {
            if (!item.shipInstance) {
                if (item.classList.contains("vertical")) {
                    item.classList.remove("vertical");
                } else {
                    item.classList.add("vertical");
                }
            } else {
                if (item.classList.contains("vertical")) {
                    item.classList.remove("vertical");
                    item.shipInstance.orientation = "horizontal";
                } else {
                    item.classList.add("vertical");
                    item.shipInstance.orientation = "vertical";
                }
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
