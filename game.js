// ========================================
// モンスターハンター 3Dゲーム - メインスクリプト
// ========================================

const debugInfo = [];
function addDebug(msg) {
    debugInfo.push(msg);
    console.log(msg);
    const debugEl = document.getElementById('debugContent');
    if (debugEl) {
        debugEl.innerHTML = debugInfo.map((m, i) => `${i + 1}. ${m}`).join('<br>');
    }
}

addDebug('Game script loaded');

// Three.js の確認
if (typeof THREE === 'undefined') {
    addDebug('❌ THREE.js が読み込まれていません！');
} else {
    addDebug('✅ THREE.js version: ' + THREE.REVISION);
}

// Three.js シーン設定
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa0d8f1);
scene.fog = new THREE.Fog(0xa0d8f1, 300, 800);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.getElementById('canvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

addDebug('✅ Scene, camera, renderer created');

// ========================================
// ライティング
// ========================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(100, 100, 100);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -200;
directionalLight.shadow.camera.right = 200;
directionalLight.shadow.camera.top = 200;
directionalLight.shadow.camera.bottom = -200;
scene.add(directionalLight);

// ========================================
// 地形（グラウンド）
// ========================================
const groundGeometry = new THREE.PlaneGeometry(500, 500);
const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x4a8a3f });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// テクスチャ感を出すため、グリッドラインを描画
const gridHelper = new THREE.GridHelper(500, 50, 0x2a5a2f, 0x1a3a1f);
scene.add(gridHelper);

// ========================================
// ランドマーク（木、岩など）
// ========================================
function createTree(x, z) {
    const group = new THREE.Group();
    
    // 幹
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 5, 8);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 2.5;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);
    
    // 葉
    const leavesGeometry = new THREE.SphereGeometry(2.5, 8, 8);
    const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x2d5016 });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.y = 6;
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    group.add(leaves);
    
    group.position.set(x, 0, z);
    scene.add(group);
}

