import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

/* 辅助 */
class Helpers {
  constructor() {
    const axesHelper = new THREE.AxesHelper(100);
    const gridHelper = new THREE.GridHelper(50, 50);
    return [axesHelper, gridHelper];
  }
}

/* 灯光 */
class Lights {
  constructor() {
    const ambientLight = new THREE.AmbientLight('#fff', 1);  // 环境光
    const directLight = new THREE.DirectionalLight('#fff', 3);  // 平行光
    return [ambientLight, directLight];
  }
}

/* 桌台 */
class Table {
  constructor({ width, height, depth }: { width: number, height: number, depth: number }) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshLambertMaterial({ color: '#cccca6' });
    return new THREE.Mesh(geometry, material);
  }
}

/* 柱杆 */
class Pillar {
  constructor({ radius, height }: { radius: number, height: number }) {
    const geometry = new THREE.CylinderGeometry(radius, radius, height);
    const material = new THREE.MeshPhongMaterial({
      color: '#e6e6e9',
      emissive: '#889',
    });
    return new THREE.Mesh(geometry, material);
  }
}

const Index_bak2 = () => {
  const model: any = useMemo(() => ({
    tableSize: {
      width: 30,  // 长
      depth: 10,  // 宽
      height: 0.5  // 高
    },
    pillarSize: {
      height: 5.4,  // 高度
      radius: 0.2,  // 半径
    },
    scene: new THREE.Scene(),
  }), [])

  useEffect(() => {
    const { width, height } = document.body.getBoundingClientRect();

    /* 场景 */
    const scene = new THREE.Scene();

    /* 相机 */
    const fov = 45;  // 视野角度
    const camera = new THREE.PerspectiveCamera(fov, width / height, 1, 500);
    const angle = fov / 2;  // 夹角
    const rad = THREE.MathUtils.degToRad(angle);  // 转为弧度值
    const distanceZ = model.tableSize.width / 2 / Math.tan(rad);
    /**
     * 调整相机的 X 轴位置，让视野能同时看到桌台的顶部和侧面
     * 调整相机的 Z 轴位置，使桌台完整显示到场景
     */
    camera.position.set(0, 15, distanceZ);

    /* 渲染器 */
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      // antialias: true  // 开启抗锯齿
    });
    renderer.setSize(width, height);
    renderer.setClearColor('#f8f8f6', 1);  // 设置初始化背景
    document.body.appendChild(renderer.domElement);

    const geometry = new THREE.BoxGeometry(  // 立方缓冲几何体
      ...['width', 'height', 'depth'].map(key => model.tableSize[key])
    );
    const material = new THREE.MeshLambertMaterial({ color: '#cccca6' });  // 材质
    const table = new THREE.Mesh(geometry, material);
    scene.add(table);  // 添加到场景

    const pillarSize: any = {
      height: 5.4,  // 高度
      radius: 0.2,  // 半径
    };
    const pillarGeometry = new THREE.CylinderGeometry(
      ...['radius', 'radius', 'height'].map(key => pillarSize[key])
    );
    const pillarMaterial = new THREE.MeshPhongMaterial({
      color: '#e6e6e9',
      emissive: '#889',  // 放射光
    });
    // const pillarB = new THREE.Mesh(pillarGeometry, pillarMaterial);
    // const y = (pillarSize.height + tableSize.height) / 2;
    // const unitX = tableSize.width / 2 / 3;  // x + 2x = tableSize.width / 2
    //
    // pillarB.position.y = y;
    //
    // const pillarA = pillarB.clone();
    // pillarA.position.x = -unitX * 2;
    //
    // const pillarC = pillarA.clone();
    // pillarC.position.x *= -1;
    //
    // table.add(pillarA, pillarB, pillarC);


    const ambientLight = new THREE.AmbientLight('#fff', 1);  // 环境光
    const directLight = new THREE.DirectionalLight('#fff', 3);  // 平行光
    scene.add(ambientLight, directLight);

    /* 相机轨道控制器 */
    new OrbitControls(camera, renderer.domElement);

    const axesHelper = new THREE.AxesHelper(100);  // 辅助坐标轴
    const gridHelper = new THREE.GridHelper(50, 50);  // 辅助网格线
    scene.add(axesHelper, gridHelper);

    const render = () => {
      renderer.render(scene, camera);
      return requestAnimationFrame(render)
    }
    const timer = render()

    return () => {
      document.body.removeChild(renderer.domElement)
      cancelAnimationFrame(timer)
    }

  }, []);
  return null;
};

export default Index_bak2;
