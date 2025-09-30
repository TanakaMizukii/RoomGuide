import { resizeRendererToDisplaySize } from "./index.js";

// 展開／折りたたみ
const sidebar = document.getElementById('sidebar');
document.getElementById('toggle').addEventListener('click', () => {
    const isCollapsed = sidebar.classList.toggle('collapsed');
    toggle.setAttribute('aria-expanded', String(!isCollapsed));
    resizeRendererToDisplaySize();
});