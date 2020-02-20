(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){
const [Snake, Tail, Head, Cheese] = require('./Objects')

global.BOARD_SIZE = 10;
global.EMPTY = 0;
global.HEAD = 1;
global.TAIL = 2;
global.CHEESE = 3;


class Game{
    constructor(input){
        this.input = input;
        this.board = [...Array(BOARD_SIZE)].map(e => Array(BOARD_SIZE).fill(EMPTY));
        this.score = 1
        this.ticks = 0
        this.head = new Head(
            Math.floor((BOARD_SIZE / 4) + (Math.random() * (BOARD_SIZE / 4))), 
            Math.floor((BOARD_SIZE / 4) + (Math.random() * (BOARD_SIZE / 4)))
        )
        this.cheese = this.createNewCheese()

        this.states = []
    }


    tick = () => {
        let move = this.input.getMove(this.head, this.cheese, this.score)
        let oldNode = new Tail(this.head.x, this.head.y)

        if(this.head.next){
            oldNode.next = this.head.next
            this.head.next = oldNode
        }
        else{
            this.head.next = oldNode;
        }
        
        this.head.x += move[0]
        this.head.y += move[1]

        let gameOver = this.head.checkCollision()
        let cheeseFound = this.checkCheese()

        if(cheeseFound){
            this.cheese = this.createNewCheese()
            this.score++
            this.ticks = 0
        }
        else
            this.head.deleteLast()

        this.ticks++

        if(this.ticks == BOARD_SIZE * BOARD_SIZE){
            gameOver = true
        }

        if(!gameOver)
            this.redraw()

        return gameOver;
    }


    checkCheese = () => {
        return (this.head.x == this.cheese.x 
            && this.head.y == this.cheese.y)
    }

    createNewCheese = () => {
        let potX = Math.floor(Math.random() * BOARD_SIZE)
        let potY = Math.floor(Math.random() * BOARD_SIZE)

        const snakePos = this.head.getPositions()

        while(snakePos.find(x => x[0] == potX && x[1] == potY)){
            potX = Math.floor(Math.random() * BOARD_SIZE)
            potY = Math.floor(Math.random() * BOARD_SIZE)
        }

        return new Cheese(potX, potY);
    }


    redraw = () => {
        this.board = [...Array(BOARD_SIZE)].map(e => Array(BOARD_SIZE).fill(EMPTY));
        let positions = this.head.getPositions()

        positions.forEach((coords) => {
            this.board[coords[1]][coords[0]] = TAIL;
        })
        
        this.board[this.head.y][this.head.x] = HEAD;
        this.board[this.cheese.y][this.cheese.x] = CHEESE;

        this.states.push(this.board)
        
    }

    getScore = () => this.score * this.ticks
    
}


module.exports = Game
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Objects":3}],2:[function(require,module,exports){


const [Snake, Tail, Head, Cheese] = require('./Objects')

class NeuralPreloadedInterface{
    constructor(model, tf){
        this.model = model
        this.tf = tf
    }

    getMove(head, cheese, score) {
        const distX = (cheese.x - head.x) / BOARD_SIZE
        const distY = (cheese.y - head.y) / BOARD_SIZE

        // distance in each direction
        let distSouth = distY >= 0 ? Math.abs(distY) : 0
        let distNorth = distY <= 0 ? Math.abs(distY) : 0
        let distEast =  distX >= 0 ? Math.abs(distX) : 0
        let distWest =  distX <= 0 ? Math.abs(distX) : 0

        // hack to check collisions because I didnt think far enough ahead
        let canMoveUp =     new Head(head.x, head.y - 1, head.next).checkCollision() ? -1 : 1
        let canMoveRight =  new Head(head.x + 1, head.y, head.next).checkCollision() ? -1 : 1
        let canMoveDown =   new Head(head.x, head.y + 1, head.next).checkCollision() ? -1 : 1
        let canMoveLeft =   new Head(head.x - 1, head.y, head.next).checkCollision() ? -1 : 1

        const params = [
            distNorth,
            distEast,
            distSouth,
            distWest,
            canMoveUp, 
            canMoveRight, 
            canMoveDown, 
            canMoveLeft
        ]

        const tensor =  this.tf.tensor2d(params, [1, params.length])
        let predict = this.model.predict(tensor).flatten().arraySync()

        return this.formatMove(predict)
    }

    formatMove(move) {
        // console.log(move)
        const processed = move.indexOf(Math.max(...move));
        if(processed == 0) //N
            return [0, -1]
        if(processed == 1) //E
            return [1, 0]
        if(processed == 2) //S
            return [0, 1]
        if(processed == 3) //W
            return [-1, 0]
    }

}


module.exports = NeuralPreloadedInterface
},{"./Objects":3}],3:[function(require,module,exports){

class Snake{
    constructor(x, y, next = undefined){
        this.x = x;
        this.y = y;
        this.next = next;
    }


    deleteLast = () => {
        if(this.next){
            if(this.next.next){
                return this.next.deleteLast()
            }
            else{
                this.next = null;
                return true;
            }
        }
    }

}

class Tail extends Snake{}

class Head extends Snake{
    checkCollision = () => {
        let node = this.next;

        while(node != null){
            if(this.x == node.x && this.y == node.y)
                return true;
            node = node.next;
        }

        if(this.x == BOARD_SIZE || this.x < 0)
            return true;
        if(this.y == BOARD_SIZE || this.y < 0)
            return true;

        return false;
    }
    
    getPositions = () => {
        let arr = [[this.x, this.y]]
        let node = this.next;
        while(node != null){
            arr.push([node.x, node.y])
            node = node.next;
        }
        return arr;
    }
}

class Cheese{
    constructor(x, y){
        this.x = x;
        this.y = y;
    }
}


// module.exports = {
//     Snake: Snake,
//     Tail: Tail,
//     Head: Head
// }

module.exports = [
    Snake, Tail, Head, Cheese
]
},{}],4:[function(require,module,exports){
const PretrainedNetworkInterface = require('./NeuralPreloadedInterface')
const Game = require('./Game')

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run(){
    let model = await tf.loadLayersModel('model/model.json');
    let input = new PretrainedNetworkInterface(model, tf);
    drawBoard()

    while(true){
        let game = new Game(input);
        let done = false;
        while(!done){
            done = game.tick();
            markBoard(game.board)
            await sleep(100)
        }

        await sleep(1000)
    }
}


function drawBoard(){
    var table = $('table')
    for(var i = 0; i < BOARD_SIZE; i++){
        var row = $('<tr>')
        for(var j = 0; j < BOARD_SIZE; j++){
            row.append($('<td>'))
        }
        table.append(row)
    }
}

function markBoard(board){
    var table = $('table')
    for(var i = 0; i < board.length; i++){
        for(var j = 0; j < board[0].length; j++){
            var element = $('table tr').eq(i).children().eq(j)
            element.removeClass()
            if(board[j][i] == HEAD)
                element.addClass('head')
            if(board[j][i] == TAIL)
                element.addClass('tail')
            if(board[j][i] == CHEESE)
                element.addClass('cheese')
        }
    }
}


// $("p:nth-child(3)"

$(() => {
    run()

})
},{"./Game":1,"./NeuralPreloadedInterface":2}]},{},[4]);
