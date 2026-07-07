import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { cargarPalabras, crearTexturaPalabra } from './words.js';

// 1. CONFIGURACIÓN E INICIALIZACIÓN DE LA ESCENA DE ALTA FIDELIDAD
const contenedor = document.getElementById('canvas-container');
const escena = new THREE.Scene();
escena.fog = new THREE.FogExp2(0x010105, 0.0025); // Niebla espacial cinemática

const camara = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camara.position.set(0, 90, 140);

const renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    powerPreference: "high-performance",
    alpha: false
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// Configuración de iluminación HDR y mapeo de tonos para colores ultra vivos
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
contenedor.appendChild(renderer.domElement);

const controles = new OrbitControls(camara, renderer.domElement);
controles.enableDamping = true;
controles.dampingFactor = 0.05;
controles.maxDistance = 250;
controles.minDistance = 20;

// Variables globales de interacción y objetos
let objetosPalabras = [];
let objetosPlanetas = [];
let anillosAcrecion = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let objetoSeleccionado = null;

// Línea láser interactiva con resplandor neón hacia la singularidad
const materialLinea = new THREE.LineBasicMaterial({ 
    color: 0xffaa00, 
    transparent: true, 
    opacity: 0,
    blending: THREE.AdditiveBlending 
});
const geometriaLinea = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0)]);
const lineaGravedad = new THREE.Line(geometriaLinea, materialLinea);
escena.add(lineaGravedad);

const paletaColores = ['#ff4757', '#ffa502', '#ff7f50', '#2ed573', '#1e90ff', '#70a1ff', '#eccc68'];