function createRock(x, z, size = 1) {
    const rockGeometry = new THREE.DodecahedronGeometry(size, 0);
    const rockMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.set(x, size * 0.5, z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
}

// 木を配置
for (let i = 0; i < 20; i++) {
    const x = (Math.random() - 0.5) * 400;
    const z = (Math.random() - 0.5) * 400;
    const dist = Math.sqrt(x * x + z * z);
    if (dist > 30) { // プレイヤーの周りには配置しない
        createTree(x, z);
    }
}

// 岩を配置
for (let i = 0; i < 30; i++) {
    const x = (Math.random() - 0.5) * 400;
    const z = (Math.random() - 0.5) * 400;
    const dist = Math.sqrt(x * x + z * z);
    if (dist > 20) {
        createRock(x, z, 0.8 + Math.random() * 1.2);
    }
}

// ========================================
// プレイヤークラス
// ========================================
class Player {
    constructor() {
        // プレイヤーのグループ
        this.group = new THREE.Group();
        
        // プレイヤーの体（キューブ）
        const bodyGeometry = new THREE.BoxGeometry(0.8, 1.8, 0.6);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x3388ff });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.position.y = 0.9;
        this.body.castShadow = true;
        this.body.receiveShadow = true;
        this.group.add(this.body);

        // 武器（剣）
        const weaponGeometry = new THREE.BoxGeometry(0.3, 1.5, 0.1);
        const weaponMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc });
        this.weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
        this.weapon.position.set(0.5, 1, 0.3);
        this.weapon.rotation.z = Math.PI / 6;
        this.weapon.castShadow = true;
        this.group.add(this.weapon);

        scene.add(this.group);

        // ゲーム状態
        this.position = { x: 0, z: 0 };
        this.rotation = 0;
        this.velocity = { x: 0, z: 0 };

        this.hp = 100;
        this.maxHp = 100;
        this.stamina = 100;
        this.maxStamina = 100;
        this.durability = 100;
        this.maxDurability = 100;

        this.speed = 0.3;
        this.sprintSpeed = 0.5;
        this.isMoving = false;
        this.isDodging = false;
        this.dodgeSpeed = 1.5;
        this.dodgeTime = 0;
        this.dodgeDuration = 0.4;

        this.damageFlash = 0;
        this.isAttacking = false;
        this.attackTime = 0;
        this.attackDuration = 0.5;

        this.keys = {};
        this.setupControls();
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toUpperCase()] = true;
            
            if (e.code === 'Space') {
                e.preventDefault();
                this.dodge();
            }
            if (e.key === 'r' || e.key === 'R') {
                this.repair();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toUpperCase()] = false;
        });

        document.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // 左クリック
                this.attack();
            }
        });

        document.addEventListener('mousemove', (e) => {
            const deltaX = e.movementX;
            this.rotation += deltaX * 0.005;
        });

        document.addEventListener('contextmenu', (e) => e.preventDefault());
        document.addEventListener('pointerlockchange', () => {});
        document.addEventListener('click', () => {
            document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock;
            document.body.requestPointerLock();
        });
    }

    update(deltaTime, monster) {
        // 移動入力
        this.velocity.x = 0;
        this.velocity.z = 0;
        let isSprintInput = false;

        if (this.keys['W']) {
            this.velocity.z -= 1;
            this.isMoving = true;
        }
        if (this.keys['S']) {
            this.velocity.z += 1;
            this.isMoving = true;
        }
        if (this.keys['A']) {
            this.velocity.x -= 1;
            this.isMoving = true;
        }
        if (this.keys['D']) {
            this.velocity.x += 1;
            this.isMoving = true;
        }
        if (this.keys['SHIFT']) {
            isSprintInput = true;
        }

        // 移動速度の計算
        let moveSpeed = this.speed;
        if (isSprintInput && this.stamina > 0) {
            moveSpeed = this.sprintSpeed;
            this.stamina = Math.max(0, this.stamina - deltaTime * 50);
        } else {
            this.stamina = Math.min(this.maxStamina, this.stamina + deltaTime * 30);
        }

        // 速度の正規化と適用
        const velocityLength = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
        if (velocityLength > 0) {
            this.velocity.x = (this.velocity.x / velocityLength) * moveSpeed;
            this.velocity.z = (this.velocity.z / velocityLength) * moveSpeed;
        }

        // 回避中のプレイヤー
        if (this.isDodging) {
            this.dodgeTime += deltaTime;
            const dodgeProgress = this.dodgeTime / this.dodgeDuration;
            
            // 回避方向への移動
            const dodgeDistance = this.dodgeSpeed * deltaTime;
            this.position.x += Math.cos(this.rotation) * dodgeDistance;
            this.position.z += Math.sin(this.rotation) * dodgeDistance;

            if (this.dodgeTime >= this.dodgeDuration) {
                this.isDodging = false;
            }
        } else {
            // 通常移動
            this.position.x += this.velocity.x * Math.cos(this.rotation) - this.velocity.z * Math.sin(this.rotation);
            this.position.z += this.velocity.x * Math.sin(this.rotation) + this.velocity.z * Math.cos(this.rotation);
        }

        // マップ境界
        this.position.x = Math.max(-240, Math.min(240, this.position.x));
        this.position.z = Math.max(-240, Math.min(240, this.position.z));

        // 攻撃アニメーション
        if (this.isAttacking) {
            this.attackTime += deltaTime;
            const attackProgress = this.attackTime / this.attackDuration;

            if (attackProgress < 0.5) {
                // 振りかぶり
                this.weapon.rotation.z = Math.PI / 6 + attackProgress * Math.PI;
            } else {
                // 振り下ろし
                this.weapon.rotation.z = Math.PI / 6 + (0.5 + (attackProgress - 0.5) * 2) * Math.PI;
            }

            if (this.attackTime >= this.attackDuration) {
                this.isAttacking = false;
                this.weapon.rotation.z = Math.PI / 6;
                this.durability = Math.max(0, this.durability - 5);
            }
        }

        // ダメージフラッシュ
        if (this.damageFlash > 0) {
            this.damageFlash -= deltaTime;
            this.body.material.color.setHex(this.damageFlash > 0 ? 0xff4444 : 0x3388ff);
        }

        // グループ位置更新
        this.group.position.copy({
            x: this.position.x,
            y: 0,
            z: this.position.z
        });

        // カメラ位置更新
        const cameraDistance = 3;
        const cameraHeight = 1.2;
        camera.position.x = this.position.x + Math.cos(this.rotation + Math.PI) * cameraDistance;
        camera.position.y = this.position.y + cameraHeight;
        camera.position.z = this.position.z + Math.sin(this.rotation + Math.PI) * cameraDistance;
        camera.lookAt(
            this.position.x + Math.cos(this.rotation) * 5,
            this.position.y + 0.5,
            this.position.z + Math.sin(this.rotation) * 5
        );

        // 敵へのダメージチェック
        if (this.isAttacking && monster) {
            const dist = this.distanceTo(monster.position.x, monster.position.z);
            if (dist < 3 && this.attackTime > this.attackDuration * 0.4 && this.attackTime < this.attackDuration * 0.7) {
                monster.takeDamage(15);
            }
        }
    }

    dodge() {
        if (!this.isDodging && this.stamina >= 20) {
            this.isDodging = true;
            this.dodgeTime = 0;
            this.stamina -= 20;
            
            // 回避方向をプレイヤーの向いている方向に設定
            // 実装済み
        }
    }

    attack() {
        if (!this.isAttacking && this.durability > 0) {
            this.isAttacking = true;
            this.attackTime = 0;
        }
    }

    repair() {
        this.durability = this.maxDurability;
    }

    takeDamage(damage) {
        this.hp = Math.max(0, this.hp - damage);
        this.damageFlash = 0.3;
    }

    distanceTo(x, z) {
        const dx = this.position.x - x;
        const dz = this.position.z - z;
        return Math.sqrt(dx * dx + dz * dz);
    }
}

