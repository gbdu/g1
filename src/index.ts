import { CharacterControls, CONTROLLER_BODY_RADIUS } from './utils/characterControls';
import { KeyDisplay } from './utils/keydisplay';
import { RigidBody, World } from '@dimforge/rapier3d';
import * as THREE from 'three';
import { AmbientLight, BoxBufferGeometry, MeshPhongMaterial } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

// CAMERA
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 5;
camera.position.z = 10;
camera.position.x = -13;


// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true

// ORBIT CAMERA CONTROLS
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true
orbitControls.enablePan = true
orbitControls.minDistance = 35
orbitControls.maxDistance = 65
//orbitControls.maxPolarAngle = Math.PI / 2 - 0.05 // prevent camera below ground
orbitControls.maxPolarAngle = Math.PI / 3 - 0.05 // prevent camera below ground
orbitControls.minPolarAngle = Math.PI / 4        // prevent top down view
orbitControls.update();

const dLight = new THREE.DirectionalLight('white', 0.6);
dLight.position.x = 20;
dLight.position.y = 30;
dLight.castShadow = true;
dLight.shadow.mapSize.width = 2048;
dLight.shadow.mapSize.height = 2048;
const d = 35;
dLight.shadow.camera.left = - d;
dLight.shadow.camera.right = d;
dLight.shadow.camera.top = d;
dLight.shadow.camera.bottom = - d;
scene.add(dLight);

const aLight = new THREE.AmbientLight('white', 0.4);
scene.add(aLight);

// ANIMATE
document.body.appendChild(renderer.domElement);

// RESIZE HANDLER
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

function loadTexture(path: string): THREE.Texture {
    const texture = new THREE.TextureLoader().load(path);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.x = 10;
    texture.repeat.y = 10;
    return texture;
}

//

let threeFloor : THREE.Mesh ;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const geometryHelper = new THREE.ConeGeometry( 3, 3, 3 );
geometryHelper.scale( 1/3,1/3,1/3 );
geometryHelper.rotateX( Math.PI / 2 );
let helper = new THREE.Mesh( geometryHelper, new THREE.MeshNormalMaterial() );
scene.add( helper );

function onPointerMove( event: {clientX: number, clientY: number}) {
    pointer.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;
    raycaster.setFromCamera( pointer, camera );

    // See if the ray from the camera into the world hits one of our meshes
    const intersects = raycaster.intersectObject( threeFloor );

    // Toggle rotation bool for meshes that we clicked
    if ( intersects.length > 0 ) {
        helper.position.set( 0, 0, 0 );
        helper.lookAt( intersects[ 0 ].face.normal );

        helper.position.copy( intersects[ 0 ].point );
    }
}


let cubeGeo: any;
let cubeMaterial: any;
let objects: any[] = [];
function onPointerDown( event: any ) {
    pointer.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;
    raycaster.setFromCamera( pointer, camera );

    const intersects = raycaster.intersectObject( threeFloor );

    if ( intersects.length > 0 ) {

        const intersect = intersects[ 0 ];


            const voxel = new THREE.Mesh( cubeGeo, cubeMaterial );
            voxel.position.copy( intersect.point ).add( intersect.face.normal );
            voxel.position.divideScalar( 50 ).floor().multiplyScalar( 50 ).addScalar( 25 );
            scene.add( voxel );

            objects.push( voxel );

    }

}

// MODEL WITH ANIMATIONS
var characterControls: CharacterControls

