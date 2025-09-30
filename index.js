import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { modelFiles } from "./ModelInfo.js";
import { RoomModelFiles, FurnitureModelFiles } from "./ModelInfo.js";

const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector("#myCanvas"),
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

const controls = new OrbitControls(camera, document.querySelector("#myCanvas"));
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.2;
controls.target.set(0, 0, 100);

// 照明の追加
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1);
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(directionalLight, ambientLight);

// // ヘルパーの追加
// const axesHelper = new THREE.AxesHelper(100);
// const gridHelper = new THREE.GridHelper(100, 10, 0x000000);
// scene.add(axesHelper, gridHelper);

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
        radius * Math.cos(angle),
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
window.addEventListener('wheel', (event) => {
    // 下 20% の領域でのみ反応
    if (event.clientY >= window.innerHeight * 0.8) {
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
        duration: 0.5,
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