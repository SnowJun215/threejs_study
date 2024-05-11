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
  constructor({ radius, height, baseHeight }: { radius: number, height: number, baseHeight: number }) {
    const geometry = new THREE.CylinderGeometry(radius, radius, height);
    const material = new THREE.MeshPhongMaterial({
      color: '#e6e6e9',
      emissive: '#889',
    });
    const body: any = new THREE.Mesh(geometry, material);
    // const base = this.createBase(radius, baseHeight);
    // base.position.y = -height / 2 - baseHeight;
    // body.add(base);
    return body;
  }
  private createBase(r: number, height: number) {
    const pointNum = 10;
    const unitY = height / (pointNum - 1);
    const points = Array.from({ length: pointNum }, (_, i) => {
      return new THREE.Vector2(
        Math.sin(i * r) * r + r,
        -unitY * i
      )
    });
    const geometry = new THREE.LatheGeometry(points, 32);
    const material = new THREE.MeshLambertMaterial({
      color: '#353546',
      side: THREE.DoubleSide
    });

    return new THREE.Mesh(geometry, material);
  }
}

const Index_bak = () => {
  const elRef = React.useRef<any>(null);
  const fov = useRef(0)
  const cameraRef = useRef<any>(null)
  const rendererRef = useRef<any>(null)
  const domRef = useRef<any>(null)

  const model = useMemo(() => ({
    tableSize: {
      width: 30,  // 长
      depth: 10,  // 宽
      height: 0.5  // 高
    },
    pillarSize: {
      height: 5.4,  // 高度
      radius: 0.2,  // 半径
      baseHeight: 0.18  // 底座高度
    },
    scene: new THREE.Scene(),
  }), [])

  const containerView = useMemo(() => ({
    init: () => {
      elRef.current = document.body
    },
    get size() {
      return elRef.current.getBoundingClientRect()
    }
  }), [])

  const cameraView = useMemo(() => ({
    init: (width: number, height: number) => {
      fov.current = 45
      cameraRef.current = new THREE.PerspectiveCamera(fov.current, width / height, 1, 500)
    },
    fitPosition: () => {
      const angle = fov.current / 2
      const rad = THREE.MathUtils.degToRad(angle)
      const distanceZ = model.tableSize.width / 2 / Math.tan(rad)
      cameraRef.current.position.set(0, 15, distanceZ)
    }
  }), [])

  const rendererView = useMemo(() => ({
    init: (width: number, height: number) => {
      rendererRef.current = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true
      })
      domRef.current = rendererRef.current.domElement
      rendererView.setSize(width, height)
      rendererRef.current.setClearColor('#f8f8f6', 1)
    },
    appendToDom: (dom: any) => {
      dom.appendChild(domRef.current)
    },
    setSize: (width: number, height: number) => {
      rendererRef.current.setSize(width, height)
    },
    render: (scene: any, camera: any) => {
      rendererRef.current.render(scene, camera)
    }
  }), [])

  const controlsView = useMemo(() => ({
    init: (camera: any, domElement: any) => {
      const controls = new OrbitControls(camera, domElement);
      return controls;
    }
  }), [])

  const addPillars = useCallback(() => {
    const { width: tableWidth, height: tableHeight } = model.tableSize;
    const { height: pillarHeight } = model.pillarSize;
    const y = (tableHeight + pillarHeight) / 2;
    const unitX = tableWidth / 2 / 3;
    const pillarsMap: any = new Map([
      ...['A', 'B', 'C'].map(key => [key, new Pillar(model.pillarSize)] as any)
    ]);

    pillarsMap.get('A').position.set(-unitX * 2, y, 0);
    pillarsMap.get('B').position.set(0, y, 0);
    pillarsMap.get('C').position.set(unitX * 2, y, 0);

    const pillars = [...pillarsMap.values()];
    model.scene.add(...pillars);
  }, [])

  const presenter = useMemo(() => ({
    init: () => {
      // 初始化容器
      containerView.init()
      const { width, height } = containerView.size

      // 初始化相机
      cameraView.init(width, height)
      cameraView.fitPosition()

      // 初始化渲染器
      rendererView.init(width, height)
      rendererView.appendToDom(document.body)

      // 初始化相机轨道控制器
      controlsView.init(cameraRef.current, domRef.current)

      // 添加辅助
      model.scene.add(...new Helpers() as any)

      // 添加灯光
      // const [ambientLight, directLight] = new Lights() as any
      const ambientLight = new THREE.AmbientLight('#fff', 1);  // 环境光
      // const directLight = new THREE.DirectionalLight('#fff', 3);  // 平行光
      model.scene.add(ambientLight);

      // 添加桌台
      model.scene.add(new Table(model.tableSize) as any)

      // 添加柱杆
      addPillars()
    }
  }), [])
  useEffect(() => {
    presenter.init()

    rendererView.render(model.scene, cameraRef.current);

    // const render = () => {
    //   rendererView.render(model.scene, cameraRef.current);
    //   return requestAnimationFrame(render)
    // }
    // const timer = render()
    //
    // return () => {
    //   document.body.removeChild(domRef.current)
    //   cancelAnimationFrame(timer)
    // }

  }, []);
  return null;
};

export default Index_bak;
