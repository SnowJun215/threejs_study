import React, {useEffect} from 'react';
import {
  AmbientLight,
  BoxGeometry, CylinderGeometry,
  Mesh,
  MeshLambertMaterial,
  OrthographicCamera,
  PointLight,
  Scene, SphereGeometry,
  WebGLRenderer
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";

const Example1 = () => {
  useEffect(() => {
    // 创建场景对象Scene
    const scene = new Scene()

    // 创建立方体网格模型
    const geometry = new BoxGeometry(100, 100, 100) // 创建一个立方体几何对象Geometry
    const material = new MeshLambertMaterial({
      color: 0x0000ff
    }) // 材质对象Material
    const mesh = new Mesh(geometry, material) // 网格模型对象Mesh
    scene.add(mesh) // 网格模型添加到场景中

    // 创建球体网格模型
    const ball = new SphereGeometry(60, 40, 40)
    const material2 = new MeshLambertMaterial({
      color: 0xff00ff
    }) // 材质对象Material
    const mesh2 = new Mesh(ball, material2) // 网格模型对象Mesh
    mesh2.translateY(120)
    scene.add(mesh2) // 网格模型添加到场景中

    // 创建球体网格模型
    const cylinder = new CylinderGeometry(50, 50, 100, 25)
    const material3 = new MeshLambertMaterial({
      color: 0xffff00
    }) // 材质对象Material
    const mesh3 = new Mesh(cylinder, material3) // 网格模型对象Mesh
    mesh3.translateX(120)
    scene.add(mesh3) // 网格模型添加到场景中

    // 光源设置
    // 点光源
    const point = new PointLight(0xffffff)
    point.position.set(400, 200, 300) // 点光源位置
    scene.add(point) // 点光源添加到场景中
    // 环境光
    const ambient = new AmbientLight(0x444444)
    scene.add(ambient)

    // 相机设置
    const width = window.innerWidth // 窗口宽度
    const height = window.innerHeight // 窗口高度
    const k = width / height // 窗口宽高比
    const s = 300 // 三维场景显示范围控制系数，系数越大，显示的范围越大
    // 创建相机对象
    const camera = new OrthographicCamera(-s * k, s * k, s, -s, 1, 1000)
    camera.position.set(200, 300, 200) // 设置相机位置
    camera.lookAt(scene.position) // 设置相机方向（指向的场景对象）

    // 创建渲染器对象
    const renderer = new WebGLRenderer()
    renderer.setSize(width, height) // 设置渲染区域尺寸
    renderer.setClearColor(0xb9d3ff, 1) // 设置背景颜色
    document.body.appendChild(renderer.domElement) // body元素中插入canvas对象
    // 执行渲染操作   指定场景、相机作为参数

    let T0 = new Date()
    const render = () => {
      let T1 = new Date()
      let t = T1.getTime() - T0.getTime()
      T0 = T1
      renderer.render(scene, camera)
      mesh.rotateY(0.001 * t)
      return requestAnimationFrame(render)
    }

    const timer = render()

    const controls = new OrbitControls(camera, renderer.domElement) // 创建控件对象
    // 不能跟requestAnimationFrame同时使用
    // controls.addEventListener('change', render)

    return () => {
      document.body.removeChild(renderer.domElement)
      cancelAnimationFrame(timer)
    }
  }, [])
  return null;
};

export default Example1;
