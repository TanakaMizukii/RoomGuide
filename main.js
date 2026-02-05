import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomModelFiles, FurnitureModelFiles } from "./ModelInfo.js";
import { Raycaster, Vector2 } from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

// --- グローバル変数 ---
let renderer, scene, camera, controls, transControls;
let floor, gizmo;
const models = [];
const group = new THREE.Group();
const loader = new GLTFLoader();
const raycaster = new Raycaster();

let currentIndex = 0;
let currentAngle = 0;
const step = THREE.MathUtils.degToRad(360 / RoomModelFiles.length);


// --- 初期化 ---

// --- メインキャンバス部分 ---
const canvasElement = document.querySelector("#three-canvas");
renderer = new THREE.WebGLRenderer({
    canvas: canvasElement,
    antialias: true,
    setPixelRatio: devicePixelRatio,
});

const width = window.innerWidth;
const height = window.innerHeight;
renderer.setSize(width, height);

scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xeeeeee, 20, 120);
scene.background = new THREE.Color(0xeeeeee);

camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 10000);
camera.position.set(10, 10, 110);

controls = new OrbitControls(camera, canvasElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.2;
controls.target.set(0, 0, 100);

// --- 照明 ---
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1);
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(directionalLight, ambientLight);

// --- 家具配置用の床作成 ---
floor = new THREE.PlaneGeometry(30, 30);
const floorMaterial = new THREE.MeshBasicMaterial(0x000000);
const floorMesh = new THREE.Mesh(floor, floorMaterial);
floorMesh.position.set(0, -0.11, 100);
floorMesh.rotateX(-Math.PI / 2);
floorMesh.visible = false;
scene.add(floorMesh);

// --- オブジェクト移動用Transform ---
transControls = new TransformControls(camera, canvasElement);
transControls.showY = false;
gizmo = transControls.getHelper();
scene.add(gizmo);
transControls.setMode('translate');
gizmo.visible = false;

// --- TransformControls競合回避用 ---
transControls.addEventListener('dragging-changed', (e) => {
    if (controls) controls.enabled = !e.value;
});

// 部屋モデル格納用グループ追加
scene.add(group);

// --- モデルとイベントリスナー ---
loadInitialModels();
setupEventListeners();

// --- アニメーション開始 ---
tick();

// --- 関数定義 ---
function loadInitialModels() {
    const radius = 100;
    let modelDeg = 0;
    RoomModelFiles.forEach((file, i) => {
        loader.load(`./models/${file}`, (gltf) => {
            const model = gltf.scene;
            const angle = (i / RoomModelFiles.length) * Math.PI * 2 + Math.PI * 0.5;
            model.position.set(
                0,
                radius * Math.cos(angle) + 0.12,
                radius * Math.sin(angle),
            );
            model.rotation.y = modelDeg;
            modelDeg += Math.PI / 2;
            models.push(model);
            group.add(model);
        });
    });
}

// --- イベントリスナー ---
function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('wheel', onWheel, { passive: false });

    const canvas = renderer.domElement;
    canvas.addEventListener('dragover', onDragOver);
    canvas.addEventListener('drop', onDrop);
    canvas.addEventListener('click', onClick);

    const sidebar = document.getElementById('sidebar');
    sidebar.addEventListener('dragstart', onDragStart);
}

// --- リサイズ ---
function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

// --- ホイール部屋移動 ---
function onWheel(event) {
    if (event.target.closest('.sidebar')) return;

    const stageElement = document.querySelector('.stage');
    const stageRect = stageElement.getBoundingClientRect();
    const triggerY = stageRect.top + (stageRect.height * 0.8);

    if (event.clientY >= triggerY) {
        const direction = event.deltaY > 0 ? 1 : -1;
        currentIndex = (currentIndex + direction + models.length) % models.length;
        switchModel();
    }
}

function onDragStart(e) {
    const dragItem = e.target.closest('.sidebar_item');
    if (dragItem) {
        e.dataTransfer.setData('model', dragItem.dataset.model);
    }
}

