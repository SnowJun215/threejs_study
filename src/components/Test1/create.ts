import * as THREE from "three";
import {Camera, Material, Mesh, Raycaster, Scene, Vector2, Vector3} from "three";
import TWEEN from "@tweenjs/tween.js";
import {TextGeometry} from "three/examples/jsm/geometries/TextGeometry";
import {FontLoader} from "three/examples/jsm/loaders/FontLoader";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";

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
  constructor({ directionX, directionY, directionZ }: { directionX: number, directionY: number, directionZ: number }) {
    const ambientLight = new THREE.AmbientLight('#fff', 1);  // 环境光
    const directLight = new THREE.DirectionalLight('#fff', 0.3);  // 平行光
    directLight.position.set(-directionX / 3, directionY * 4, directionZ * 1.5);
    directLight.castShadow = true;  // 为平行光源开启阴影投射
    directLight.shadow.camera.left = -directionX;
    directLight.shadow.camera.right = directionX;
    directLight.shadow.camera.top = directionZ;
    directLight.shadow.camera.bottom = -directionZ;

    const shadowCamera = new THREE.CameraHelper(directLight.shadow.camera);


    const spotLight = new THREE.SpotLight('#fdf4d5');
    spotLight.position.set(5, directionY * 4, 0);
    spotLight.angle = Math.PI / 2;  // 光线照射范围角度
    spotLight.power = 1;  // 光源功率（流明）


    return [ambientLight, directLight, shadowCamera, spotLight];
    // return [ambientLight];
  }
}

