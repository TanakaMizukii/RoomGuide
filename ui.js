import { resizeRendererToDisplaySize } from "./index.js";
import { FurnitureModelFiles } from "./ModelInfo.js";
import { rendererSidebarIcons } from "./index.js";

// 展開／折りたたみ
const sidebar = document.getElementById('sidebar');
document.getElementById('toggle').addEventListener('click', () => {
    const isCollapsed = sidebar.classList.toggle('collapsed');
    toggle.setAttribute('aria-expanded', String(!isCollapsed));
    resizeRendererToDisplaySize();
});

// サイドバーのアイテムを生成
const sidebarList = document.querySelector('.sidebar_list');

for (const modelName in FurnitureModelFiles) {
    const modelFileName = FurnitureModelFiles[modelName];

    const item = document.createElement('div');
    item.classList.add('sidebar_item');
    item.draggable = true;
    item.dataset.model = modelFileName;

    const canvas = document.createElement('canvas');
    canvas.classList.add('sidebar_icon');
    canvas.id = `canvas-${modelName}`;

    const label = document.createElement('div');
    label.classList.add('sidebar_label');
    label.textContent = modelName;

    item.appendChild(canvas);
    item.appendChild(label);
    sidebarList.appendChild(item);

    rendererSidebarIcons(modelName);
}