function onDragOver(e) {
    e.preventDefault();
}

function onDrop(e) {
    e.preventDefault();
    const modelKey = e.dataTransfer.getData('model');
    if (!modelKey) return;

    const intersects = getIntersects(e, [floorMesh]);
    if (intersects.length > 0) {
        const intersectPoint = intersects[0].point;
        loader.load(`./models/${modelKey}`, (gltf) => {
            const model = gltf.scene;
            model.position.copy(intersectPoint);
            const box = new THREE.Box3().setFromObject(model);
            model.position.y += (intersectPoint.y - box.min.y) + 0.15;
            scene.add(model);
            transControls.attach(model);
        });
    }
}

function onClick(e) {
    if (e.dataTransfer) return;

    const clickableModels = scene.children.filter(obj => obj.isGroup && obj !== group);
    const intersects = getIntersects(e, clickableModels);

    if (intersects.length > 0) {
        let targetModel = intersects[0].object;
        while (targetModel.parent !== scene) {
            targetModel = targetModel.parent;
        }
        handleModelClick(targetModel);
        console.log(targetModel);
    } else {
        handleBackgroundClick(e);
    }
}

function handleModelClick(targetModel) {
    if (transControls.object === targetModel) {
        gizmo.visible = true;
        switch (transControls.getMode()) {
            case 'translate':
                transControls.setMode('rotate');
                transControls.showX = false;
                transControls.showY = true;
                transControls.showZ = false;
                break;
            case 'rotate':
                transControls.setMode('translate')
                transControls.showX = true;
                transControls.showY = false;
                transControls.showZ = true;
                break;
        }
    } else {
        transControls.attach(targetModel);
        transControls.setMode('translate');
        transControls.showX = true;
        transControls.showY = false;
        transControls.showZ = true;
    }
}

function handleBackgroundClick(e) {
    gizmo.visible = false;
    const gizmoIntersects = getIntersects(e, [gizmo]);
    if (gizmoIntersects.length === 0) {
        gizmo.visible = false;
    }
}

function switchModel() {
    currentAngle += step;
    gsap.to(group.rotation, {
        x: currentAngle,
        duration: 0.3,
        ease: "power2.out",
        onUpdate: () => {
            models.forEach(model => {
                model.rotation.set(-group.rotation.x, model.rotation.y, 0);
            });
        },
    });
}

function getIntersects(event, objects) {
    const pointer = new Vector2();
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(objects, true);
}

function tick() {
    controls.update();
    transControls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
}

// --- 外部エクスポート関数 ---
export function resizeRendererToDisplaySize() {
    const canvas = document.getElementById('three-canvas');
    if (renderer && canvas) {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
}

export function rendererSidebarIcons(modelName) {
    const modelFileName = FurnitureModelFiles[modelName];
    const canvas = document.getElementById(`canvas-${modelName}`);

    if (canvas) {
        const iconScene = new THREE.Scene();
        iconScene.background = new THREE.Color(0x666666);
        const iconCamera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        iconCamera.position.set(1, 1, 1);
        let rot = 0;

        const iconRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        iconRenderer.setSize(canvas.clientWidth, canvas.clientHeight);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        iconScene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        iconScene.add(directionalLight);

        loader.load(`./models/${modelFileName}`, (gltf) => {
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 1.5 / maxDim;
            model.scale.set(scale, scale, scale);
            model.position.sub(center.multiplyScalar(scale));
            iconScene.add(model);
        });

        function animate() {
            rot += 0.5;
            const radian = (rot * Math.PI) / 180;
            iconCamera.position.x = 1 * Math.sin(radian);
            iconCamera.position.z = 1 * Math.cos(radian);
            iconCamera.lookAt(new THREE.Vector3(0, 0, 0));
            requestAnimationFrame(animate);
            iconRenderer.render(iconScene, iconCamera);
        }
        animate();
    }
}