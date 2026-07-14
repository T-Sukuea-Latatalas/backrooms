(() => {
    let initialized = false;
    let wallMat, floorMat, ceilMat, graffitiMaterials = [];
    let wallGeo, pillarGeo, thinWallXGeo, thinWallZGeo, gapWallGeo;
    let woodMat, metalMat, deskTopGeo, deskLegGeo, chairSeatGeo, chairBackGeo, chairLegGeo, lockerBodyGeo;

    const CHUNK_SIZE = 8;
    const PREFAB_POOL = [
        // [0] 初期スポーン部屋（0,0専用）
        [
            [1,1,1,0,0,1,1,1],
            [1,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,1],
            [0,0,0,0,2,0,0,0],
            [0,0,0,0,0,0,0,0],
            [1,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,1],
            [1,1,1,0,0,1,1,1]
        ],
        // [1] 大広間 (Pillars Hall)
        [
            [1,1,1,0,0,1,1,1],
            [1,0,0,0,0,0,0,1],
            [1,0,2,0,0,2,0,1],
            [0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0],
            [1,0,2,0,0,2,0,1],
            [1,0,0,0,0,0,0,1],
            [1,1,1,0,0,1,1,1]
        ],
        // [2] オフィスパーテーション (Cubicles)
        [
            [1,1,1,0,0,1,1,1],
            [1,0,0,0,4,0,0,1],
            [1,3,3,0,4,0,3,1],
            [0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0],
            [1,4,0,0,3,3,0,1],
            [1,4,0,0,0,0,0,1],
            [1,1,1,0,0,1,1,1]
        ],
        // [3] 長い廊下と交差点 (Corridors)
        [
            [1,1,1,0,0,1,1,1],
            [1,1,1,0,0,1,1,1],
            [1,1,1,0,0,1,1,1],
            [0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0],
            [1,1,1,0,0,1,1,1],
            [1,1,1,0,0,1,1,1],
            [1,1,1,0,0,1,1,1]
        ],
        // [4] 広い空間と狭い隙間 (Crevices Room)
        [
            [1,1,1,0,0,1,1,1],
            [1,0,0,0,0,0,0,1],
            [1,0,5,0,0,5,0,1],
            [0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0],
            [1,0,5,0,0,5,0,1],
            [1,0,0,0,0,0,0,1],
            [1,1,1,0,0,1,1,1]
        ],
        // [5] 散らかったオフィス (Cluttered Office)
        [
            [1,1,1,0,0,1,1,1],
            [1,0,7,0,0,7,0,1],
            [1,0,0,0,0,0,0,1],
            [0,0,0,0,0,0,0,0],
            [0,0,7,0,0,7,0,0],
            [1,0,0,0,0,0,0,1],
            [1,0,7,0,0,0,0,1],
            [1,1,1,0,0,1,1,1]
        ],
        // [6] 奈落の部屋 (The Pit Room)
        [
            [1,1,1,0,0,1,1,1],
            [1,0,0,0,0,0,0,1],
            [1,0,6,0,0,6,0,1],
            [0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0],
            [1,0,6,0,0,6,0,1],
            [1,0,0,0,0,0,0,1],
            [1,1,1,0,0,1,1,1]
        ],
        // [7] 不気味な落書き部屋 (Warning Room)
        [
            [1,8,1,0,0,1,8,1],
            [8,0,0,0,0,0,0,8],
            [1,0,0,0,0,0,0,1],
            [0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0],
            [1,0,0,0,0,0,0,1],
            [8,0,0,0,0,0,0,8],
            [1,8,1,0,0,1,8,1]
        ]
    ];

    function generateTextures() {
        // 標準壁紙（黄色系）
        const wallCanvas = document.createElement('canvas');
        wallCanvas.width = 256;
        wallCanvas.height = 256;
        const ctxW = wallCanvas.getContext('2d');
        ctxW.fillStyle = '#dbcca0';
        ctxW.fillRect(0, 0, 256, 256);
        ctxW.fillStyle = '#bfae80';
        for (let i = 0; i < 256; i += 16) {
            ctxW.fillRect(i, 0, 4, 256);
        }
        ctxW.fillStyle = 'rgba(0,0,0,0.03)';
        for (let i = 0; i < 500; i++) {
            ctxW.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 8, Math.random() * 8);
        }

        // 床（湿った薄汚い茶色のカーペット）
        const floorCanvas = document.createElement('canvas');
        floorCanvas.width = 128;
        floorCanvas.height = 128;
        const ctxF = floorCanvas.getContext('2d');
        ctxF.fillStyle = '#807050';
        ctxF.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 5000; i++) {
            const colorVal = Math.random() * 20 - 10;
            ctxF.fillStyle = `rgba(${colorVal}, ${colorVal}, ${colorVal}, 0.12)`;
            ctxF.fillRect(Math.random() * 128, Math.random() * 128, 1, 1);
        }

        // 天井
        const ceilCanvas = document.createElement('canvas');
        ceilCanvas.width = 256;
        ceilCanvas.height = 256;
        const ctxC = ceilCanvas.getContext('2d');
        ctxC.fillStyle = '#dfdfd0';
        ctxC.fillRect(0, 0, 256, 256);
        ctxC.strokeStyle = '#9c9c8a';
        ctxC.lineWidth = 4;
        ctxC.strokeRect(0, 0, 256, 256);
        ctxC.fillStyle = '#b0b0a0';
        for (let i = 0; i < 400; i++) {
            ctxC.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
        }

        const wallTex = new THREE.CanvasTexture(wallCanvas);
        const floorTex = new THREE.CanvasTexture(floorCanvas);
        const ceilTex = new THREE.CanvasTexture(ceilCanvas);

        floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
        ceilTex.wrapS = ceilTex.wrapT = THREE.RepeatWrapping;

        return { wallTex, floorTex, ceilTex };
    }

    function generateGraffitiTextures() {
        const texts = ['RUN', 'HELP', 'TURN BACK', 'IT IS HERE', 'STAY AWAY'];
        const list = [];
        for (let idx = 0; idx < texts.length; idx++) {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#dbcca0';
            ctx.fillRect(0, 0, 256, 256);
            ctx.fillStyle = '#bfae80';
            for (let i = 0; i < 256; i += 16) {
                ctx.fillRect(i, 0, 4, 256);
            }
            ctx.fillStyle = 'rgba(0,0,0,0.03)';
            for (let i = 0; i < 400; i++) {
                ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 8, Math.random() * 8);
            }

            ctx.font = 'bold 36px "Courier New", monospace';
            ctx.fillStyle = 'rgba(150, 10, 10, 0.85)';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 4;

            ctx.save();
            ctx.translate(128, 128);
            ctx.rotate((Math.random() * 0.4 - 0.2));
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(texts[idx], 0, 0);

            if (idx === 1 || idx === 3) {
                ctx.fillText('||||', -30, 42);
                ctx.lineWidth = 4;
                ctx.strokeStyle = 'rgba(150, 10, 10, 0.85)';
                ctx.beginPath();
                ctx.moveTo(-42, 56);
                ctx.lineTo(20, 26);
                ctx.stroke();
            } else if (idx === 2) {
                ctx.lineWidth = 5;
                ctx.strokeStyle = 'rgba(150, 10, 10, 0.85)';
                ctx.beginPath();
                ctx.moveTo(-35, 45);
                ctx.lineTo(35, 45);
                ctx.lineTo(15, 25);
                ctx.moveTo(35, 45);
                ctx.lineTo(15, 65);
                ctx.stroke();
            }
            ctx.restore();

            list.push(new THREE.CanvasTexture(canvas));
        }
        return list;
    }

    function createFurnitureGroup(bx, bz, seed) {
        const group = new THREE.Group();
        const type = Math.floor(seed * 3);

        if (type === 0) {
            const top = new THREE.Mesh(deskTopGeo, woodMat);
            top.position.set(0, 0.85, 0);
            group.add(top);

            const offsets = [
                [-0.7, 0.425, -0.4], [0.7, 0.425, -0.4],
                [-0.7, 0.425, 0.4], [0.7, 0.425, 0.4]
            ];
            offsets.forEach(pos => {
                const leg = new THREE.Mesh(deskLegGeo, metalMat);
                leg.position.set(pos[0], pos[1], pos[2]);
                group.add(leg);
            });
        } else if (type === 1) {
            const locker = new THREE.Mesh(lockerBodyGeo, metalMat);
            locker.position.set(0, 0.45, 0);
            locker.rotation.z = Math.PI / 2.3;
            locker.rotation.x = Math.PI / 8;
            group.add(locker);
        } else {
            const seat = new THREE.Mesh(chairSeatGeo, metalMat);
            seat.position.set(0, 0.6, 0);
            group.add(seat);

            const back = new THREE.Mesh(chairBackGeo, metalMat);
            back.position.set(0, 0.85, -0.28);
            group.add(back);

            const leg = new THREE.Mesh(chairLegGeo, metalMat);
            leg.position.set(0, 0.3, 0);
            group.add(leg);
        }

        group.position.set(bx, 0, bz);
        group.rotation.y = seed * Math.PI * 2;
        return group;
    }

    const config = {
        fogColor: 0x13130c,
        fogDensity: 0.055,
        ambientColor: 0x2c2c1c,
        ambientIntensity: 0.38,
        spawnPosition: [4, 4],
        spawnYaw: 0,
        nextLevelId: 'level1',
        floorMat: null,
        ceilMat: null,

        init: function(scene) {
            if (initialized) return;

            const GRID_SCALE = window.Backrooms.GRID_SCALE;

            const textures = generateTextures();
            wallMat = new THREE.MeshStandardMaterial({ map: textures.wallTex, roughness: 0.8, metalness: 0.1 });
            floorMat = new THREE.MeshStandardMaterial({ map: textures.floorTex, roughness: 0.9, metalness: 0.0 });
            ceilMat = new THREE.MeshStandardMaterial({ map: textures.ceilTex, roughness: 0.7, metalness: 0.1 });

            this.floorMat = floorMat;
            this.ceilMat = ceilMat;

            const graffitiTexList = generateGraffitiTextures();
            graffitiMaterials = graffitiTexList.map(tex => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0.1 }));

            wallGeo = new THREE.BoxGeometry(GRID_SCALE, GRID_SCALE, GRID_SCALE);
            pillarGeo = new THREE.BoxGeometry(0.6, GRID_SCALE, 0.6);
            thinWallXGeo = new THREE.BoxGeometry(GRID_SCALE, GRID_SCALE, 0.25);
            thinWallZGeo = new THREE.BoxGeometry(0.25, GRID_SCALE, GRID_SCALE);
            gapWallGeo = new THREE.BoxGeometry(3.3, GRID_SCALE, GRID_SCALE);

            woodMat = new THREE.MeshStandardMaterial({ color: 0x4a3b2c, roughness: 0.85 });
            metalMat = new THREE.MeshStandardMaterial({ color: 0x6a6a6a, roughness: 0.5, metalness: 0.4 });
            deskTopGeo = new THREE.BoxGeometry(1.6, 0.08, 1.0);
            deskLegGeo = new THREE.BoxGeometry(0.1, 0.85, 0.1);
            chairSeatGeo = new THREE.BoxGeometry(0.6, 0.08, 0.6);
            chairBackGeo = new THREE.BoxGeometry(0.6, 0.5, 0.08);
            chairLegGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6);
            lockerBodyGeo = new THREE.BoxGeometry(0.9, 2.2, 0.7);

            initialized = true;
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

            if (type === 1) {
                mesh = new THREE.Mesh(wallGeo, wallMat);
                mesh.position.set(bx, GRID_SCALE / 2, bz);
            } 
            else if (type === 2) {
                mesh = new THREE.Mesh(pillarGeo, wallMat);
                mesh.position.set(bx, GRID_SCALE / 2, bz);
            } 
            else if (type === 3) {
                mesh = new THREE.Mesh(thinWallXGeo, wallMat);
                mesh.position.set(bx, GRID_SCALE / 2, bz);
            } 
            else if (type === 4) {
                mesh = new THREE.Mesh(thinWallZGeo, wallMat);
                mesh.position.set(bx, GRID_SCALE / 2, bz);
            } 
            else if (type === 5) {
                mesh = new THREE.Mesh(gapWallGeo, wallMat);
                mesh.position.set(bx - 0.35, GRID_SCALE / 2, bz);
            }
            else if (type === 7) {
                const fSeed = window.Backrooms.getRand(gx, gz, 3);
                const furnitureGroup = createFurnitureGroup(bx, bz, fSeed);
                scene.add(furnitureGroup);
                tile.meshes.push(furnitureGroup);

                const box = new THREE.Box3().setFromObject(furnitureGroup);
                tile.colliders.push(box);
            }
            else if (type === 8) {
                const gIndex = Math.floor(window.Backrooms.getRand(gx, gz, 4) * graffitiMaterials.length);
                mesh = new THREE.Mesh(wallGeo, graffitiMaterials[gIndex]);
                mesh.position.set(bx, GRID_SCALE / 2, bz);
            }

            if (mesh) {
                scene.add(mesh);
                tile.meshes.push(mesh);
                const box = new THREE.Box3().setFromObject(mesh);
                tile.colliders.push(box);
            }
        }
    };

    window.Backrooms.registerLevel('level0', config);
})();