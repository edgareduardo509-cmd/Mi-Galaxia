import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { cargarPalabras, crearTexturaPalabra } from './words.js';

// 1. CONFIGURACIÓN E INICIALIZACIÓN DE LA ESCENA 3D
const contenedor = document.getElementById('canvas-container');
const escena = new THREE.Scene();
escena.fog = new THREE.FogExp2(0x020208, 0.003); 

const camara = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camara.position.set(0, 80, 120);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
contenedor.appendChild(renderer.domElement);

const controles = new OrbitControls(camara, renderer.domElement);
controles.enableDamping = true;
controles.dampingFactor = 0.05;
controles.maxDistance = 220;
controles.minDistance = 15;

// Variables globales de interacción y objetos
let objetosPalabras = [];
let objetosPlanetas = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let objetoSeleccionado = null;

// Línea láser interactiva hacia el centro del Agujero Negro u objetos
const materialLinea = new THREE.LineBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0 });
const geometriaLinea = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0)]);
const lineaGravedad = new THREE.Line(geometriaLinea, materialLinea);
escena.add(lineaGravedad);

const paletaColores = ['#ff6b6b', '#ffb8b8', '#ff9f43', '#00d2d3', '#1dd1a1', '#feca57', '#54a0ff'];

// 2. FUNCIÓN PARA CREAR EL AGUJERO NEGRO, ESTRELLAS Y PLANETAS
function crearEntornoEspacial() {
    // Horizonte de sucesos (Agujero Negro Central)
    const radioAgujero = 5;
    const geoAgujero = new THREE.SphereGeometry(radioAgujero, 32, 32);
    const matAgujero = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const agujeroNegro = new THREE.Mesh(geoAgujero, matAgujero);
    escena.add(agujeroNegro);

    // Disco de acreción naranja brillante
    const geoDisco = new THREE.RingGeometry(radioAgujero * 1.2, radioAgujero * 4, 64);
    geoDisco.rotateX(Math.PI / 2); 
    const matDisco = new THREE.MeshBasicMaterial({
        color: 0xff4500,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    const discoAcrecion = new THREE.Mesh(geoDisco, matDisco);
    escena.add(discoAcrecion);

    // Fondo estelar masivo
    const conteoEstrellas = 10000;
    const geoEstrellas = new THREE.BufferGeometry();
    const posEstrellas = new Float32Array(conteoEstrellas * 3);
    const coloresEstrellas = new Float32Array(conteoEstrellas * 3);

    for (let i = 0; i < conteoEstrellas * 3; i += 3) {
        const r = Math.random() * 160;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);

        posEstrellas[i] = r * Math.sin(phi) * Math.cos(theta);
        posEstrellas[i+1] = (Math.random() - 0.5) * 12 * (1 - r/160); 
        posEstrellas[i+2] = r * Math.sin(phi) * Math.sin(theta);

        const randColor = Math.random();
        if (randColor > 0.6) {
            coloresEstrellas[i] = 1.0; coloresEstrellas[i+1] = 0.6; coloresEstrellas[i+2] = 0.3;
        } else if (randColor > 0.3) {
            coloresEstrellas[i] = 0.5; coloresEstrellas[i+1] = 0.7; coloresEstrellas[i+2] = 1.0;
        } else {
            coloresEstrellas[i] = 1.0; coloresEstrellas[i+1] = 1.0; coloresEstrellas[i+2] = 1.0;
        }
    }

    geoEstrellas.setAttribute('position', new THREE.BufferAttribute(posEstrellas, 3));
    geoEstrellas.setAttribute('color', new THREE.BufferAttribute(coloresEstrellas, 3));

    const matEstrellas = new THREE.PointsMaterial({
        size: 0.3,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });

    const sistemaEstrellas = new THREE.Points(geoEstrellas, matEstrellas);
    escena.add(sistemaEstrellas);

    // 🪐 CONFIGURACIÓN DE LOS NUEVOS MUNDOS (PLANETAS)
    const datosPlanetas = [
        { nombre: 'Mundo de Fuego', radio: 3.5, distancia: 35, color: 0xff3300, emision: 0x551100, velocidad: 0.015, esPlaneta: true },
        { nombre: 'Mundo de Hielo', radio: 2.5, distancia: 65, color: 0x00d2d3, emision: 0x003344, velocidad: 0.008, esPlaneta: true },
        { nombre: 'Mundo Místico', radio: 4.0, distancia: 95, color: 0xa55eea, emision: 0x330044, velocidad: 0.004, esPlaneta: true }
    ];

    datosPlanetas.forEach((p) => {
        // Cuerpo del planeta en alta definición
        const geoPlaneta = new THREE.SphereGeometry(p.radio, 32, 32);
        const matPlaneta = new THREE.MeshStandardMaterial({
            color: p.color,
            emissive: p.emision,
            roughness: 0.2,
            metalness: 0.1
        });
        
        const mallaPlaneta = new THREE.Mesh(geoPlaneta, matPlaneta);
        
        // Inicializar posición angular aleatoria
        const anguloInicial = Math.random() * Math.PI * 2;
        mallaPlaneta.position.x = Math.cos(anguloInicial) * p.distancia;
        mallaPlaneta.position.z = Math.sin(anguloInicial) * p.distancia;

        // Guardamos su info para la animación
        mallaPlaneta.userData = {
            nombre: p.nombre,
            distancia: p.distancia,
            angulo: anguloInicial,
            velocidad: p.velocidad,
            esPlaneta: true,
            escalaOriginal: { x: 1, y: 1, z: 1 }
        };

        // Agregar una luz interna suave para que brille entre las palabras
        const luzPlaneta = new THREE.PointLight(p.color, 1, p.radio * 4);
        mallaPlaneta.add(luzPlaneta);

        escena.add(mallaPlaneta);
        objetosPlanetas.push(mallaPlaneta);
    });

    // Agregar una luz ambiental y una direccional para dar volumen 3D a los planetas
    const luzAmbiental = new THREE.AmbientLight(0x333333);
    escena.add(luzAmbiental);
    const luzCentral = new THREE.PointLight(0xffaa44, 2, 150);
    luzCentral.position.set(0, 0, 0);
    escena.add(luzCentral);

    return { discoAcrecion };
}

// 3. FLUJO PRINCIPAL DE INICIALIZACIÓN
async function iniciar() {
    let listaPalabrasBase = ['Amor', 'Mi Reina', 'Siempre', 'Universo', 'Cariño', 'Vida', 'Felicidad', 'Mi Sol', 'Te Amo', 'Mi Paz'];
    
    try {
        const cargarConTimeout = Promise.race([
            cargarPalabras(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500))
        ]);
        const palabrasCargadas = await cargarConTimeout;
        if (palabrasCargadas && palabrasCargadas.length > 0) {
            listaPalabrasBase = palabrasCargadas;
        }
    } catch (e) {
        console.log("Cargando lista de palabras de respaldo integrada...");
    }

    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) loadingDiv.style.opacity = '0'; 

    const { discoAcrecion } = crearEntornoEspacial();

    // DISTRIBUCIÓN MATEMÁTICA DE LAS 2,000 PALABRAS
    const totalPalabras = 2050;
    const numeroBrazos = 4;

    for (let i = 0; i < totalPalabras; i++) {
        const palabraTexto = listaPalabrasBase[i % listaPalabrasBase.length];
        const colorAleatorio = paletaColores[Math.floor(Math.random() * paletaColores.length)];
        const textura = crearTexturaPalabra(palabraTexto, colorAleatorio);

        const materialSprite = new THREE.SpriteMaterial({
            map: textura,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const sprite = new THREE.Sprite(materialSprite);

        const distanciaAlCentro = Math.pow(Math.random(), 1.8) * 115 + 6; 
        const brazoAngulo = (i % numeroBrazos) * ((2 * Math.PI) / numeroBrazos);
        const anguloEspiral = distanciaAlCentro * 0.12 + brazoAngulo;

        const dispersionX = (Math.random() - 0.5) * (distanciaAlCentro * 0.23);
        const dispersionY = (Math.random() - 0.5) * (distanciaAlCentro * 0.08);
        const dispersionZ = (Math.random() - 0.5) * (distanciaAlCentro * 0.23);

        sprite.position.x = Math.cos(anguloEspiral) * distanciaAlCentro + dispersionX;
        sprite.position.y = dispersionY;
        sprite.position.z = Math.sin(anguloEspiral) * distanciaAlCentro + dispersionZ;

        const escalaBase = Math.max(2.0, 5.0 * (1 - distanciaAlCentro / 140));
        sprite.scale.set(escalaBase * 2, escalaBase * 0.5, 1);

        sprite.userData = {
            texto: palabraTexto,
            escalaOriginal: { x: escalaBase * 2, y: escalaBase * 0.5 },
            colorOriginal: colorAleatorio,
            velocidadOrbita: 0.15 / distanciaAlCentro + 0.0015, 
            distancia: distanciaAlCentro,
            angulo: anguloEspiral,
            yOriginal: dispersionY,
            latido: false,
            tiempoLatido: 0,
            esPlaneta: false
        };

        escena.add(sprite);
        objetosPalabras.push(sprite);
    }

    // CAPTURA DE MOVIMIENTO DEL MOUSE
    window.addEventListener('mousemove', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // EFECTO DE CLICK (LATIDO/SELECCIÓN)
    window.addEventListener('click', () => {
        if (objetoSeleccionado && !objetoSeleccionado.userData.esPlaneta) {
            objetoSeleccionado.userData.latido = true;
            objetoSeleccionado.userData.tiempoLatido = 0;
            objetoSeleccionado.material.color.setHex(0xffffff); 
        }
    });

    const reloj = new THREE.Clock();

    // 4. BUCLE INFINITO DE ANIMACIÓN (A 60 FPS)
    function animacion() {
        requestAnimationFrame(animacion);
        const delta = reloj.getDelta();
        const tiempoTotal = reloj.getElapsedTime();

        discoAcrecion.rotation.z -= delta * 0.4;

        // Mover planetas en sus órbitas y hacerlos rotar sobre su propio eje
        objetosPlanetas.forEach((planeta) => {
            const data = planeta.userData;
            data.angulo += data.velocidad * 0.5;
            planeta.position.x = Math.cos(data.angulo) * data.distancia;
            planeta.position.z = Math.sin(data.angulo) * data.distancia;
            planeta.rotation.y += delta * 0.5; // Giro sobre sí mismo
        });

        // Animación orbital de cada palabra
        objetosPalabras.forEach((sprite) => {
            const data = sprite.userData;
            data.angulo += data.velocidadOrbita * 0.35; 
            
            sprite.position.x = Math.cos(data.angulo) * data.distancia;
            sprite.position.z = Math.sin(data.angulo) * data.distancia;
            sprite.position.y = data.yOriginal + Math.sin(tiempoTotal * 1.5 + data.distancia) * 0.25;

            if (data.latido) {
                data.tiempoLatido += delta * 6;
                const factorLatido = 1 + Math.sin(data.tiempoLatido) * 0.5;
                sprite.scale.set(data.escalaOriginal.x * factorLatido, data.escalaOriginal.y * factorLatido, 1);
                
                if (data.tiempoLatido > Math.PI) {
                    data.latido = false;
                    sprite.material.color.setStyle(data.colorOriginal); 
                }
            }
        });

        // DETECCIÓN INTERACTIVA (RAYCASTING MOUSE HOVER)
        raycaster.setFromCamera(mouse, camara);
        // Combinamos planetas y palabras para que el mouse pueda detectar ambos
        const todosLosObjetos = [...objetosPalabras, ...objetosPlanetas];
        const intersecciones = raycaster.intersectObjects(todosLosObjetos);

        if (intersecciones.length > 0) {
            const primerObjeto = intersecciones[0].object;

            if (objetoSeleccionado !== primerObjeto) {
                restaurarObjetoPrevio();
                objetoSeleccionado = primerObjeto;
                
                if (objetoSeleccionado.userData.esPlaneta) {
                    // Si es un planeta, crece de tamaño esférico
                    objetoSeleccionado.scale.set(1.3, 1.3, 1.3);
                } else {
                    // Si es una palabra, se estira
                    objetoSeleccionado.scale.set(
                        objetoSeleccionado.userData.escalaOriginal.x * 1.6,
                        objetoSeleccionado.userData.escalaOriginal.y * 1.6,
                        1
                    );
                }

                // Activar línea láser desde el núcleo
                const puntosLinea = [new THREE.Vector3(0, 0, 0), objetoSeleccionado.position];
                lineaGravedad.geometry.setFromPoints(puntosLinea);
                lineaGravedad.material.opacity = 0.7;
            } else {
                const puntosLinea = [new THREE.Vector3(0, 0, 0), objetoSeleccionado.position];
                lineaGravedad.geometry.setFromPoints(puntosLinea);
            }
        } else {
            restaurarObjetoPrevio();
        }

        controles.update();
        renderer.render(escena, camara);
    }

    function restaurarObjetoPrevio() {
        if (objetoSeleccionado) {
            if (objetoSeleccionado.userData.esPlaneta) {
                objetoSeleccionado.scale.set(1, 1, 1);
            } else if (!objetoSeleccionado.userData.latido) {
                objetoSeleccionado.scale.set(
                    objetoSeleccionado.userData.escalaOriginal.x,
                    objetoSeleccionado.userData.escalaOriginal.y,
                    1
                );
            }
            objetoSeleccionado = null;
            lineaGravedad.material.opacity = 0;
        }
    }

    animacion();
}

window.addEventListener('resize', () => {
    camara.aspect = window.innerWidth / window.innerHeight;
    camara.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

iniciar();
