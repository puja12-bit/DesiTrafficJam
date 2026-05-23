import { Input } from './Input.js';
import { Player } from './Player.js';
import { World } from './World.js';
import { TrafficManager } from './TrafficManager.js';
import { PedestrianManager } from './PedestrianManager.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        this.input = new Input();
        this.player = new Player(300 - 15, 600);
        this.world = new World();
        this.traffic = new TrafficManager();
        this.pedestrians = new PedestrianManager();
        
        this.isPlaying = false;
        this.lastTime = 0;
        
        this.score = 0;
        this.distanceTraveled = 0;
        this.timeMs = 0;
        
        this.destination = '';
        
        this.onGameOver = null;
        this.onLevelComplete = null;
        
        this.boundLoop = this.loop.bind(this);
    }

    startGame(dest) {
        this.destination = dest;
        this.isPlaying = true;
        this.score = 0;
        
        this.traffic.setRoadType(dest);

        this.timeMs = 0;
        this.player.x = 300 - 15;
        this.player.y = 600;
        this.player.speed = 0;
        
        this.traffic.vehicles = [];
        this.pedestrians.peds = [];
        
        this.lastTime = performance.now();
        requestAnimationFrame(this.boundLoop);
    }

    stopGame() {
        this.isPlaying = false;
    }

    gameOver(reason) {
        this.stopGame();
        if (this.onGameOver) this.onGameOver(reason, Math.floor(this.score));
    }

    levelComplete() {
        this.stopGame();
        let feedback = "Good job driving safely!";
        if (this.score < 1000) feedback = "You barely survived.";
        else if (this.score > 5000) feedback = "Perfect driving record!";
        if (this.onLevelComplete) this.onLevelComplete(Math.floor(this.score), feedback);
    }

    showMessage(text, type='penalty') {
        const msgArea = document.getElementById('messages-area');
        if (!msgArea) return;
        const div = document.createElement('div');
        div.className = `floating-message ${type}`;
        div.innerText = text;
        msgArea.appendChild(div);
        setTimeout(() => { if(msgArea.contains(div)) msgArea.removeChild(div); }, 2000);
    }

    checkRules() {
        // Penalty for turning violently without indicators
        if (Math.abs(this.player.speed) > 2) {
            const steering = this.input.steerDir;
            if (steering === -1 && !this.input.indicators.left) {
                this.score -= 2; // Rapid drain if holding turn
                if (Math.random() < 0.05) this.showMessage("INDICATE LEFT!", "penalty");
            }
            if (steering === 1 && !this.input.indicators.right) {
                this.score -= 2;
                if (Math.random() < 0.05) this.showMessage("INDICATE RIGHT!", "penalty");
            }
        }
    }

    checkCollisions() {
        // Player rect
        const px = this.player.x - this.player.width/2;
        const py = this.player.y - this.player.height/2;
        const pw = this.player.width;
        const ph = this.player.height;

        const playerRect = { left: px, right: px+pw, top: py, bottom: py+ph };

        // Check Traffic
        for (let v of this.traffic.getVehicles()) {
            const vRect = { left: v.x, right: v.x+v.width, top: v.y, bottom: v.y+v.height };
            if (this.intersect(playerRect, vRect)) {
                this.gameOver("You caused an accident!");
                return;
            }
        }

        // Check Pedestrians
        for (let p of this.pedestrians.getPedestrians()) {
            const pRect = { left: p.x - p.width/2, right: p.x + p.width/2, top: p.y - p.width/2, bottom: p.y + p.width/2 };
            if (this.intersect(playerRect, pRect)) {
                this.gameOver("You hit a pedestrian!");
                return;
            }
        }
    }

    intersect(r1, r2) {
        return !(r2.left > r1.right || 
                 r2.right < r1.left || 
                 r2.top > r1.bottom ||
                 r2.bottom < r1.top);
    }

    update(dt) {
        this.player.update(this.input, dt);
        this.world.update(this.player.speed, dt);
        this.traffic.update(this.player.speed, dt);
        this.pedestrians.update(this.player.speed, dt);
        
        this.checkRules();
        this.checkCollisions();

        if (!this.isPlaying) return; // if game over triggered
        
        if (this.player.speed > 0) {
            this.distanceTraveled += this.player.speed * (dt / 16);
            this.score += this.player.speed * 0.1;
        }
        
        this.timeMs += dt;

        document.getElementById('score').innerText = Math.floor(Math.max(0, this.score));
        document.getElementById('dist').innerText = Math.floor(Math.max(0, this.distanceTraveled)) + 'm';
        document.getElementById('time').innerText = Math.floor(this.timeMs / 1000) + 's';
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.world.draw(this.ctx, this.canvas);
        this.pedestrians.draw(this.ctx);
        this.traffic.draw(this.ctx);
        this.player.draw(this.ctx, this.input);
    }

    loop(timestamp) {
        if (!this.isPlaying) return;
        
        let dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        if (dt > 100) dt = 16;
        
        this.update(dt);
        this.draw();
        
        requestAnimationFrame(this.boundLoop);
    }
}