/* 桌台 */
class Table {
  constructor({ width, height, depth }: { width: number, height: number, depth: number }) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    // 纹理贴图
    const url = 'https://cdn.pixabay.com/photo/2016/12/26/13/47/fresno-1932211_1280.jpg';
    const material = new THREE.MeshLambertMaterial({ color: '#cccca6' });
    // 动态更新材质纹理
    new THREE.TextureLoader().load(url, (texture) => {
      material.needsUpdate = true;
      material.map = texture;
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;

    return mesh;
  }
}

/* 盘子 */
class Plate extends THREE.Mesh {
  private size: { radius: number; height: number; poreRadius: number };
  order: number;
  offsetY: number = 0;
  pillarInfo: any;
  pickable: boolean;
  get picked() {
    return this.userData.picked;
  }
  set picked(isPicked) {
    this.userData.picked = isPicked;

    if (isPicked) {
      this.tweenPickUp();
      this.pickable = false;

      const sourcePillar = presenter.getPillar(this.pillarInfo.tag);
      sourcePillar?.popOutPlate();
    }
  }
  constructor(size: { radius: number, height: number, poreRadius: number }, color: string, i: number) {
    super();

    ['size', 'order', 'offsetY', 'pillarInfo', 'pickable'].forEach((key) => {
      Object.defineProperty(this, key, {
        get() {
          return this.userData[key];
        },
        set(value) {
          this.userData[key] = value;
        }
      });
    });
    this.size = size;
    this.order = i;
    this.pickable = false;
    this.picked = false;
    this.geometry = this.createBase();
    this.material = new THREE.MeshLambertMaterial({
      color,
      side: THREE.DoubleSide
    });
    this.material.shadowSide = THREE.FrontSide;  // 只生成外层阴影
    this.castShadow = true;  // 允许产生阴影
    this.receiveShadow = true;  // 允许接收阴影

    const text = this.createLabel(String(i));
    text && this.add(text);

    this.name = 'plate';
  }
  private createBase() {
    const { radius, height, poreRadius } = this.size;
    const sideRadius = radius - poreRadius;
    const topPoints = [  // 上半部分的5个路径点（二维）
      new THREE.Vector2(poreRadius, 0),
      new THREE.Vector2(poreRadius, height / 2),
      new THREE.Vector2(sideRadius - 0.08, height / 2),
      new THREE.Vector2(sideRadius, height / 4),
      new THREE.Vector2(sideRadius, 0)
    ];
    // 翻转生成下半部分的路径点
    const bottomPoints = topPoints.map(vector =>
      vector.clone().setY(vector.y * -1)
    ).reverse();
    const points = [...topPoints, ...bottomPoints];

    return new THREE.LatheGeometry(points, 64);
  }
  private createLabel(str: string) {
    const { radius, height, poreRadius } = this.size;
    const text: any = presenter.createText(str, {
      size: height / 1.6,
      color: '#fff'
    });
    if (!text) {
      return null;
    }

    text.position.z = radius - poreRadius;  // 标签位置
    return text;
  }
  private tweenPickUp() {
    const { height } = this.pillarInfo.size;
    const upDistance = height + height / 2;
    const angleRad = THREE.MathUtils.degToRad(15);  // 旋转角度
    const slantTween = new TWEEN.Tween(this.rotation)
      .to({ x: angleRad }, 150);

    return new TWEEN.Tween(this.position)
      .to({ y: upDistance }, 200)
      .easing(TWEEN.Easing.Quadratic.Out)
      .chain(slantTween)
      .start();
  }
  private tweenHover(isHover: boolean) {
    const { height } = this.size;
    const tweenGroup = new TWEEN.Group();
    const scaleValue = isHover ? 1.1 : 1;  // 缩放比
    // 缩放动画
    const scaleTween = new TWEEN.Tween(this.scale)
      .to({ x: scaleValue, y: scaleValue, z: scaleValue }, 200)
      .start();
    // 抬起/放下动画
    const liftTween = new TWEEN.Tween(this.position)
      .to({ y: this.offsetY + (isHover ? height / 2 : 0) }, 200)
      .start();

    tweenGroup.add(scaleTween);
    tweenGroup.add(liftTween);
    tweenGroup.update();
  }
  private tweenPutIn(pillar: Pillar) {
    const currentPillar = presenter.getPillar(this.pillarInfo.tag);
    const targetPillar = pillar || currentPillar;
    const isSamePillar = currentPillar?.id === targetPillar.id;
    const placementPosition = targetPillar.getPlacementPosition(); // ???

    // 回正倾斜
    const slantTween = new TWEEN.Tween(this.rotation)
      .to({ x: 0 }, 150);

    // 平移
    const panTween = new TWEEN.Tween(this.position)
      .to({
        x: targetPillar.position.x,
        y: this.position.y
      }, isSamePillar ? 0 : 450) // 同一柱杆不需要平移
      .easing(TWEEN.Easing.Quadratic.Out);

    // 放下
    const putDownTween = new TWEEN.Tween(this.position)
      .to({ y: placementPosition.y }, 400) // 放入最终位置
      .easing(TWEEN.Easing.Quadratic.Out);

    // 缩放
    const scaleTween = new TWEEN.Tween(this.scale)
      .to({ x: 1, y: 1, z: 1 }, 200);

    // 顺序执行动画
    slantTween.chain(putDownTween, scaleTween);
    panTween.chain(slantTween).start();

    return putDownTween;
  }
  hover(isHover: boolean) {
    this.tweenHover(isHover);
  }
  appendTo(pillar: Pillar) {
    return this.tweenPutIn(pillar);
  }
}

/* 柱杆 */
class Pillar extends THREE.Group {
  private size: { radius: number; height: number; baseHeight: number };
  plates: Plate[];
  tag: string;
  constructor(size: { radius: number, height: number, baseHeight: number }, key: string) {
    super();
    ['size', 'tag', 'offsetY', 'pillarInfo', 'pickable', 'picked'].forEach((key) => {
      Object.defineProperty(this, key, {
        get() {
          return this.userData[key];
        },
        set(value) {
          this.userData[key] = value;
        }
      });
    });

    this.tag = key;
    this.size = size;
    this.plates = [];  // 存储放入的盘子实例

    const { radius, height, baseHeight } = size;

    const geometry = new THREE.CylinderGeometry(radius, radius, height);
    const material = new THREE.MeshPhongMaterial({
      color: '#e6e6e9',
      emissive: '#889',
    });
    const body: any = new THREE.Mesh(geometry, material);
    body.castShadow = true;  // 允许产生阴影
    body.receiveShadow = true;  // 允许接收阴影

    const base = this.createBase(radius, baseHeight);
    base.position.y = -height / 2 + baseHeight;

    const text = this.createLabel(radius, height, key);

    const holder = this.createHolder(body);

    const parts = [body, base, text, holder].map(part => {
      if (!part) {
        return null;
      }
      part.name = 'pillar';  // 柱杆的各个部件设置 name
      return part;
    });

    this.add(...parts);
    // text && this.add(text);
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
  private createLabel(r: number, height: number, str: string) {
    const fontSize = r * 2;
    const text: any = presenter.createText(str, {
      size: fontSize,
      color: '#202020'
    });
    if (!text) {
      return null
    }

    text.position.y = height / 2 + fontSize;  // 位于柱杆顶部
    return text;
  }
  getPlacementPosition() {
    const { height: pillarHeight, baseHeight } = this.userData.size;
    const plateHeight = model.plate.height;
    // 与坐标原点的 y 距离
    const distanceOriginY = this.position.y - pillarHeight / 2;
    const startY = plateHeight / 2 + distanceOriginY + baseHeight; // 柱杆底部y轴坐标
    const stackHeight = this.plates.length * plateHeight;  // 盘子堆叠高度
    const vector = new THREE.Vector3();

    vector.copy(this.position);
    vector.setY(startY + stackHeight);

    return vector;
  }
  popOutPlate() { // 移除盘子
    const topPlate = this.plates.pop();

    if (this.plates.length) {
      // 弹出顶层盘子后，其下方盘子允许拾取（可交互）
      this.plates.slice(-1)[0].pickable = true;
    }

    return topPlate;
  }
  addPlate(plate: Plate, animateCallback?: Function) {
    if (this.plates.length) {
      // 顶层盘子不允许拾取（不可交互）
      this.plates.slice(-1)[0].pickable = false;
    }
    plate.pickable = true;

    if (typeof animateCallback === 'function') {
      plate.appendTo(this).onComplete(() => { // 过渡动画完成后再进行数据更新
        plate.offsetY = plate.position.y;
        plate.pillarInfo = this.userData;
        plate.picked = false;
        this.plates.push(plate);
        animateCallback();  // 过渡动画结束后回调
      })
      return;
    }

    /* 初始化时直接添加的场景 */
    const vector = this.getPlacementPosition();
    plate.position.copy(vector);
    plate.offsetY = vector.y;
    plate.pillarInfo = this.userData;
    plate.picked = false;
    this.plates.push(plate);
  }
  private createHolder(body: Mesh) {
    const mesh = body.clone();
    const { height } = this.userData.size;
    // 与坐标原点的 y 距离
    const distanceOriginY = this.position.y - height / 2;
    const scaleY = 1.5;

    mesh.visible = false; // 隐藏
    mesh.position.copy(body.position);
    mesh.scale.set(3, scaleY, 3);
    mesh.position.y = height * scaleY / 2 + distanceOriginY;

    return mesh;
  }
}

class Text {
  constructor(font: any, text: string, { size, color }: { size: number, color: string }) {
    const geometry = new TextGeometry(String(text), {
      font,
      size,
      height: 0.02
    });
    geometry.center();  // 文本居中
    const material = new THREE.MeshBasicMaterial({ color });

    return new THREE.Mesh(geometry, material);
  }
}

const model: {
  tableSize: { width: number, depth: number, height: number },
  pillarSize: { height: number, radius: number, baseHeight: number },
  plate: { nums: number, height: number, colors: string[] },
  font: any,
  loadFont: () => Promise<boolean>,
  scene: Scene,
  pillarsMap: Map<string, Pillar | null>,
  lastHoveredPlate: Plate | null,
  currentPickedPlate: Plate | null,
  steps: number,
  startTime: number
} = {
  tableSize: {
    width: 30,  // 长
    depth: 10,  // 宽
    height: 0.5  // 高
  },
  pillarSize: {
    height: 5.4,
    radius: 0.2,
    baseHeight: 0.18  // 底座高度
  },
  plate: {
    nums: 5,  // 盘子数量
    height: 0.5,
    colors: [
      '#c186e0', '#997feb', '#59b1ff', '#36cfc9',
      '#bae637', '#e7d558', '#ff9c6e', '#ff6b6b'
    ]
  },
  font: null,
  loadFont: () => {
    const url = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/'
    const fontName = 'helvetiker_regular.typeface.json';

    return new Promise((resolve, reject) => {
      if (model.font) {
        return resolve(true);
      }

      new FontLoader().load(url + fontName,
        (font) => {
          // 字体加载成功，font 是一个表示字体的 Shape 类型的数组
          model.font = font as any;
          resolve(true);
        },
        () => {},
        (err) => reject(err)
      );
    });
  },

  scene: new THREE.Scene(),

  pillarsMap: new Map(
    ['A', 'B', 'C'].map(k => [k, null])
  ),

  lastHoveredPlate: null,
  currentPickedPlate: null,

  steps: 0,
  startTime: 0
};

/* 容器 */
const containerView: {
  el: HTMLElement,
  init: () => void,
  size: () => { width: number, height: number },
  listenEvent: (evtName: string, cb: (e: any) => void) => void,
  togglePointer: (intersecting: boolean) => void
} = {
  el: document.body,
  init() {
    this.el = document.body;
  },
  size() {
    return this.el.getBoundingClientRect();
  },
  listenEvent(evtName, cb) {
    this.el.addEventListener(evtName, cb, false);
  },
  togglePointer(intersecting: boolean) {
    this.el.style.setProperty('cursor', intersecting ? 'pointer' : 'default');
  }
};

/* 相机 */
const cameraView: {
  for: number,
  camera?: Camera,
  init: (width: number, height: number) => void,
  fitPosition: (layoutWidth: number) => void
} = {
  for: 0,
  camera: undefined,
  init(width: number, height: number) {
    this.for = 45;
    this.camera = new THREE.PerspectiveCamera(this.for, width / height, 1, 500);
  },
  fitPosition(layoutWidth: number) {
    const angle = (this.camera as any)?.fov / 2;  // 夹角
    const rad = THREE.MathUtils.degToRad(angle);  // 转为弧度值
    const cameraZ = layoutWidth / 2 / Math.tan(rad);
    // 调整相机的 Z 轴位置，使桌台元素完整显示到场景
    this.camera?.position.set(0, 15, cameraZ);
  }
};

/* 渲染器 */
const rendererView: {
  renderer?: THREE.WebGLRenderer,
  domElement?: HTMLElement,
  init: (width: number, height: number) => void,
  appendToDOM: (dom: any) => void,
  setSize: (width: number, height: number) => void,
  render: (scene: Scene, camera: Camera) => void
} = {
  init(width: number, height: number) {
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true  // 开启抗锯齿
    });
    this.domElement = this.renderer.domElement;
    this.setSize(width, height);
    this.renderer.setClearColor('#f8f8f6', 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  },
  appendToDOM(dom: any) {
    dom.appendChild(this.domElement);
  },
  setSize(width: number, height: number) {
    this.renderer?.setSize(width, height);
  },
  render(scene: Scene, camera: Camera) {
    this.renderer?.render(scene, camera);
  }
};

/* 轨道控制器 */
const controlsView = {
  init(camera: Camera, domElement: any) {
    const controls = new OrbitControls(camera, domElement);
    return controls;
  }
};

/* 盘子放置指使 */
const placementView: {
  ghostPlate: THREE.Mesh,
  init: (scene: Scene) => void,
  createFrom: (plate: Plate) => void,
  display: (position: Vector3 | false) => void
} = {
  ghostPlate: new THREE.Mesh(),
  init(scene: Scene) {
    this.ghostPlate = new THREE.Mesh();
    scene.add(this.ghostPlate);
  },
  createFrom(plate: Plate) {
    presenter.dispose3dObject(this.ghostPlate); // 销毁已有的占位提示

    this.ghostPlate.visible = false;
    this.ghostPlate.geometry = plate.geometry.clone();
    this.ghostPlate.material = (plate.material as Material).clone();
    this.ghostPlate.material.transparent = true;
    this.ghostPlate.material.opacity = 0.5;
  },
  display(position: Vector3 | false) {
    this.ghostPlate.visible = Boolean(position);
    if (position) {
      this.ghostPlate.position.copy(position);
    }
  }
}

const resultBoxView: {
  box: HTMLElement | null,
  backdrop: HTMLElement | null | undefined,
  resultInfo: HTMLElement | null | undefined,
  nextLvButton: HTMLElement | null | undefined,
  completeTip: HTMLElement | null | undefined,
  init: () => void,
  toggle: (visible: boolean) => void
} = {
  box: null,
  resultInfo: null,
  nextLvButton: null,
  completeTip: null,
  backdrop: null,
  init() {
    this.box = document.querySelector('.result-box');
    this.backdrop = this.box?.parentNode as HTMLElement | undefined;
    this.resultInfo = this.box?.querySelector('.result-info');
    this.nextLvButton = this.box?.querySelector('.js-next-level');
    this.completeTip = this.box?.querySelector('.js-all-complete');

    this.nextLvButton?.addEventListener('click', () => {
      this.toggle(false);
      presenter.resetGame(1);
    }, false);
    this.box?.querySelector('.btn-close')?.addEventListener('click', () => {
      this.toggle(false);
      presenter.resetGame();
    }, false);
  },
  toggle(visible: boolean) {
    if (this.backdrop && this.box) {
      if (visible) {
        this.backdrop.style.visibility = 'visible';
        // @ts-ignore
        this.box.open = true;
      } else {
        this.backdrop.style.visibility = 'hidden';
        // @ts-ignore
        this.box.open = false;
      }
    }
  }
}

const presenter: {
  raycaster: Raycaster,
  mouse: Vector2,
  init: () => THREE.WebGLRenderer | undefined,
  dispose3dObject: (obj: THREE.Mesh) => void,
  addPillars: () => void,
  addPlates: () => void,
  animate: () => void,
  createText: (text: string, options: { size: number, color: string }) => Text | null,
  getPillar: (tag: string) => Pillar,
  initInteraction: () => void,
  getIntersects: (e: { clientX: number, clientY: number }) => any[]
  handlePlateHover(object: any): void;
  handlePillarHover(object: any): void;
  handlePlateClick(object: any): void;
  handlePillarClick(object: any): void;
  startGame: () => void,
  resetGame: (addedNums?: number) => void,
  updatePlateNums: (nums: number) => void,
  checkResult: () => void,
} = {
  raycaster: new THREE.Raycaster(),
  mouse: new THREE.Vector2(),
  init() {
    // 初始化容器
    containerView.init();
    const {width = 0, height = 0} = containerView.size() || {};

    // 初始化相机
    cameraView.init(width, height);
    cameraView.fitPosition(model.tableSize.width);

    // 初始化渲染器
    rendererView.init(width, height);
    rendererView.appendToDOM(containerView.el);

    // 初始化相机轨道控制器
    cameraView.camera && controlsView.init(cameraView.camera, rendererView.domElement);

    // 添加辅助
    model.scene.add(...new Helpers() as any);

    // 添加灯光
    const lights = new Lights({
      directionX: model.tableSize.width,
      directionY: model.pillarSize.height,
      directionZ: model.tableSize.depth
    });
    model.scene.add(...lights as any);

    // 添加桌台元素
    model.scene.add(new Table(model.tableSize) as any);

    model.loadFont().then(() => {
      this.addPillars();  // 添加柱杆
      this.addPlates();  // 添加盘子
    }).catch(e => {
      console.log(e)
      this.addPillars();
      this.addPlates();
    });

    this.animate();
    this.initInteraction();  // 初始化事件交互

    placementView.init(model.scene);

    return rendererView.renderer;
  },
  dispose3dObject(obj: THREE.Mesh) {
    if (obj.geometry) {
      obj.geometry.dispose(); // 释放几何体
    }

    if (obj.material) {
      (obj.material as Material).dispose(); // 释放材质
    }

    if (Array.isArray(obj.children)) {
      obj.children.forEach(child => this.dispose3dObject(child as THREE.Mesh));
    }
  },
  addPillars() {
    const { width: tableWidth, height: tableHeight } = model.tableSize;
    const { height: pillarHeight } = model.pillarSize;
    const y = (tableHeight + pillarHeight) / 2;
    const unitX = tableWidth / 2 / 3;
    const pillarsMap: any = new Map([
      ...['A', 'B', 'C'].map(key => [key, new Pillar(model.pillarSize as any, key)] as any)
    ]);

    pillarsMap.get('A').position.set(-unitX * 2, y, 0);
    pillarsMap.get('B').position.set(0, y, 0);
    pillarsMap.get('C').position.set(unitX * 2, y, 0);

    const pillars = [...pillarsMap.values()];
    model.pillarsMap = pillarsMap;
    model.scene.add(...pillars);
  },
  addPlates() {
    const { height: plateHeight, colors, nums } = model.plate;
    const { depth: tableDepth } = model.tableSize;
    const maxPlateRadius = tableDepth / 2.5;
    const platePoreRadius = model.pillarSize.radius + 0.04;  // 孔径（比支柱大一点）

    Array.from({ length: nums }).forEach((v, i) => {
      // 使用等比数列从大到小创建不同半径的圆盘，0.87 为公比
      // an = a1 × r^(n-1)
      const r = maxPlateRadius - i * 0.87 ** (nums - 1);
      const plate: any = new Plate({
        radius: r,
        height: plateHeight,
        poreRadius: platePoreRadius
      }, colors[i], nums - i);

      this.getPillar('A').addPlate(plate);  // 为柱杆A添加盘子
    });

    model.scene.add(...this.getPillar('A').plates);
  },

  createText(text: string, options: { size: number, color: string }) {
    if (!model.font) {
      return null;
    }
    return new Text(model.font, text, options);
  },

  /* 渲染循环 */
  animate() {
    requestAnimationFrame(this.animate.bind(this));
    cameraView.camera && rendererView.render(model.scene, cameraView.camera);
    TWEEN.update();
  },
  getPillar(tag: string): Pillar {
    return model.pillarsMap.get(tag) as any;
  },
  initInteraction() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // 指针移动事件
    containerView.listenEvent('pointermove', (e) => {
      const object = this.getIntersects(e)[0];

      // 非交互对象
      if (!object?.name) {
        containerView.togglePointer(false);
        placementView.display(false);
      }

      this.handlePlateHover(object);
      this.handlePillarHover(object);
    });

    // 鼠标点击
    containerView.listenEvent('click', (e) => {
      const object = this.getIntersects(e)[0];

      this.handlePlateClick(object);
      this.handlePillarClick(object);
    });
  },
  getIntersects({ clientX, clientY}: { clientX: number, clientY: number }) {
    const { left, top, width, height } = containerView.el.getBoundingClientRect();
    this.mouse.x = (clientX - left) / width * 2 - 1;
    this.mouse.y = -(clientY - top) / height * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, cameraView.camera as Camera); // 设置射线的起点和方向
    return this.raycaster.intersectObjects(model.scene.children, true)
      .flatMap(({ object }) => object.name ? [ object ] : []); // 返回场景中与射线相交的物体
  },
  handlePlateHover(plate: Plate) {
    const lastPlate: Plate = model.lastHoveredPlate as any;
    const resetLastPlate = () => {
      // 移除上一次悬浮的盘子（如有）的样式
      if (lastPlate && !lastPlate.picked) {
        lastPlate.hover(false);  // 恢复原位
        model.lastHoveredPlate = null;
      }
    }

    // 当前悬浮物品不是盘子
    if (plate?.name !== 'plate') {
      resetLastPlate();
      return;
    }

    // 已有拾取的盘子
    if (model.currentPickedPlate) {
      containerView.togglePointer(false);
      return;
    }

    // 不允许拾取
    if (!plate.pickable) {
      containerView.togglePointer(false);
      resetLastPlate();
      return;
    }

    // 当前悬浮物品与上一次悬浮物品不同
    if (plate.id !== lastPlate?.id) {
      resetLastPlate();
      plate.hover(true);
      model.lastHoveredPlate = plate;
      containerView.togglePointer(true);
    }
  },
  handlePlateClick(plate: Plate) {
    if (plate?.name !== 'plate') {
      return;
    }

    // 不允许拾取的盘子，或当前已拾取盘子
    if (!plate.pickable || model.currentPickedPlate) {
      return;
    }

    plate.picked = true;
    model.currentPickedPlate = plate;
    placementView.createFrom(plate);
    containerView.togglePointer(false);
  },
  handlePillarHover(pillarPart: any) {
    if (pillarPart?.name !== 'pillar') {
      return;
    }
    const pillar = pillarPart.parent;

    if (model.currentPickedPlate) {
      const topPlate = pillar.plates.slice(-1)[0];

      // 满足放置条件
      if (!topPlate || topPlate.order > model.currentPickedPlate.order) {
        const vector = pillar.getPlacementPosition();

        placementView.display(vector);
        containerView.togglePointer(true);
      }
    }
  },
  handlePillarClick(pillarPart: any) {
    // console.log('handlePillarClick');
    if (pillarPart?.name !== 'pillar') {  // 当前点击的不是柱杆
      return;
    }

    const pillar: Pillar = pillarPart.parent;  // 柱杆实例
    const pickedPlate = model.currentPickedPlate;

    if (pickedPlate && pillar) {  // 已有拾取的盘子
      const targetTopPlate = pillar.plates.slice(-1)[0];  // 目标柱杆最顶层的盘子

      // 不满足放置条件
      if (targetTopPlate && targetTopPlate.order < pickedPlate.order) {
        return;
      }

      placementView.display(false);
      pillar.addPlate(pickedPlate, () => {
        if (pillar.tag === 'C') {
          // 检查是否过关
          presenter.checkResult();
        }
      });
      model.currentPickedPlate = null;
    }
  },
  startGame() {
    // 重置统计信息
    model.steps = 0;
    model.startTime = Date.now();
  },
  resetGame(addedNums?: number) {
    // 重置盘子
    model.pillarsMap.forEach(pillar => {
      while (pillar?.plates.length) {
        const plate = pillar.plates.pop();
        if (plate) {
          model.scene.remove(plate);
          this.dispose3dObject(plate);
        }
      }
    });

    // 销毁已经拾取的盘子
    if (model.currentPickedPlate) {
      model.scene.remove(model.currentPickedPlate);
      this.dispose3dObject(model.currentPickedPlate);
      model.currentPickedPlate = null;
      placementView.display(false);
    }

    if (typeof addedNums === 'number') {
      // 更新盘子数量
      this.updatePlateNums(model.plate.nums + addedNums);
    }

    this.addPlates();  // 重新添加盘子
    this.startGame();  // 开始游戏
  },
  updatePlateNums(nums: number) {
    // 更新盘子数量
  },
  checkResult() {
    const targetPlates = this.getPillar('C').plates;
    const { plate, startTime, steps } = model;

    if (targetPlates.length === plate.nums) {
      if (targetPlates.every((item, i) => item.order === plate.nums - i)) {
        const time = (Date.now() - startTime) / 1000;
        const msg = `恭喜你，完成游戏！用时 ${time} 秒，共 ${steps} 步`;
        console.log(msg);
      }
    }
  }
}

export default presenter;