// ========================================
// モンスタークラス
// ========================================
class Monster {
    constructor(x = 50, z = 50) {
        this.group = new THREE.Group();

        // モンスターの体
        const bodyGeometry = new THREE.BoxGeometry(3, 2, 4);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xff6644 });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.position.y = 1;
        this.body.castShadow = true;
        this.body.receiveShadow = true;
        this.group.add(this.body);

        // モンスターの頭
        const headGeometry = new THREE.SphereGeometry(0.8, 16, 16);
        const headMaterial = new THREE.MeshPhongMaterial({ color: 0xff5533 });
        this.head = new THREE.Mesh(headGeometry, headMaterial);
        this.head.position.set(0, 2.2, -1.8);
        this.head.castShadow = true;
        this.head.receiveShadow = true;
        this.group.add(this.head);

        // 角
        for (let i = -1; i <= 1; i += 2) {
            const hornGeometry = new THREE.ConeGeometry(0.3, 1.5, 8);
            const hornMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
            const horn = new THREE.Mesh(hornGeometry, hornMaterial);
            horn.position.set(i * 0.6, 3, -1.5);
            horn.castShadow = true;
            this.group.add(horn);
        }

        // 前足
        for (let i = -1; i <= 1; i += 2) {
            const legGeometry = new THREE.BoxGeometry(0.6, 1.5, 0.6);
            const legMaterial = new THREE.MeshPhongMaterial({ color: 0xcc4422 });
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(i * 1.2, 0.75, -1.2);
            leg.castShadow = true;
            this.group.add(leg);
        }

        // 後ろ足
        for (let i = -1; i <= 1; i += 2) {
            const legGeometry = new THREE.BoxGeometry(0.6, 1.5, 0.6);
            const legMaterial = new THREE.MeshPhongMaterial({ color: 0xcc4422 });
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(i * 1.2, 0.75, 1.2);
            leg.castShadow = true;
            this.group.add(leg);
        }

        // 尻尾
        const tailGeometry = new THREE.BoxGeometry(0.4, 0.4, 3);
        const tailMaterial = new THREE.MeshPhongMaterial({ color: 0xdd5544 });
        this.tail = new THREE.Mesh(tailGeometry, tailMaterial);
        this.tail.position.set(0, 0.5, 2.5);
        this.tail.castShadow = true;
        this.group.add(this.tail);

        scene.add(this.group);

        // ゲーム状態
        this.position = { x, z };
        this.rotation = 0;
        this.hp = 200;
        this.maxHp = 200;
        this.attackCooldown = 0;
        this.aggressiveness = 0;
        this.phase = 'calm'; // calm, alert, enraged
        this.roarTime = 0;
    }

    update(deltaTime, player) {
        // プレイヤーとの距離
        const dx = player.position.x - this.position.x;
        const dz = player.position.z - this.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // フェーズ管理
        if (this.hp > this.maxHp * 0.5) {
            this.phase = distance < 30 ? 'alert' : 'calm';
        } else {
            this.phase = 'enraged';
        }

        // 攻撃クールダウン
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }

        // 尻尾のアニメーション
        this.tail.rotation.z = Math.sin(Date.now() * 0.005) * 0.3;

        if (this.phase === 'calm') {
            // 移動なし
            this.roarTime = 0;
        } else if (this.phase === 'alert') {
            // プレイヤーに向かって移動、時々攻撃
            this.moveTowards(player, deltaTime, 0.15);
            this.aggressiveness = 0.5;

            if (distance < 15 && this.attackCooldown <= 0) {
                this.roar();
                this.attackCooldown = 2;
            }
        } else if (this.phase === 'enraged') {
            // 高速移動、連続攻撃
            this.moveTowards(player, deltaTime, 0.3);
            this.aggressiveness = 1;

            if (distance < 20 && this.attackCooldown <= 0) {
                this.roar();
                this.attackCooldown = 1.2;
            }
        }

        // ダメージ判定
        if (distance < 4 && this.attackCooldown > this.attackCooldown - deltaTime) {
            const damage = Math.floor(10 + this.aggressiveness * 15);
            player.takeDamage(damage);
        }

        // グループ位置更新
        this.group.position.copy(this.position);
        this.group.position.y = 0;

        // 回転更新
        this.group.rotation.y = this.rotation;
    }

    moveTowards(player, deltaTime, speed) {
        const dx = player.position.x - this.position.x;
        const dz = player.position.z - this.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance > 0.1) {
            const moveDistance = speed * deltaTime;
            this.position.x += (dx / distance) * moveDistance;
            this.position.z += (dz / distance) * moveDistance;
            this.rotation = Math.atan2(dz, dx);
        }

        // マップ境界
        this.position.x = Math.max(-240, Math.min(240, this.position.x));
        this.position.z = Math.max(-240, Math.min(240, this.position.z));
    }

    roar() {
        this.roarTime = 0.5;
    }

    takeDamage(damage) {
        this.hp = Math.max(0, this.hp - damage);
    }
}