// 2. CREACIÓN DEL AGUJERO NEGRO CINEMÁTICO Y 7 MUNDOS REALISTAS
function crearEntornoEspacial() {
    // --- EL AGUJERO NEGRO ULTRA REALISTA ---
    // Singularidad Central (Absorción total de luz)
    const radioAgujero = 6;
    const geoAgujero = new THREE.SphereGeometry(radioAgujero, 64, 64);
    const matAgujero = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const agujeroNegro = new THREE.Mesh(geoAgujero, matAgujero);
    escena.add(agujeroNegro);

    // Anillo de Acreción Principal (Naranja ardiente de gas masivo)
    const geoDisco1 = new THREE.RingGeometry(radioAgujero * 1.1, radioAgujero * 3.5, 96);
    geoDisco1.rotateX(Math.PI / 2);
    const matDisco1 = new THREE.MeshBasicMaterial({
        color: 0xff4500,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
    });
    const disco1 = new THREE.Mesh(geoDisco1, matDisco1);
    escena.add(disco1);
    anillosAcrecion.push({ malla: disco1, velocidad: -0.6 });

    // Segundo Anillo Secundario (Efecto de deformación de luz y polvo de estrellas veloz)
    const geoDisco2 = new THREE.RingGeometry(radioAgujero * 1.5, radioAgujero * 5, 96);
    geoDisco2.rotateX(Math.PI / 2.1); // Ligeramente inclinado para realismo estético
    const matDisco2 = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending
    });
    const disco2 = new THREE.Mesh(geoDisco2, matDisco2);
    escena.add(disco2);
    anillosAcrecion.push({ malla: disco2, velocidad: 0.9 });

    // Resplandor del horizonte de sucesos (Atmósfera cuántica brillante)
    const geoGlow = new THREE.SphereGeometry(radioAgujero * 1.15, 32, 32);
    const matGlow = new THREE.MeshBasicMaterial({
        color: 0xff7700,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
    });
    const auraCentro = new THREE.Mesh(geoGlow, matGlow);
    escena.add(auraCentro);


    // --- SISTEMA DE ILUMINACIÓN AVANZADO (FÍSICA DE LUCES) ---
    const luzAmbiental = new THREE.AmbientLight(0x1a1a2e, 1.2);
    escena.add(luzAmbiental);

    // Gran destello emitido desde el núcleo galáctico hacia el espacio
    const luzFocoCentral = new THREE.PointLight(0xff7700, 4, 200, 0.5);
    luzFocoCentral.position.set(0, 0, 0);
    escena.add(luzFocoCentral);

    // Luz azulada de contraste del espacio profundo
    const luzContraste = new THREE.DirectionalLight(0x3a4f7c, 1.5);
    luzContraste.position.set(50, 100, 50);
    escena.add(luzContraste);


    // --- FONDO DE ESTRELLAS LUMINOSAS ---
    const conteoEstrellas = 12000;
    const geoEstrellas = new THREE.BufferGeometry();
    const posEstrellas = new Float32Array(conteoEstrellas * 3);
    const coloresEstrellas = new Float32Array(conteoEstrellas * 3);

    for (let i = 0; i < conteoEstrellas * 3; i += 3) {
        const r = Math.random() * 170;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);

        posEstrellas[i] = r * Math.sin(phi) * Math.cos(theta);
        posEstrellas[i+1] = (Math.random() - 0.5) * 14 * (1 - r/170); 
        posEstrellas[i+2] = r * Math.sin(phi) * Math.sin(theta);

        const randColor = Math.random();
        if (randColor > 0.7) {
            coloresEstrellas[i] = 1.0; coloresEstrellas[i+1] = 0.5; coloresEstrellas[i+2] = 0.2; // Supernovas
        } else if (randColor > 0.35) {
            coloresEstrellas[i] = 0.4; coloresEstrellas[i+1] = 0.8; coloresEstrellas[i+2] = 1.0; // Gigantes azules
        } else {
            coloresEstrellas[i] = 0.9; coloresEstrellas[i+1] = 0.9; coloresEstrellas[i+2] = 1.0; // Polvo estelar
        }
    }
    geoEstrellas.setAttribute('position', new THREE.BufferAttribute(posEstrellas, 3));
    geoEstrellas.setAttribute('color', new THREE.BufferAttribute(coloresEstrellas, 3));

    const matEstrellas = new THREE.PointsMaterial({
        size: 0.35,
        vertexColors: true,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending
    });
    const sistemaEstrellas = new THREE.Points(geoEstrellas, matEstrellas);
    escena.add(sistemaEstrellas);


    // --- LOS 7 PLANETAS MEJORADOS E HIPERREALISTAS ---
    const datosPlanetas = [
        { nombre: 'Mundo de Magma', radio: 3.4, distancia: 32, color: 0xff3300, emissive: 0x661100, metal: 0.1, rugosidad: 0.5, vel: 0.016 },
        { nombre: 'Planeta Esmeralda', radio: 2.2, distancia: 50, color: 0x00ff88, emissive: 0x004411, metal: 0.4, rugosidad: 0.2, vel: 0.012 },
        { nombre: 'Mundo de Hielo Aurora', radio: 3.0, distancia: 68, color: 0x00d2d3, emissive: 0x002244, metal: 0.8, rugosidad: 0.1, vel: 0.009 },
        { nombre: 'Gigante Eléctrico', radio: 4.8, distancia: 88, color: 0x2e86de, emissive: 0x001144, metal: 0.2, rugosidad: 0.4, vel: 0.007 },
        { nombre: 'Mundo Amatista', radio: 2.8, distancia: 106, color: 0x9b59b6, emissive: 0x330044, metal: 0.6, rugosidad: 0.2, vel: 0.005 },
        { nombre: 'Planeta Dorado', radio: 3.6, distancia: 124, color: 0xf1c40f, emissive: 0x554400, metal: 0.9, rugosidad: 0.15, vel: 0.004 },
        { nombre: 'Mundo del Vacío', radio: 4.0, distancia: 144, color: 0x34495e, emissive: 0x11161b, metal: 0.3, rugosidad: 0.6, vel: 0.003 }
    ];

    datosPlanetas.forEach((p) => {
        const geoPlaneta = new THREE.SphereGeometry(p.radio, 48, 48);
        
        // Material con propiedades de renderizado físico (PBR) para realismo óptico máximo
        const matPlaneta = new THREE.MeshStandardMaterial({
            color: p.color,
            emissive: p.emissive,
            metalness: p.metal,
            roughness: p.rugosidad,
            bumpScale: 0.05
        });
        
        const mallaPlaneta = new THREE.Mesh(geoPlaneta, matPlaneta);
        const anguloInicial = Math.random() * Math.PI * 2;
        
        mallaPlaneta.position.x = Math.cos(anguloInicial) * p.distancia;
        mallaPlaneta.position.z = Math.sin(anguloInicial) * p.distancia;

        mallaPlaneta.userData = {
            nombre: p.nombre,
            distancia: p.distancia,
            angulo: anguloInicial,
            velocidad: p.vel,
            esPlaneta: true,
            escalaOriginal: { x: 1, y: 1, z: 1 }
        };

        // Luces puntuales HDR integradas a cada planeta para iluminar las palabras al pasar
        const luzInterna = new THREE.PointLight(p.color, 2.5, p.radio * 5);
        mallaPlaneta.add(luzInterna);

        // Anillo brillante estético exclusivo para el Gigante Eléctrico y Planeta Dorado
        if(p.nombre === 'Gigante Eléctrico' || p.nombre === 'Planeta Dorado') {
            const geoAnillo = new THREE.RingGeometry(p.radio * 1.4, p.radio * 2.3, 32);
            geoAnillo.rotateX(Math.PI / 2.3);
            const matAnillo = new THREE.MeshBasicMaterial({
                color: p.color,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.4,
                blending: THREE.AdditiveBlending
            });
            const anilloMalla = new THREE.Mesh(geoAnillo, matAnillo);
            mallaPlaneta.add(anilloMalla);
        }

        // Atmósfera externa brillante artificial usando una esfera transparente invertida
        const geoAtmo = new THREE.SphereGeometry(p.radio * 1.1, 32, 32);
        const matAtmo = new THREE.MeshBasicMaterial({
            color: p.color,
            transparent: true,
            opacity: 0.25,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide
        });
        const atmoMalla = new THREE.Mesh(geoAtmo, matAtmo);
        mallaPlaneta.add(atmoMalla);

        escena.add(mallaPlaneta);
        objetosPlanetas.push(mallaPlaneta);
    });
}

