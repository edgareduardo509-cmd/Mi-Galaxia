import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { cargarPalabras, crearTexturaPalabra } from './words.js';

// 1. CONFIGURACIÓN E INICIALIZACIÓN DE LA ESCENA 3D
const contenedor = document.getElementById('canvas-container');
const escena = new THREE.Scene();
escena.fog = new THREE.FogExp2(0x020208, 0.003); // Niebla espacial profunda

const camara = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camara.position.set(0, 70, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
contenedor.appendChild(renderer.domElement);

const controles = new OrbitControls(camara, renderer.domElement);
controles.enableDamping = true;
controles.dampingFactor = 0.05;
controles.maxDistance = 200;
controles.minDistance = 15;

// Variables globales de interacción
let objetosPalabras = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let objetoSeleccionado = null;

// Línea láser interactiva hacia el centro del Agujero Negro
const materialLinea = new THREE.LineBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0 });
const geometriaLinea = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0)]);
const lineaGravedad = new THREE.Line(geometriaLinea, materialLinea);
escena.add(lineaGravedad);

// Paleta de colores cósmicos para los brazos espirales
const paletaColores = ['#ff6b6b', '#ffb8b8', '#ff9f43', '#00d2d3', '#1dd1a1', '#feca57', '#54a0ff'];

