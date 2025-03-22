import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

class Environment {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public ball: THREE.Mesh;
  public target: THREE.Mesh;
  public actionSpace: THREE.Vector3[];

  constructor(container: HTMLDivElement) {
    // Create Scene, Camera, and Renderer
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // Create Ball (Agent)
    const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({ color: 0x0077ff });
    this.ball = new THREE.Mesh(ballGeometry, ballMaterial);
    this.scene.add(this.ball);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    // Target
    const targetGeometry = new THREE.BoxGeometry(1, 1, 1);
    const targetMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    this.target = new THREE.Mesh(targetGeometry, targetMaterial);
    this.scene.add(this.target);

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    this.scene.add(directionalLight);

    // Position camera
    this.camera.position.set(0, 10, 15);
    this.camera.lookAt(0, 0, 0);

    // Action space (not used in rendering)
    this.actionSpace = [
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0)
    ];
    this.reset();
  }

  reset(): string {
    this.ball.position.set(0, 0.5, 0);
    const tx = Math.floor(Math.random() * 17) - 8;
    const tz = Math.floor(Math.random() * 17) - 8;
    this.target.position.set(tx, 0.5, tz);
    return this.getState();
  }

  getState(): string {
    const x = Math.round(this.ball.position.x);
    const z = Math.round(this.ball.position.z);
    return `${x},${z}`;
  }

  step(action: number): { state: string; reward: number; done: boolean } {
    const move = this.actionSpace[action].clone().multiplyScalar(1);
    this.ball.position.add(move);
    this.ball.position.x = THREE.MathUtils.clamp(this.ball.position.x, -10, 10);
    this.ball.position.z = THREE.MathUtils.clamp(this.ball.position.z, -10, 10);

    const dist = this.ball.position.distanceTo(this.target.position);
    let reward = -dist;
    let done = false;
    if (dist < 1) {
      reward = 10;
      done = true;
    }
    const newState = this.getState();
    return { state: newState, reward, done };
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}

class QLearningAgent {
  private lr: number;
  private gamma: number;
  private epsilon: number;
  public qTable: { [state: string]: number[] };
  public actions: THREE.Vector3[];

  constructor(actions: THREE.Vector3[], learningRate = 0.1, discount = 0.95, epsilon = 0.2) {
    this.actions = actions;
    this.lr = learningRate;
    this.gamma = discount;
    this.epsilon = epsilon;
    this.qTable = {};
  }

  checkState(state: string): void {
    if (!this.qTable[state]) {
      this.qTable[state] = new Array(this.actions.length).fill(0);
    }
  }

  selectAction(state: string): number {
    this.checkState(state);
    if (Math.random() < this.epsilon) {
      return Math.floor(Math.random() * this.actions.length);
    }
    return this.qTable[state].indexOf(Math.max(...this.qTable[state]));
  }

  update(state: string, action: number, reward: number, nextState: string): void {
    this.checkState(state);
    this.checkState(nextState);
    const predict = this.qTable[state][action];
    const target = reward + this.gamma * Math.max(...this.qTable[nextState]);
    this.qTable[state][action] += this.lr * (target - predict);
  }
}

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const env = new Environment(container);
    const agent = new QLearningAgent(env.actionSpace);

    // Uncomment the following block to run the training loop asynchronously:
    
    let episode = 0;
    const maxEpisodes = 100;
    function trainEpisode() {
      let state = env.reset();
      let done = false;
      let steps = 0;
      while (!done && steps < 100) {
        const action = agent.selectAction(state);
        const { state: nextState, reward, done: episodeDone } = env.step(action);
        agent.update(state, action, reward, nextState);
        state = nextState;
        steps++;
        if (episodeDone) { done = true; }
      }
      episode++;
      console.log(`Episode ${episode} finished in ${steps} steps.`);
      if (episode < maxEpisodes) {
        setTimeout(trainEpisode, 0);
      } else {
        console.log("Training complete.");
      }
    }
    trainEpisode();
    

    function animate() {
      requestAnimationFrame(animate);
      env.render();
    }
    animate();

    // Cleanup function if needed
    return () => {
      // Optionally, remove the renderer's DOM element or cancel animation frame.
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100vw', height: '100vh', margin: 0, overflow: 'hidden' }} />;
};

export default App;