// ========================================
// ゲームマネージャー
// ========================================
class GameManager {
    constructor() {
        this.player = new Player();
        this.monster = new Monster(50, 50);
        this.gameOver = false;
        this.victory = false;
        this.damagePopups = [];
        this.startTime = Date.now();
    }

    update(deltaTime) {
        if (this.gameOver) return;

        this.player.update(deltaTime, this.monster);
        this.monster.update(deltaTime, this.player);

        this.updateUI();

        // ゲーム終了判定
        if (this.player.hp <= 0) {
            this.endGame(false);
        }
        if (this.monster.hp <= 0) {
            this.endGame(true);
        }

        // UI要素の更新
        this.updateDamagePopups(deltaTime);
    }

    updateUI() {
        // プレイヤー情報
        const hpPercent = (this.player.hp / this.player.maxHp) * 100;
        document.getElementById('playerHpBar').style.width = hpPercent + '%';
        document.getElementById('hpText').textContent = `HP: ${this.player.hp}/${this.player.maxHp}`;

        const staminaPercent = (this.player.stamina / this.player.maxStamina) * 100;
        document.getElementById('staminaBar').style.width = staminaPercent + '%';
        document.getElementById('staminaText').textContent = `スタミナ: ${Math.floor(this.player.stamina)}/${this.player.maxStamina}`;

        const durabilityPercent = (this.player.durability / this.player.maxDurability) * 100;
        document.getElementById('durabilityBar').style.width = durabilityPercent + '%';
        document.getElementById('durabilityText').textContent = `耐久度: ${Math.floor(this.player.durability)}/${this.player.maxDurability}`;

        // モンスター情報
        if (this.monster.hp > 0) {
            document.getElementById('monsterInfo').style.display = 'block';
            const monsterHpPercent = (this.monster.hp / this.monster.maxHp) * 100;
            document.getElementById('monsterHpBar').style.width = monsterHpPercent + '%';
            document.getElementById('monsterHpText').textContent = `HP: ${this.monster.hp}/${this.monster.maxHp}`;

            const dist = this.player.distanceTo(this.monster.position.x, this.monster.position.z);
            document.getElementById('monsterDistance').textContent = `距離: ${dist.toFixed(1)}m`;

            // フェーズ表示
            let phaseName = 'おとなしい';
            let phaseColor = '#44aa44';
            if (this.monster.phase === 'alert') {
                phaseName = 'すり鉢状に';
                phaseColor = '#ffaa44';
            } else if (this.monster.phase === 'enraged') {
                phaseName = '激怒状態！';
                phaseColor = '#ff4444';
            }
            document.getElementById('monsterNameDisplay').innerHTML = 
                `モンスター - <span style="color: ${phaseColor}; font-size: 12px;">${phaseName}</span>`;
        } else {
            document.getElementById('monsterInfo').style.display = 'none';
        }

        // ステータス表示
        let statusText = '';
        if (this.monster.hp <= 0) {
            statusText = '<span style="color: #44ff44;">モンスター討伐完了！</span>';
        } else if (this.player.hp <= 0) {
            statusText = '<span style="color: #ff4444;">戦闘不能</span>';
        } else if (this.monster.phase === 'calm') {
            statusText = '探索中...';
        } else if (this.monster.phase === 'alert') {
            statusText = '<span style="color: #ffaa44;">モンスター接近中！</span>';
        } else {
            statusText = '<span class="warning">危険！激怒状態！</span>';
        }

        if (this.player.durability <= 0) {
            statusText += '<br><span style="color: #ffaa44;">武器が壊れている (R: 修理)</span>';
        }

        document.getElementById('statusText').innerHTML = statusText;
    }

