import React, {useEffect} from 'react';
import {BoxGeometry, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, WebGLRenderer} from "three";
import WEBGL from "three/examples/jsm/capabilities/WebGL";

const Cube = () => {
  useEffect(() => {
    const scene = new Scene()
    const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

    const renderer = new WebGLRenderer()
    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)

    const geometry = new BoxGeometry(1, 1, 1)
    const material = new MeshBasicMaterial({
      color: 0x00ff00
    })
    const cube = new Mesh(geometry, material)
    scene.add(cube)

    camera.position.z = 5

    const animate = () => {
      const id = requestAnimationFrame(animate)
      cube.rotation.x += 0.01
      cube.rotation.y += 0.01
      renderer.render(scene, camera)
      return id
    }

    let timer: any
    let warning: any
    if (WEBGL.isWebGLAvailable()) {
      timer = animate()
    } else {
      warning = WEBGL.getWebGLErrorMessage()
      document.body.appendChild(warning)
    }
    return () => {
      document.body.removeChild(renderer.domElement)
      if (timer) {
        cancelAnimationFrame(timer)
      }
      if (warning) {
        document.body.removeChild(warning)
      }
    }
  }, [])
  return null;
};

export default Cube;
