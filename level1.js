(() => {
    let initialized = false;
    let wallMat, floorMat, ceilMat;
    let wallGeo;
    const tvScreens = [];
    const tvLights = [];

    const CHUNK_SIZE = 8;
    const PREFAB_POOL = [
        // [0] スポーン安全チャンク（何もない家）
        [
            [1, 1, 1, 0, 0, 1, 1, 1],
            [1, 0, 1, 0, 0, 1, 0, 1],
            [1, 0, 1, 0, 0, 1, 0, 1],
            [1, 0, 0, 0, 0, 1, 0, 1],
            [1, 0, 1, 0, 0, 0, 0, 1],
            [1, 0, 1, 0, 0, 1, 0, 1],
            [1, 0, 1, 0, 0, 1, 0, 1],
            [1, 1, 1, 0, 0, 1, 1, 1]
        ],
        // [1] パターンA (何もない家)
        [
            [1, 1, 1, 0, 0, 1, 1, 1],
            [1, 0, 1, 0, 0, 1, 0, 1],
            [1, 0, 1, 0, 0, 1, 0, 1],
            [1, 0, 0, 0, 0, 1, 0, 1],
            [1, 0, 1, 0, 0, 0, 0, 1],
            [1, 0, 1, 0, 0, 1, 0, 1],
            [1, 0, 1, 0, 0, 1, 0, 1],
            [1, 1, 1, 0, 0, 1, 1, 1]
        ],
        // [2] パターンB (家具が散乱した家)
        [
            [1, 1, 1, 0, 0, 1, 1, 1],
            [1, 7, 1, 0, 0, 1, 0, 1],
            [1, 0, 1, 0, 0, 1, 7, 1],
            [1, 0, 0, 0, 0, 1, 0, 1],
            [1, 0, 1, 0, 0, 0, 0, 1],
            [1, 7, 1, 0, 0, 1, 0, 1],
            [1, 0, 1, 0, 0, 1, 7, 1],
            [1, 1, 1, 0, 0, 1, 1, 1]
        ],
        // [3] パターンC (テレビがつけっぱなしの家)
        [
            [1, 1, 1, 0, 0, 1, 1, 1],
            [1, 9, 1, 0, 0, 1, 0, 1],
            [1, 0, 1, 0, 0, 1, 0, 1],
            [1, 0, 0, 0, 0, 1, 0, 1],
            [1, 0, 1, 0, 0, 0, 0, 1],
            [1, 0, 1, 0, 0, 1, 9, 1],
            [1, 0, 1, 0, 0, 1, 0, 1],
            [1, 1, 1, 0, 0, 1, 1, 1]
        ],
        // [4] パターンD (次のレベルへの落とし穴がある家)
        [
            [1, 1, 1, 0, 0, 1, 1, 1],
            [1, 6, 1, 0, 0, 1, 0, 1],
            [1, 0, 1, 0, 0, 1, 0, 1],
            [1, 0, 0, 0, 0, 1, 0, 1],
            [1, 0, 1, 0, 0, 0, 6, 1],
            [1, 0, 1, 0, 0, 1, 0, 1],
            [1, 0, 1, 0, 0, 1, 0, 1],
            [1, 1, 1, 0, 0, 1, 1, 1]
        ]
    ];

    function generateTextures() {
        // 白い外壁（サイディング風）
        const wallCanvas = document.createElement('canvas');
        wallCanvas.width = 256;
        wallCanvas.height = 256;
        const ctxW = wallCanvas.getContext('2d');
        ctxW.fillStyle = '#f0f0f0';
        ctxW.fillRect(0, 0, 256, 256);
        ctxW.strokeStyle = '#cccccc';
        ctxW.lineWidth = 2;
        for (let y = 0; y < 256; y += 32) {
            ctxW.beginPath();
            ctxW.moveTo(0, y);
            ctxW.lineTo(256, y);
            ctxW.stroke();
        }
        ctxW.fillStyle = 'rgba(0,0,0,0.02)';
        for (let i = 0; i < 500; i++) {
            ctxW.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 4, Math.random() * 4);
        }

        // 道路（白いアスファルト/コンクリート）
        const floorCanvas = document.createElement('canvas');
        floorCanvas.width = 128;
        floorCanvas.height = 128;
        const ctxF = floorCanvas.getContext('2d');
        ctxF.fillStyle = '#e8e8e8';
        ctxF.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 3000; i++) {
            const colorVal = Math.random() * 20 - 10;
            ctxF.fillStyle = `rgba(${232 + colorVal}, ${232 + colorVal}, ${232 + colorVal}, 0.25)`;
            ctxF.fillRect(Math.random() * 128, Math.random() * 128, 1, 1);
        }

        const wallTex = new THREE.CanvasTexture(wallCanvas);
        const floorTex = new THREE.CanvasTexture(floorCanvas);

        floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;

        return { wallTex, floorTex };
    }

    function createIndustrialFurniture(bx, bz, seed) {
        const group = new THREE.Group();
        const type = Math.floor(seed * 3);

        if (type === 0) {
            // 事務机
            const deskTopGeo = new THREE.BoxGeometry(1.4, 0.08, 0.8);
            const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 });
            const deskTop = new THREE.Mesh(deskTopGeo, woodMat);
            deskTop.position.set(0, 0.75, 0);
            group.add(deskTop);

            const legGeo = new THREE.BoxGeometry(0.08, 0.75, 0.08);
            const legMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
            const legPositions = [
                [-0.6, 0.375, -0.3],
                [0.6, 0.375, -0.3],
                [-0.6, 0.375, 0.3],
                [0.6, 0.375, 0.3]
            ];
            legPositions.forEach(pos => {
                const leg = new THREE.Mesh(legGeo, legMat);
                leg.position.set(pos[0], pos[1], pos[2]);
                group.add(leg);
            });
        } else if (type === 1) {
            // 倒れたキャビネット
            const lockerGeo = new THREE.BoxGeometry(0.6, 1.8, 0.6);
            const lockerMat = new THREE.MeshStandardMaterial({ color: 0x708090, roughness: 0.5, metalness: 0.5 });
            const locker = new THREE.Mesh(lockerGeo, lockerMat);
            locker.rotation.z = Math.PI / 2.2;
            locker.position.set(0, 0.3, 0);
            group.add(locker);
        } else {
            // 椅子
            const seatGeo = new THREE.BoxGeometry(0.5, 0.05, 0.5);
            const plasticMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.6 });
            const seat = new THREE.Mesh(seatGeo, plasticMat);
            seat.position.set(0, 0.45, 0);
            group.add(seat);

            const backGeo = new THREE.BoxGeometry(0.5, 0.4, 0.05);
            const back = new THREE.Mesh(backGeo, plasticMat);
            back.position.set(0, 0.65, -0.225);
            group.add(back);

            const legGeo = new THREE.BoxGeometry(0.04, 0.45, 0.04);
            const metalMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.3, metalness: 0.8 });
            const legPositions = [
                [-0.2, 0.225, -0.2],
                [0.2, 0.225, -0.2],
                [-0.2, 0.225, 0.2],
                [0.2, 0.225, 0.2]
            ];
            legPositions.forEach(pos => {
                const leg = new THREE.Mesh(legGeo, metalMat);
                leg.position.set(pos[0], pos[1], pos[2]);
                group.add(leg);
            });
        }

        group.position.set(bx, 0, bz);
        group.rotation.y = seed * Math.PI * 2;
        return group;
    }

    const config = {
        fogColor: 0xd5e2f0,
        fogDensity: 0.025,
        ambientColor: 0xd0e0ff,
        ambientIntensity: 0.85,
        spawnPosition: [4, 4],
        spawnYaw: 0,
        nextLevelId: 'level0',
        floorMat: null,
        ceilMat: null,

        init: function(scene) {
            if (initialized) return;

            const GRID_SCALE = window.Backrooms.GRID_SCALE;

            const textures = generateTextures();
            wallMat = new THREE.MeshStandardMaterial({ map: textures.wallTex, roughness: 0.8, metalness: 0.1 });
            floorMat = new THREE.MeshStandardMaterial({ map: textures.floorTex, roughness: 0.9, metalness: 0.1 });
            ceilMat = new THREE.MeshBasicMaterial({ visible: false });

            this.floorMat = floorMat;
            this.ceilMat = ceilMat;

            wallGeo = new THREE.BoxGeometry(GRID_SCALE, 16.0, GRID_SCALE);

            initialized = true;

            // 点滅アニメーションの登録
            if (typeof window !== 'undefined' && !window.tvAnimationStarted) {
                window.tvAnimationStarted = true;
                function animateTV() {
                    requestAnimationFrame(animateTV);
                    const time = Date.now() * 0.005;
                    const flicker = Math.sin(time * 10) * Math.cos(time * 3) * 0.3 + 0.7 + (Math.random() * 0.2 - 0.1);
                    const intensity = Math.max(0.2, Math.min(2.0, flicker * 1.5));
                    
                    for (let i = tvScreens.length - 1; i >= 0; i--) {
                        const mat = tvScreens[i];
                        const light = tvLights[i];
                        if (light && light.parent) {
                            const baseColor = new THREE.Color(0xa0e0ff);
                            mat.color.copy(baseColor).multiplyScalar(intensity);
                            light.intensity = intensity * 1.5;
                        } else {
                            tvScreens.splice(i, 1);
                            tvLights.splice(i, 1);
                        }
                    }
                }
                animateTV();
            }
        },

        getTileType: function(gridX, gridZ, seed) {
            const chunkX = Math.floor(gridX / CHUNK_SIZE);
            const chunkZ = Math.floor(gridZ / CHUNK_SIZE);
            const localX = ((gridX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
            const localZ = ((gridZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

            let prefabIndex = 0;
            if (chunkX === 0 && chunkZ === 0) {
                prefabIndex = 0;
            } else {
                const chunkSeed = window.Backrooms.getRand(chunkX, chunkZ, 0);
                prefabIndex = Math.floor(chunkSeed * (PREFAB_POOL.length - 1)) + 1;
            }

            return PREFAB_POOL[prefabIndex][localZ][localX];
        },

        generateTileObject: function(gx, gz, type, bx, bz, tile, scene) {
            const GRID_SCALE = window.Backrooms.GRID_SCALE;
            let mesh = null;

            // 1. 青空（高さ 16.0 に配置する水色の天井）
            const skyGeo = new THREE.PlaneGeometry(GRID_SCALE, GRID_SCALE);
            const skyMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.DoubleSide });
            const skyMesh = new THREE.Mesh(skyGeo, skyMat);
            skyMesh.position.set(bx, 16.0, bz);
            skyMesh.rotation.x = Math.PI / 2;
            scene.add(skyMesh);
            tile.meshes.push(skyMesh);

            const localX = ((gx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

            // 2. 家の中の床（ベージュのカーペットを敷く）
            if ((localX === 1 || localX === 6) && type !== 6) {
                const carpetGeo = new THREE.BoxGeometry(GRID_SCALE, 0.02, GRID_SCALE);
                const carpetMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.9 });
                const carpet = new THREE.Mesh(carpetGeo, carpetMat);
                carpet.position.set(bx, 0.01, bz);
                scene.add(carpet);
                tile.meshes.push(carpet);
            }

            // 3. タイルに応じたオブジェクトの構築
            if (type === 1) {
                // 家の壁 (高さ 16.0)
                mesh = new THREE.Mesh(wallGeo, wallMat);
                mesh.position.set(bx, 8.0, bz);
            } 
            else if (type === 7) {
                // 家具
                const fSeed = window.Backrooms.getRand(gx, gz, 3);
                const furnitureGroup = createIndustrialFurniture(bx, bz, fSeed);
                scene.add(furnitureGroup);
                tile.meshes.push(furnitureGroup);

                const box = new THREE.Box3().setFromObject(furnitureGroup);
                tile.colliders.push(box);
            }
            else if (type === 9) {
                // レトロなテレビ (つけっぱなし)
                const tvGroup = new THREE.Group();
                
                const bodyGeo = new THREE.BoxGeometry(0.8, 0.6, 0.6);
                const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5 });
                const tvBody = new THREE.Mesh(bodyGeo, bodyMat);
                tvBody.position.set(0, 0.3, 0);
                tvGroup.add(tvBody);

                const screenGeo = new THREE.PlaneGeometry(0.7, 0.5);
                const screenMat = new THREE.MeshBasicMaterial({ color: 0xa0e0ff });
                const tvScreen = new THREE.Mesh(screenGeo, screenMat);
                tvScreen.position.set(0, 0.3, 0.301);
                tvGroup.add(tvScreen);

                const tvLight = new THREE.PointLight(0xa0e0ff, 1.5, 5);
                tvLight.position.set(0, 0.3, 0.6);
                tvGroup.add(tvLight);

                tvGroup.position.set(bx, 0, bz);

                if (localX === 1) {
                    tvGroup.rotation.y = Math.PI / 2;
                } else {
                    tvGroup.rotation.y = -Math.PI / 2;
                }

                scene.add(tvGroup);
                tile.meshes.push(tvGroup);

                const box = new THREE.Box3().setFromObject(tvGroup);
                tile.colliders.push(box);

                tvScreens.push(screenMat);
                tvLights.push(tvLight);
            }

            if (mesh) {
                scene.add(mesh);
                tile.meshes.push(mesh);
                const box = new THREE.Box3().setFromObject(mesh);
                tile.colliders.push(box);
            }
        }
    };

    window.Backrooms.registerLevel('level1', config);
})();