    updateDamagePopups(deltaTime) {
        // ダメージポップアップの更新（将来実装）
    }

    endGame(victory) {
        this.gameOver = true;
        this.victory = victory;

        const gameOverDiv = document.getElementById('gameOver');
        const gameOverTitle = document.getElementById('gameOverTitle');
        const gameOverMessage = document.getElementById('gameOverMessage');
        const gameOverStats = document.getElementById('gameOverStats');

        const playTime = Math.floor((Date.now() - this.startTime) / 1000);
        const playTimeStr = `${Math.floor(playTime / 60)}分${playTime % 60}秒`;

        if (victory) {
            gameOverTitle.textContent = '勝利！';
            gameOverTitle.style.color = '#44ff44';
            gameOverMessage.textContent = 'モンスターを倒しました！';
            gameOverStats.innerHTML = `
                <div>プレイ時間: ${playTimeStr}</div>
                <div>最終HP: ${this.player.hp}/${this.player.maxHp}</div>
                <div>与ダメージ: ${this.monster.maxHp - this.monster.hp}</div>
            `;
        } else {
            gameOverTitle.textContent = 'ゲームオーバー';
            gameOverTitle.style.color = '#ff4444';
            gameOverMessage.textContent = 'あなたは戦闘不能になった...';
            gameOverStats.innerHTML = `
                <div>プレイ時間: ${playTimeStr}</div>
                <div>与ダメージ: ${this.monster.maxHp - this.monster.hp}</div>
                <div>受けたダメージ: ${this.player.maxHp - this.player.hp}</div>
            `;
        }

        gameOverDiv.style.display = 'block';
    }
}

// ========================================
// メインゲームループ
// ========================================
addDebug('Creating game manager...');
const gameManager = new GameManager();
addDebug('✅ Game manager created');
addDebug('Player position: (' + gameManager.player.position.x + ', ' + gameManager.player.position.z + ')');
addDebug('Monster position: (' + gameManager.monster.position.x + ', ' + gameManager.monster.position.z + ')');
addDebug('Scene children count: ' + scene.children.length);
addDebug('Camera position: (' + camera.position.x + ', ' + camera.position.y + ', ' + camera.position.z + ')');

let lastTime = Date.now();
let frameCount = 0;

function animate() {
    requestAnimationFrame(animate);

    const now = Date.now();
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;

    gameManager.update(deltaTime);
    renderer.render(scene, camera);
    
    frameCount++;
    if (frameCount === 10) {
        addDebug('✅ Animation running (frame ' + frameCount + ')');
        // 3秒後にデバッグ情報を隠す
        setTimeout(() => {
            const debugEl = document.getElementById('debugInfo');
            if (debugEl) debugEl.style.display = 'none';
        }, 3000);
    }
}

addDebug('Starting animation loop...');
animate();

// リサイズ対応
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

addDebug('✅ Game initialized successfully!');