import('@dimforge/rapier3d').then(RAPIER => {

    function body(scene: THREE.Scene, world: World,
        bodyType: 'dynamic' | 'static' | 'kinematicPositionBased',
        colliderType: 'cube' | 'sphere' | 'cylinder' | 'cone', dimension: any,
        translation: { x: number, y: number, z: number },
        rotation: { x: number, y: number, z: number },
        color: string): { rigid: RigidBody, mesh: THREE.Mesh } {

        let bodyDesc

        if (bodyType === 'dynamic') {
            bodyDesc = RAPIER.RigidBodyDesc.dynamic();
        } else if (bodyType === 'kinematicPositionBased') {
            bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
        } else if (bodyType === 'static') {
            bodyDesc = RAPIER.RigidBodyDesc.fixed();
            bodyDesc.setCanSleep(false);
        }

        if (translation) {
            bodyDesc.setTranslation(translation.x, translation.y, translation.z)
        }
        if(rotation) {
            const q = new THREE.Quaternion().setFromEuler(
                new THREE.Euler( rotation.x, rotation.y, rotation.z, 'XYZ' )
            )
            bodyDesc.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
        }

        let rigidBody = world.createRigidBody(bodyDesc);

        let collider;
        if (colliderType === 'cube') {
            collider = RAPIER.ColliderDesc.cuboid(dimension.hx, dimension.hy, dimension.hz);
        } else if (colliderType === 'sphere') {
            collider = RAPIER.ColliderDesc.ball(dimension.radius);
        } else if (colliderType === 'cylinder') {
            collider = RAPIER.ColliderDesc.cylinder(dimension.hh, dimension.radius);
        } else if (colliderType === 'cone') {
            collider = RAPIER.ColliderDesc.cone(dimension.hh, dimension.radius);
            // cone center of mass is at bottom
            collider.centerOfMass = {x:0, y:0, z:0}
        }
        world.createCollider(collider, rigidBody.handle);

        let bufferGeometry;
        if (colliderType === 'cube') {
            bufferGeometry = new BoxBufferGeometry(dimension.hx * 2, dimension.hy * 2, dimension.hz * 2);
        } else if (colliderType === 'sphere') {
            bufferGeometry = new THREE.SphereBufferGeometry(dimension.radius, 32, 32);
        } else if (colliderType === 'cylinder') {
            bufferGeometry = new THREE.CylinderBufferGeometry(dimension.radius/2, 
                dimension.radius/2, dimension.hh * 2, 32, 32);
        } else if (colliderType === 'cone') {
            bufferGeometry = new THREE.ConeBufferGeometry(dimension.radius, dimension.hh * 2,  
                32, 32);
        }

        const threeMesh = new THREE.Mesh(bufferGeometry, new MeshPhongMaterial({ color: color }));
        threeMesh.castShadow = true;
        threeMesh.receiveShadow = true;
        scene.add(threeMesh);

        return { rigid: rigidBody, mesh: threeMesh };
    }

    function generateTerrain(nsubdivs: number, scale: { x: number, y: number, z: number }) {
        let heights: number[] = []
    
        // three plane
        threeFloor = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(scale.x, scale.z, nsubdivs, nsubdivs),
            new THREE.MeshStandardMaterial({
                 map: loadTexture('/textures/grass/Grass_005_BaseColor.jpg'),
                 normalMap: loadTexture('/textures/grass/Grass_005_Normal.jpg'),
                 aoMap: loadTexture('/textures/grass/Grass_005_AmbientOcclusion.jpg'),
                 roughnessMap: loadTexture('/textures/grass/Grass_005_Roughness.jpg'),
                 roughness: 0.6
            }));
        threeFloor.rotateX(- Math.PI / 2);
        threeFloor.receiveShadow = true;
        threeFloor.castShadow = true;
        scene.add(threeFloor);
    
        // add height data to plane
        const vertices = threeFloor.geometry.attributes.position.array;
        const dx = scale.x / nsubdivs;
        const dy = scale.z / nsubdivs;
        // store height data in map column-row map
        const columsRows = new Map();
        for (let i = 0; i < vertices.length; i += 3) {
            // translate into colum / row indices
            let row = Math.floor(Math.abs((vertices as any)[i] + (scale.x / 2)) / dx);
            let column = Math.floor(Math.abs((vertices as any)[i + 1] - (scale.z / 2)) / dy);
            // generate height for this column & row
            const randomHeight = Math.random();
            (vertices as any)[i + 2] = scale.y * randomHeight/2;
            // store height
            if (!columsRows.get(column)) {
                columsRows.set(column, new Map());
            }
            columsRows.get(column).set(row, randomHeight/2);
        }
        threeFloor.geometry.computeVertexNormals();

        // store height data into column-major-order matrix array
        for (let i = 0; i <= nsubdivs; ++i) {
            for (let j = 0; j <= nsubdivs; ++j) {
                heights.push(columsRows.get(j).get(i));
            }
        }
    
        let groundBodyDesc = RAPIER.RigidBodyDesc.fixed();
        let groundBody = world.createRigidBody(groundBodyDesc);
        let groundCollider = RAPIER.ColliderDesc.heightfield(
            nsubdivs, nsubdivs, new Float32Array(heights), scale
        );
        world.createCollider(groundCollider, groundBody.handle);
    }

    // Use the RAPIER module here.
    let gravity = { x: 0.0, y: -30, z: 0.0 };
    let world = new RAPIER.World(gravity);

    // Bodys
    const bodys: { rigid: RigidBody, mesh: THREE.Mesh }[] = []

    cubeGeo = new THREE.BoxGeometry( 5, 5, 5 );
    cubeMaterial = new THREE.MeshLambertMaterial( { color: 0xfeb74c, map: new THREE.TextureLoader().load( 'textures/square-outline-textured.png' ) } );

    // Create Ground.
    let nsubdivs = 10;

    let scale = new RAPIER.Vector3(150.0, 3.0, 150.0);

    generateTerrain(nsubdivs, scale);

    const cubeBody = body(scene, world, 'dynamic', 'cube',
        { hx: 0.5, hy: 0.5, hz: 0.5 }, { x: 0, y: 15, z: 0 },
        { x: 0, y: 0.4, z: 0.7 }, 'orange');
    bodys.push(cubeBody);

    const sphereBody = body(scene, world, 'dynamic', 'sphere',
        { radius: 0.7 }, { x: 4, y: 15, z: 2 },
        { x: 0, y: 1, z: 0 }, 'blue');
    bodys.push(sphereBody);

    const sphereBody2 = body(scene, world, 'dynamic', 'sphere',
        { radius: 0.7 }, { x: 0, y: 15, z: 0 },
        { x: 0, y: 1, z: 0 }, 'red');
    bodys.push(sphereBody2);

    const cylinderBody = body(scene, world, 'dynamic', 'cylinder',
        { hh: 1.0, radius: 0.7 }, { x: -7, y: 15, z: 8 },
        { x: 0, y: 1, z: 0 }, 'green');
    bodys.push(cylinderBody);

    const coneBody = body(scene, world, 'dynamic', 'cone',
        { hh: 1.0, radius: 1 }, { x: 7, y: 15, z: -8 },
        { x: 0, y: 1, z: 0 }, 'purple');
    bodys.push(coneBody);

    const coneBody2 = body(scene, world, 'dynamic', 'cone',
        { hh: 1.0, radius: 1 }, { x: 7, y: 15, z: -18 },
        { x: 0, y: 1, z: 0 }, 'purple');
    bodys.push(coneBody2);

    const coneBody3 = body(scene, world, 'dynamic', 'cone',
        { hh: 1.0, radius: 1 }, { x: 7, y: 15, z: -28 },
        { x: 0, y: 1, z: 0 }, 'purple');
    bodys.push(coneBody3);

    // character controller
    new GLTFLoader().load('models/Soldier.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object: any) {
            if (object.isMesh) object.castShadow = true;
        });
        scene.add(model);
    
        const gltfAnimations: THREE.AnimationClip[] = gltf.animations;
        const mixer = new THREE.AnimationMixer(model);
        const animationsMap: Map<string, THREE.AnimationAction> = new Map()
        gltfAnimations.filter(a => a.name != 'TPose').forEach((a: THREE.AnimationClip) => {
            animationsMap.set(a.name, mixer.clipAction(a))
        })
    

        // RIGID BODY
        let bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(-1, 3, 1)
        let rigidBody = world.createRigidBody(bodyDesc);
        let dynamicCollider = RAPIER.ColliderDesc.ball(CONTROLLER_BODY_RADIUS);
        world.createCollider(dynamicCollider, rigidBody.handle);

        characterControls = new CharacterControls(model, mixer, 
            animationsMap, orbitControls, 
            camera,  'Idle',
            new RAPIER.Ray( 
                { x: 0, y: 0, z: 0 },
                { x: 0, y: -1, z: 0} 
            ), rigidBody)
    });

    const clock = new THREE.Clock();
    // Game loop.
    let gameLoop = () => {
        let deltaTime = clock.getDelta();

        if (characterControls) {
            characterControls.update(world, deltaTime, keysPressed);
        }

        // Step the simulation forward.  
        world.step();
        // update 3d world with physical world
        bodys.forEach(body => {
            let position = body.rigid.translation();
            let rotation = body.rigid.rotation();

            body.mesh.position.x = position.x
            body.mesh.position.y = position.y
            body.mesh.position.z = position.z

            body.mesh.setRotationFromQuaternion(
                new THREE.Quaternion(rotation.x,
                    rotation.y,
                    rotation.z,
                    rotation.w));
        });

        orbitControls.update()
        renderer.render(scene, camera);

        setTimeout(gameLoop, 16);
    };

    gameLoop();
})


const keysPressed: any = {}
const keyDisplayQueue = new KeyDisplay();

document.addEventListener( 'pointermove', onPointerMove );

document.addEventListener( 'pointerdown', onPointerDown );

document.addEventListener('keydown', (event) => {
    keyDisplayQueue.down(event.key)
    if (event.shiftKey && characterControls) {
        characterControls.switchRunToggle()
    }
    keysPressed[event.key.toLowerCase()] = true
}, false);
document.addEventListener('keyup', (event) => {
    keyDisplayQueue.up(event.key);
    keysPressed[event.key.toLowerCase()] = false
}, false);