// 2. FUNCIÓN PARA CREAR EL AGUJERO NEGRO Y LAS ESTRELLAS DE FONDO
function crearEntornoEspacial() {
    // Horizonte de sucesos (El centro negro absoluto)
    const radioAgujero = 4;
    const geoAgujero = new THREE.SphereGeometry(radioAgujero, 32, 32);
    const matAgujero = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const agujeroNegro = new THREE.Mesh(geoAgujero, matAgujero);
    escena.add(agujeroNegro);

    // Disco de acreción naranja brillante alrededor del centro
    const geoDisco = new THREE.RingGeometry(radioAgujero * 1.2, radioAgujero * 4, 64);
    geoDisco.rotateX(Math.PI / 2); // Acostar el disco horizontalmente
    const matDisco = new THREE.MeshBasicMaterial({
        color: 0xff4500,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    const discoAcrecion = new THREE.Mesh(geoDisco, matDisco);
    escena.add(discoAcrecion);

    // Fondo estelar masivo (Polvo cósmico de estrellas)
    const conteoEstrellas = 10000;
    const geoEstrellas = new THREE.BufferGeometry();
    const posEstrellas = new Float32Array(conteoEstrellas * 3);
    const coloresEstrellas = new Float32Array(conteoEstrellas * 3);

    for (let i = 0; i < conteoEstrellas * 3; i += 3) {
        const r = Math.random() * 150;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);

        posEstrellas[i] = r * Math.sin(phi) * Math.cos(theta);
        posEstrellas[i+1] = (Math.random() - 0.5) * 12 * (1 - r/150); // Aplanado galáctico
        posEstrellas[i+2] = r * Math.sin(phi) * Math.sin(theta);

        const randColor = Math.random();
        if (randColor > 0.6) {
            coloresEstrellas[i] = 1.0; coloresEstrellas[i+1] = 0.6; coloresEstrellas[i+2] = 0.3; // Estrellas Naranjas
        } else if (randColor > 0.3) {
            coloresEstrellas[i] = 0.5; coloresEstrellas[i+1] = 0.7; coloresEstrellas[i+2] = 1.0; // Estrellas Azules
        } else {
            coloresEstrellas[i] = 1.0; coloresEstrellas[i+1] = 1.0; coloresEstrellas[i+2] = 1.0; // Estrellas Blancas
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

    return { discoAcrecion };
}

// 3. FLUJO PRINCIPAL DE INICIALIZACIÓN
async function iniciar() {
    let listaPalabrasBase = ['Amor', 'Mi Reina', 'Siempre', 'Universo', 'Cariño', 'Vida', 'Felicidad', 'Mi Sol', 'Te Amo', 'Mi Paz'];
    
    try {
        // Intentamos cargar el archivo con un límite de tiempo rápido para evitar congelamientos
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

    // Ocultar el aviso de carga inmediatamente
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

        // Fórmula matemática de Espiral Logarítmica para Galaxias
        const distanciaAlCentro = Math.pow(Math.random(), 1.8) * 110 + 6; 
        const brazoAngulo = (i % numeroBrazos) * ((2 * Math.PI) / numeroBrazos);
        const anguloEspiral = distanciaAlCentro * 0.12 + brazoAngulo;

        // Dispersión tridimensional (Grosor e imperfección del brazo de la galaxia)
        const dispersionX = (Math.random() - 0.5) * (distanciaAlCentro * 0.25);
        const dispersionY = (Math.random() - 0.5) * (distanciaAlCentro * 0.08);
        const dispersionZ = (Math.random() - 0.5) * (distanciaAlCentro * 0.25);

        sprite.position.x = Math.cos(anguloEspiral) * distanciaAlCentro + dispersionX;
        sprite.position.y = dispersionY;
        sprite.position.z = Math.sin(anguloEspiral) * distanciaAlCentro + dispersionZ;

        // Escalar tamaño según su cercanía o lejanía del centro
        const escalaBase = Math.max(2.2, 5.5 * (1 - distanciaAlCentro / 140));
        sprite.scale.set(escalaBase * 2, escalaBase * 0.5, 1);

        // Guardar memoria interna en el Sprite para animaciones individuales
        sprite.userData = {
            texto: palabraTexto,
            escalaOriginal: { x: escalaBase * 2, y: escalaBase * 0.5 },
            colorOriginal: colorAleatorio,
            velocidadOrbita: 0.15 / distanciaAlCentro + 0.0015, // Más rápidas al centro, lentas fuera
            distancia: distanciaAlCentro,
            angulo: anguloEspiral,
            yOriginal: dispersionY,
            latido: false,
            tiempoLatido: 0
        };

        escena.add(sprite);
        objetosPalabras.push(sprite);
    }

    // CAPTURA DE MOVIMIENTO DEL MOUSE
    window.addEventListener('mousemove', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // EFECTO DE CLICK (LATIDO/CAMBIO DE COLOR)
    window.addEventListener('click', () => {
        if (objetoSeleccionado) {
            objetoSeleccionado.userData.latido = true;
            objetoSeleccionado.userData.tiempoLatido = 0;
            objetoSeleccionado.material.color.setHex(0xffffff); // Destello blanco momentáneo
        }
    });

    const reloj = new THREE.Clock();

    // 4. BUCLE INFINITO DE ANIMACIÓN (A 60 FPS)
    function animacion() {
        requestAnimationFrame(animacion);
        const delta = reloj.getDelta();
        const tiempoTotal = reloj.getElapsedTime();

        // Rotación sutil del disco central
        discoAcrecion.rotation.z -= delta * 0.4;

        // Animación orbital individual de cada palabra
        objetosPalabras.forEach((sprite) => {
            const data = sprite.userData;
            data.angulo += data.velocidadOrbita * 0.35; // Avanzar ángulo orbital
            
            sprite.position.x = Math.cos(data.angulo) * data.distancia;
            sprite.position.z = Math.sin(data.angulo) * data.distancia;
            
            // Flotación armónica ondulante en el eje Y
            sprite.position.y = data.yOriginal + Math.sin(tiempoTotal * 1.5 + data.distancia) * 0.25;

            // Manejo del efecto latido post-click
            if (data.latido) {
                data.tiempoLatido += delta * 6;
                const factorLatido = 1 + Math.sin(data.tiempoLatido) * 0.5;
                sprite.scale.set(data.escalaOriginal.x * factorLatido, data.escalaOriginal.y * factorLatido, 1);
                
                if (data.tiempoLatido > Math.PI) {
                    data.latido = false;
                    sprite.material.color.setStyle(data.colorOriginal); // Regresa a su color
                }
            }
        });

        // DETECCIÓN INTERACTIVA (RAYCASTING HOVER)
        raycaster.setFromCamera(mouse, camara);
        const intersecciones = raycaster.intersectObjects(objetosPalabras);

        if (intersecciones.length > 0) {
            const primerObjeto = intersecciones[0].object;

            if (objetoSeleccionado !== primerObjeto) {
                restaurarObjetoPrevio();
                objetoSeleccionado = primerObjeto;
                
                // Efecto Hover: Crecer de tamaño notablemente
                objetoSeleccionado.scale.set(
                    objetoSeleccionado.userData.escalaOriginal.x * 1.6,
                    objetoSeleccionado.userData.escalaOriginal.y * 1.6,
                    1
                );

                // Activar línea de atracción hacia la singularidad
                const puntosLinea = [new THREE.Vector3(0, 0, 0), objetoSeleccionado.position];
                lineaGravedad.geometry.setFromPoints(puntosLinea);
                lineaGravedad.material.opacity = 0.7;
            } else {
                // Actualizar la línea dinámicamente si el objeto órbita mientras lo miras
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
            if (!objetoSeleccionado.userData.latido) {
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

// Ajuste responsive para cambios de tamaño de pantalla
window.addEventListener('resize', () => {
    camara.aspect = window.innerWidth / window.innerHeight;
    camara.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

iniciar();