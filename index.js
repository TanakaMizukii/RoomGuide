import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomModelFiles, FurnitureModelFiles } from "./ModelInfo.js";
import { Raycaster, Vector2, Plane, Vector3 } from 'three';

// メインキャンバス部分
const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector("#three-canvas"),
    antialias: true,
    setPixelRatio: devicePixelRatio,
});

const width = window.innerWidth;
const height = window.innerHeight;
renderer.setSize(width, height);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xeeeeee, 20, 120);
scene.background = new THREE.Color(0xeeeeee);

const camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 10000);
camera.position.set(10, 10, 110);

const controls = new OrbitControls(camera, document.querySelector("#three-canvas"));
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.2;
controls.target.set(0, 0, 100);
// controls.autoRotate = true;
// controls.rotateSpeed = 0.05;

// 照明の追加
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1);
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(directionalLight, ambientLight);

// 家具配置用の床を作成
const floorGeometry = new THREE.PlaneGeometry(30, 30);
const floorMaterial = new THREE.MeshBasicMaterial(0x000000);
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.position.set(0, -0.11, 100);
floor.rotateX(-Math.PI / 2);
scene.add(floor);

// モデルを格納するグループを作成
const group = new THREE.Group();
scene.add(group);

const radius = 100;
const models = [];

let modelDeg = 0;

const loader = new GLTFLoader();
// モデルを読み込み
for (let i = 0; i < RoomModelFiles.length; i++) {
    loader.load(`./models/${RoomModelFiles[i]}`, (gltf) => {
        const model = gltf.scene;
        // 円周上に配置（Y軸周り）
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
}

let currentIndex = 0;

// ホイールイベント
const stageElement = document.querySelector('.stage');
window.addEventListener('wheel', (event) => {
    // マウスカーソルがサイドバーの上にある場合は処理を中断
    if (event.target.closest('.sidebar')) {
        return;
    }

    // 下 20% の領域でのみ反応
    const stageRect = stageElement.getBoundingClientRect();
    const triggerY = stageRect.top + (stageRect.height * 0.8);
    if (event.clientY >= triggerY) {
        if (event.deltaY > 0) {
            // 次のモデルへ
            currentIndex = (currentIndex + 1) % models.length;
            switchModel(currentIndex);
        } else {
            // 前のモデルへ
            currentIndex = (currentIndex - 1 + models.length) % models.length;
            switchModel(currentIndex);
        }
    }
}, { passive: false });

let currentAngle = 0;
const step = THREE.MathUtils.degToRad(360 / RoomModelFiles.length);

function switchModel(index) {
    currentAngle += step; // 累積的に加算
    gsap.to(group.rotation, {
        x: currentAngle,
        duration: 0.3,
        ease: "power2.out",
        onUpdate: () => {
            models.forEach(model => {
            model.rotation.set(-group.rotation.x, model.rotation.y, 0); // 水平を維持
        })},
    });
}

tick();
function tick() {
    controls.update();

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
}

OnResize();
window.addEventListener('resize', OnResize);
function OnResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

/** 参考
    Get-ChildItem .\models\*.glb | ForEach-Object { '"' + $_.Name + '",' }
    これで一括でmodels配下の要素の名前を配列形式で取得可能!!
 */

export function resizeRendererToDisplaySize() {
    const canvas = document.getElementById('three-canvas');
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (renderer) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
}

// D&D (イベント委譲を使用)
const sidebar = document.getElementById('sidebar');

// dragstartイベント
sidebar.addEventListener('dragstart', (e) => {
    // イベントの発生元が .sidebar_item またはその子要素かを確認
    const dragItem = e.target.closest('.sidebar_item');
    if (dragItem) {
        // dataset.modelはui.jsで設定されているため、それを参照
        e.dataTransfer.setData('model', dragItem.dataset.model);
    }
});

const canvas = document.getElementById('three-canvas');
const raycaster = new Raycaster(); // Raycasterを再利用するためにここで定義

// ドラッグオーバー時の処理
canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
});

// ドロップ時の処理
canvas.addEventListener('drop', (e) => {
    e.preventDefault();

    const modelKey = e.dataTransfer.getData('model');
    if (!modelKey) return;

    // マウス座標を正規化デバイス座標(NDC)に変換
    const pointer = new Vector2();
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // レイキャストで床との交点を計算
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(floor); // 'floor'オブジェクトとの交差を判定

    if (intersects.length > 0) {
        const intersectPoint = intersects[0].point;
        // モデルキーからモデルファイル名を取得
        // ui.jsで item.dataset.model = modelFileName; としているので、キーはファイル名そのもの
        const modelFileName = modelKey;

        // モデルをロード
        loader.load(`./models/${modelFileName}`, (gltf) => {
            const model = gltf.scene;
            // モデルを交点に配置
            model.position.copy(intersectPoint);
            // ワールド座標系でバウンディングボックスを計算
            const box = new THREE.Box3().setFromObject(model);
            // モデルの底面が床の高さに来るようにY座標を調整
            model.position.y += (intersectPoint.y - box.min.y) + 0.2;
            scene.add(model);
        });
    }
});


// サイドバーのアイコンを初期化
export function rendererSidebarIcons(modelName) {
    const modelFileName = FurnitureModelFiles[modelName];
    const canvas = document.getElementById(`canvas-${modelName}`);

    if (canvas) {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x666666);
        const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        camera.position.set(1, 1, 1);
        let rot = 0;

        const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);

        const loader = new GLTFLoader();
        loader.load(`./models/${modelFileName}`, (gltf) => {
            const model = gltf.scene;
            
            // モデルのサイズを調整
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 1.5 / maxDim;
            model.scale.set(scale, scale, scale);
            model.position.sub(center.multiplyScalar(scale));

            scene.add(model);
        });

        function animate() {
            rot += 0.5;
            const radian = (rot * Math.PI) / 180;
            camera.position.x = 1 * Math.sin(radian);
            camera.position.z = 1 * Math.cos(radian);
            camera.lookAt(new THREE.Vector3(0, 0, 0));

            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }
        animate();
    }
}