// 3. FLUJO PRINCIPAL DE INICIALIZACIÓN Y CONFIGURACIÓN DE PALABRAS
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

    crearEntornoEspacial();

    // DISTRIBUCIÓN MATEMÁTICA EN ESPIRAL (2,000+ FRASES)
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

        const distanciaAlCentro = Math.pow(Math.random(), 1.75) * 125 + 7; 
        const brazoAngulo = (i % numeroBrazos) * ((2 * Math.PI) / numeroBrazos);
        const anguloEspiral = distanciaAlCentro * 0.11 + brazoAngulo;

        const dispersionX = (Math.random() - 0.5) * (distanciaAlCentro * 0.22);
        const dispersionY = (Math.random() - 0.5) * (distanciaAlCentro * 0.07);
        const dispersionZ = (Math.random() - 0.5) * (distanciaAlCentro * 0.22);

        sprite.position.x = Math.cos(anguloEspiral) * distanciaAlCentro + dispersionX;
        sprite.position.y = dispersionY;
        sprite.position.z = Math.sin(anguloEspiral) * distanciaAlCentro + dispersionZ;

        const escalaBase = Math.max(1.9, 4.8 * (1 - distanciaAlCentro / 150));
        sprite.scale.set(escalaBase * 2, escalaBase * 0.5, 1);

        sprite.userData = {
            texto: palabraTexto,
            escalaOriginal: { x: escalaBase * 2, y: escalaBase * 0.5 },
            colorOriginal: colorAleatorio,
            velocidadOrbita: 0.16 / distanciaAlCentro + 0.0012, 
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

    // REACCIÓN AL CLIC (EFECTO PULSO EMISIVO)
    window.addEventListener('click', () => {
        if (objetoSeleccionado && !objetoSeleccionado.userData.esPlaneta) {
            objetoSeleccionado.userData.latido = true;
            objetoSeleccionado.userData.tiempoLatido = 0;
            objetoSeleccionado.material.color.setHex(0xffffff); 
        }
    });

    const reloj = new THREE.Clock();

    // 4. BUCLE INFINITO DE ANIMACIÓN ULTRA FLUIDA (60 FPS)
    function animacion() {
        requestAnimationFrame(animacion);
        const delta = reloj.getDelta();
        const tiempoTotal = reloj.getElapsedTime();

        // Rotación de los múltiples anillos lumínicos del Agujero Negro
        anillosAcrecion.forEach((anillo) => {
            anillo.malla.rotation.z += delta * anillo.velocidad;
        });

        // Simulación física orbital de los 7 planetas PBR
        objetosPlanetas.forEach((planeta) => {
            const data = planeta.userData;
            data.angulo += data.velocidad * 0.4;
            planeta.position.x = Math.cos(data.angulo) * data.distancia;
            planeta.position.z = Math.sin(data.angulo) * data.distancia;
            planeta.rotation.y += delta * 0.4; // Rotación planetaria realista
        });

        // Órbita y oscilación vertical cuántica de las palabras
        objetosPalabras.forEach((sprite) => {
            const data = sprite.userData;
            data.angulo += data.velocidadOrbita * 0.32; 
            
            sprite.position.x = Math.cos(data.angulo) * data.distancia;
            sprite.position.z = Math.sin(data.angulo) * data.distancia;
            sprite.position.y = data.yOriginal + Math.sin(tiempoTotal * 1.3 + data.distancia) * 0.22;

            if (data.latido) {
                data.tiempoLatido += delta * 6;
                const factorLatido = 1 + Math.sin(data.tiempoLatido) * 0.55;
                sprite.scale.set(data.escalaOriginal.x * factorLatido, data.escalaOriginal.y * factorLatido, 1);
                
                if (data.tiempoLatido > Math.PI) {
                    data.latido = false;
                    sprite.material.color.setStyle(data.colorOriginal); 
                }
            }
        });

        // DETECCIÓN INTERACTIVA (RAYCASTING INTELIGENTE)
        raycaster.setFromCamera(mouse, camara);
        const todosLosObjetos = [...objetosPalabras, ...objetosPlanetas];
        const intersecciones = raycaster.intersectObjects(todosLosObjetos);

        if (intersecciones.length > 0) {
            const primerObjeto = intersecciones[0].object;

            if (objetoSeleccionado !== primerObjeto) {
                restaurarObjetoPrevio();
                objetoSeleccionado = primerObjeto;
                
                if (objetoSeleccionado.userData.esPlaneta) {
                    // Crecimiento cinemático de los mundos en Hover
                    objetoSeleccionado.scale.set(1.25, 1.25, 1.25);
                } else {
                    // Crecimiento y resplandor de palabras
                    objetoSeleccionado.scale.set(
                        objetoSeleccionado.userData.escalaOriginal.x * 1.6,
                        objetoSeleccionado.userData.escalaOriginal.y * 1.6,
                        1
                    );
                }

                // Fijar rayo conector hiperbólico hacia la posición actual
                const puntosLinea = [new THREE.Vector3(0, 0, 0), objetoSeleccionado.position];
                lineaGravedad.geometry.setFromPoints(puntosLinea);
                lineaGravedad.material.opacity = 0.85;
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
